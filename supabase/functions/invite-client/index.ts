import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is not a client
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    // Check caller is not a client role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    
    if (callerRoles?.some((r: any) => r.role === "client")) {
      throw new Error("Clients cannot invite other clients");
    }

    const { client_id, email, password } = await req.json();
    if (!client_id || !email || !password) {
      throw new Error("client_id, email, and password are required");
    }

    // Create user account for the client
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: email, is_client: true },
    });

    if (createError) throw createError;

    // Assign 'client' role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "client" });
    
    if (roleError) throw roleError;

    // Create portal access record
    const { error: accessError } = await adminClient
      .from("client_portal_access")
      .insert({
        client_id,
        user_id: newUser.user.id,
        invited_by: caller.id,
      });

    if (accessError) throw accessError;

    // Get client name for email
    const { data: clientData } = await adminClient
      .from("clients")
      .select("name, company")
      .eq("id", client_id)
      .single();

    // Get agency settings for branding
    const { data: agency } = await adminClient
      .from("agency_settings")
      .select("name")
      .limit(1)
      .maybeSingle();

    // Try to send email via SMTP
    const { data: smtp } = await adminClient
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    let emailSent = false;
    if (smtp) {
      try {
        const portalUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
        const agencyName = agency?.name || "Nossa Agência";
        const clientDisplayName = clientData?.name || email;

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Bem-vindo ao Portal do Cliente! 🎉</h2>
            <p>Olá <strong>${clientDisplayName}</strong>,</p>
            <p>Sua conta de acesso ao portal da <strong>${agencyName}</strong> foi criada com sucesso.</p>
            <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0 0 8px;"><strong>Senha temporária:</strong> ${password}</p>
              <p style="margin: 0;"><strong>Link de acesso:</strong> <a href="${portalUrl}/portal">${portalUrl}/portal</a></p>
            </div>
            <p style="color: #666; font-size: 14px;">Recomendamos que você altere sua senha no primeiro acesso.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">— Equipe ${agencyName}</p>
          </div>
        `;

        // Use the SMTP function to send
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const response = await fetch(`${supabaseUrl}/functions/v1/send-client-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to_email: email,
            to_name: clientDisplayName,
            subject: `Acesso ao Portal - ${agencyName}`,
            html_body: htmlBody,
          }),
        });
        const emailResult = await response.json();
        emailSent = !emailResult.error;
      } catch (e) {
        console.error("Failed to send email:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id, email_sent: emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
