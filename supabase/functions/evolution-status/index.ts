import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  try { body = await req.json(); } catch { /* body vazio é ok */ }

  const EVOLUTION_URL = (body.url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
  const EVOLUTION_KEY = body.apiKey || Deno.env.get("EVOLUTION_API_KEY") || "";
  const EVOLUTION_INSTANCE = body.instance || Deno.env.get("EVOLUTION_INSTANCE") || "";

  if (!EVOLUTION_URL || !EVOLUTION_KEY || !EVOLUTION_INSTANCE) {
    return new Response(
      JSON.stringify({ error: "Configure a URL, API Key e Instância da Evolution API." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const headers = { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" };

  try {
    // 1. Verifica se a instância existe e qual o estado
    const stateRes = await fetch(`${EVOLUTION_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`, { headers });

    if (stateRes.status === 404 || stateRes.status === 400) {
      // Instância não existe — cria automaticamente
      console.log(`Instância ${EVOLUTION_INSTANCE} não encontrada. Criando...`);

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
        throw new Error(`Erro ao criar instância: ${JSON.stringify(createData)}`);
      }

      // A criação já retorna o QR code
      const qrcode = extractQr(createData) ?? extractQr(createData?.qrcode ?? {});

      return new Response(
        JSON.stringify({ state: "close", instance: EVOLUTION_INSTANCE, qrcode, created: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!stateRes.ok) {
      throw new Error(`Evolution API retornou ${stateRes.status}`);
    }

    const stateData = await stateRes.json();
    const state: string = stateData?.instance?.state ?? stateData?.state ?? "close";

    // 2. Já conectado
    if (state === "open") {
      return new Response(
        JSON.stringify({ state: "open", instance: EVOLUTION_INSTANCE }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Existe mas não conectado — busca QR code
    const qrRes = await fetch(`${EVOLUTION_URL}/instance/connect/${EVOLUTION_INSTANCE}`, { headers });
    const qrData = await qrRes.json();
    const qrcode = extractQr(qrData);

    return new Response(
      JSON.stringify({ state, instance: EVOLUTION_INSTANCE, qrcode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("evolution-status error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
