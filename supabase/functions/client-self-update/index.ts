import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_FIELDS = [
  "name", "company", "email", "phone", "person_type",
  "cnpj", "cpf", "rg", "razao_social", "inscricao_estadual",
  "address", "city", "state", "zip_code", "instagram_username",
];

function randomPassword(len = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // GET: validate token only (no data returned to avoid pre-filling)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: client, error } = await adminClient
        .from("clients")
        .select("id")
        .eq("form_token", token)
        .single();

      if (error || !client) {
        return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { token, action, ...fields } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: "Token obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Lookup client by token
      const { data: client, error: findError } = await adminClient
        .from("clients")
        .select("id, name, email, company")
        .eq("form_token", token)
        .single();

      if (findError || !client) {
        return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- ACTION: send-access ---
      // Creates or resets portal credentials and sends the access email
      if (action === "send-access") {
        const email = client.email;
        if (!email) {
          return new Response(JSON.stringify({ error: "Cliente sem email cadastrado" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const pwd = randomPassword();

        // Check if portal access already exists
        const { data: existingAccess } = await adminClient
          .from("client_portal_access")
          .select("user_id")
          .eq("client_id", client.id)
          .maybeSingle();

        if (existingAccess?.user_id) {
          // Sync email + reset password for existing user
          await adminClient.auth.admin.updateUserById(existingAccess.user_id, {
            email,
            email_confirm: true,
            password: pwd,
          });
        } else {
          // Create new auth user
          let userId: string;
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password: pwd,
            email_confirm: true,
            user_metadata: { full_name: client.name, is_client: true },
          });

          if (createError) {
            // User already exists in auth but has no portal access — find them
            const { data: list } = await adminClient.auth.admin.listUsers();
            const found = list?.users?.find((u: any) => u.email === email);
            if (!found) throw createError;
            userId = found.id;
            await adminClient.auth.admin.updateUserById(userId, { password: pwd });
          } else {
            userId = newUser.user.id;
          }

          // Ensure role
          await adminClient.from("user_roles")
            .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id" });

          // Ensure portal access
          await adminClient.from("client_portal_access")
            .upsert({ client_id: client.id, user_id: userId }, { onConflict: "client_id" });
        }

        // Get agency settings and SMTP
        const [{ data: agency }, { data: smtp }] = await Promise.all([
          adminClient.from("agency_settings").select("name").limit(1).maybeSingle(),
          adminClient.from("smtp_settings").select("*").eq("is_active", true).limit(1).maybeSingle(),
        ]);

        const agencyName = agency?.name || "Nossa Agência";
        const portalUrl = `${new URL(req.url).origin.replace(/\/functions\/v1.*/, "")
          .replace("https://nbzxofrllagqwwrwfskv.supabase.co", req.headers.get("origin") || "")}`;
        const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
        const portalLink = `${origin}/portal`;

        let emailSent = false;
        if (smtp) {
          try {
            const htmlBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Bem-vindo ao Portal do Cliente! 🎉</h2>
                <p>Olá <strong>${client.name}</strong>,</p>
                <p>Seu cadastro foi concluído. Abaixo estão seus dados de acesso ao portal da <strong>${agencyName}</strong>:</p>
                <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 0 0 8px;"><strong>Senha temporária:</strong> ${pwd}</p>
                  <p style="margin: 0;"><strong>Link de acesso:</strong> <a href="${portalLink}">${portalLink}</a></p>
                </div>
                <p style="color: #666; font-size: 14px;">Recomendamos que você altere sua senha no primeiro acesso.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">— Equipe ${agencyName}</p>
              </div>
            `;

            const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-client-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to_email: email,
                to_name: client.name,
                subject: `Seus dados de acesso ao portal — ${agencyName}`,
                html_body: htmlBody,
              }),
            });
            const emailResult = await emailRes.json();
            emailSent = !emailResult.error;
          } catch (e) {
            console.error("Email send failed:", e);
          }
        }

        return new Response(JSON.stringify({ success: true, email_sent: emailSent, email }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- ACTION: update (default) ---
      const updateData: Record<string, unknown> = {};
      for (const key of ALLOWED_FIELDS) {
        if (key in fields) updateData[key] = fields[key];
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum campo válido enviado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await adminClient
        .from("clients")
        .update(updateData)
        .eq("id", client.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
