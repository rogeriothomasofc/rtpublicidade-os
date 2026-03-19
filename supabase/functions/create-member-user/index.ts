import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with caller's JWT to check admin role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      throw new Error("Não autorizado");
    }

    // Check admin role
    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Apenas administradores podem cadastrar membros com acesso ao sistema");
    }

    const { email, password, name, role, access_level, team_member_id, app_url } = await req.json();

    if (!email || !password || !name) {
      throw new Error("Email, nome e senha temporária são obrigatórios");
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter no mínimo 6 caracteres");
    }

    // Admin client to create user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create the auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      if (createError.message?.includes("already been registered")) {
        throw new Error("Este email já está cadastrado no sistema");
      }
      throw new Error("Erro ao criar usuário: " + createError.message);
    }

    console.log("User created:", newUser.user.id);

    // Map access level label to app_role enum: Gestor → admin, others → member
    const appRole = access_level === "Gestor" ? "admin" : "member";

    // Assign role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: appRole });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Update profile: store job title in role, access level label for reference
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ name, role: access_level || role || null })
      .eq("user_id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // If team_member_id provided, update team_members email to link them
    if (team_member_id) {
      const { error: teamError } = await adminClient
        .from("team_members")
        .update({ email })
        .eq("id", team_member_id);

      if (teamError) {
        console.error("Error updating team member:", teamError);
      }
    }

    // Send welcome email via SMTP (non-fatal)
    let email_sent = false;
    try {
      const [{ data: smtp }, { data: agency }] = await Promise.all([
        adminClient.from("smtp_settings").select("*").eq("is_active", true).limit(1).maybeSingle(),
        adminClient.from("agency_settings").select("name").limit(1).maybeSingle(),
      ]);

      if (smtp) {
        const agencyName = agency?.name || "Agency OS";
        const loginUrl = app_url || "https://agencia.rtpublicidade.com";
        const transport = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.encryption === "ssl",
          auth: { user: smtp.username, pass: smtp.password },
          ...(smtp.encryption === "tls" ? { requireTLS: true } : {}),
        });
        await transport.sendMail({
          from: smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : smtp.from_email,
          to: `${name} <${email}>`,
          subject: `Bem-vindo ao ${agencyName} — seus dados de acesso`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
              <h2 style="color: #111; margin-bottom: 8px;">Bem-vindo, ${name}!</h2>
              <p style="color: #555; margin-bottom: 24px;">
                Seu acesso ao <strong>${agencyName}</strong> foi criado. Use as credenciais abaixo para entrar.
              </p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; color: #333;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0 0 8px; color: #333;"><strong>Senha temporária:</strong> ${password}</p>
                <p style="margin: 0; color: #333;"><strong>Nível:</strong> ${access_level}</p>
              </div>
              <a href="${loginUrl}"
                style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
                Acessar o sistema
              </a>
              <p style="color: #999; font-size: 12px; margin-top: 32px;">
                Recomendamos alterar sua senha após o primeiro acesso em Configurações &gt; Meu Perfil.<br/>
                ${agencyName}
              </p>
            </div>
          `,
        });
        email_sent = true;
      }
    } catch (emailErr: any) {
      console.error("Welcome email error (non-fatal):", emailErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id, email_sent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("create-member-user error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
