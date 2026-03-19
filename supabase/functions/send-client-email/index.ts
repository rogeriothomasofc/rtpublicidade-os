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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { to_email, to_name, subject, html_body, smtp_config } = await req.json();

    if (!to_email || !subject || !html_body) {
      throw new Error("to_email, subject, and html_body are required");
    }

    let smtp: any;

    if (smtp_config) {
      // Inline config passed directly (used by test button — no need to save first)
      smtp = smtp_config;
    } else {
      // Read saved config from DB
      const { data, error: smtpError } = await adminClient
        .from("smtp_settings")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (smtpError || !data) {
        throw new Error("SMTP não configurado. Configure em Configurações > Integrações.");
      }
      smtp = data;
    }

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.encryption === "ssl",
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
      ...(smtp.encryption === "tls" ? { requireTLS: true } : {}),
    });

    await transport.sendMail({
      from: smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : smtp.from_email,
      to: to_name ? `${to_name} <${to_email}>` : to_email,
      subject,
      html: html_body,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
