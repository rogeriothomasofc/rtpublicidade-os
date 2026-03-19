import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) throw new Error("Não autorizado");

    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Apenas administradores podem redefinir senhas");

    const { email, app_url } = await req.json();
    if (!email) throw new Error("Email é obrigatório");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Generate password recovery link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${app_url || "https://agencia.rtpublicidade.com"}/settings` },
    });
    if (linkError || !linkData) throw new Error("Erro ao gerar link de redefinição: " + linkError?.message);

    const recoveryLink = linkData.properties?.action_link;
    if (!recoveryLink) throw new Error("Link de redefinição não gerado");

    // Fetch SMTP settings and agency name
    const [{ data: smtp }, { data: agency }] = await Promise.all([
      adminClient.from("smtp_settings").select("*").eq("is_active", true).limit(1).maybeSingle(),
      adminClient.from("agency_settings").select("name").limit(1).maybeSingle(),
    ]);

    if (!smtp) {
      return new Response(
        JSON.stringify({ success: true, email_sent: false, reason: "SMTP não configurado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agencyName = agency?.name || "Agency OS";

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.encryption === "ssl",
      auth: { user: smtp.username, pass: smtp.password },
      ...(smtp.encryption === "tls" ? { requireTLS: true } : {}),
    });

    await transport.sendMail({
      from: smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : smtp.from_email,
      to: email,
      subject: `Redefinição de senha — ${agencyName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <h2 style="color: #111; margin-bottom: 8px;">Redefinição de senha</h2>
          <p style="color: #555; margin-bottom: 24px;">
            Você recebeu uma solicitação de redefinição de senha para o <strong>${agencyName}</strong>.
          </p>
          <p style="color: #555; margin-bottom: 24px;">
            Clique no botão abaixo para criar uma nova senha. O link expira em <strong>24 horas</strong>.
          </p>
          <a href="${recoveryLink}"
            style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
            Redefinir senha
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Se você não solicitou a redefinição de senha, ignore este email.<br/>
            ${agencyName}
          </p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, email_sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("reset-member-password error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
