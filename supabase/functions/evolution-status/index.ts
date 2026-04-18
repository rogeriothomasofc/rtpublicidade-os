import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractQr(data: Record<string, unknown>): string | null {
  return (
    (data?.base64 as string) ??
    ((data?.qrcode as Record<string, unknown>)?.base64 as string) ??
    (data?.qr as string) ??
    null
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { /* ok */ }

  const EVOLUTION_URL = (body.url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
  const EVOLUTION_KEY = body.apiKey || Deno.env.get("EVOLUTION_API_KEY") || "";
  const EVOLUTION_INSTANCE = body.instance || Deno.env.get("EVOLUTION_INSTANCE") || "";

  if (!EVOLUTION_URL || !EVOLUTION_KEY || !EVOLUTION_INSTANCE) {
    return ok({ error: "Secrets não configurados: EVOLUTION_API_URL, EVOLUTION_API_KEY ou EVOLUTION_INSTANCE ausentes." });
  }

  const headers = { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" };

  try {
    // 1. Verifica estado
    const stateRes = await fetch(`${EVOLUTION_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`, { headers });

    if (stateRes.status === 404 || stateRes.status === 400) {
      // Instância não existe — cria automaticamente
      const createRes = await fetch(`${EVOLUTION_URL}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: EVOLUTION_INSTANCE,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        return ok({ error: `Erro ao criar instância (${createRes.status}): ${JSON.stringify(createData)}` });
      }

      const qrcode = extractQr(createData) ?? extractQr((createData?.qrcode as Record<string, unknown>) ?? {});
      return ok({ state: "close", instance: EVOLUTION_INSTANCE, qrcode, created: true });
    }

    if (!stateRes.ok) {
      const errBody = await stateRes.text();
      return ok({ error: `Evolution API retornou ${stateRes.status}: ${errBody}` });
    }

    const stateData = await stateRes.json();
    const state: string = stateData?.instance?.state ?? stateData?.state ?? "close";

    // 2. Já conectado
    if (state === "open") {
      return ok({ state: "open", instance: EVOLUTION_INSTANCE });
    }

    // 3. Existe mas desconectado — busca QR
    const qrRes = await fetch(`${EVOLUTION_URL}/instance/connect/${EVOLUTION_INSTANCE}`, { headers });
    const qrData = await qrRes.json();
    const qrcode = extractQr(qrData);

    return ok({ state, instance: EVOLUTION_INSTANCE, qrcode });

  } catch (error) {
    console.error("evolution-status error:", error);
    return ok({ error: `Exceção: ${error instanceof Error ? error.message : String(error)}` });
  }
});
