import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL")!;
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE")!;

  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/logout/${EVOLUTION_INSTANCE}`, {
      method: "DELETE",
      headers: { "apikey": EVOLUTION_KEY },
      signal: AbortSignal.timeout(10000),
    });

    const body = await res.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body, instance: EVOLUTION_INSTANCE }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
