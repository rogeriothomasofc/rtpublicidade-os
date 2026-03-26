import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendText(url: string, apiKey: string, instance: string, number: string, text: string): Promise<void> {
  const res = await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "apikey": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number, text, delay: 1200 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${err}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { phone, messages } = await req.json() as {
      phone: string;
      messages: Array<{ message: string; delay?: number }>;
    };

    if (!phone || !messages?.length) return new Response(JSON.stringify({ error: "phone and messages required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE")!;

    // Normalizar número
    const digits = phone.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;

    // Enviar mensagens em sequência com delay entre elas
    for (let i = 0; i < messages.length; i++) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, messages[i].delay ?? 3000));
      }
      await sendText(EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE, number, messages[i].message);
    }

    return new Response(JSON.stringify({ success: true, sent: messages.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("send-whatsapp error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
