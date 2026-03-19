import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campaign, structures, audiences, creatives } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const systemPrompt = `Você é um estrategista de mídia paga especializado em Meta Ads, Google Ads e tráfego pago.
O usuário vai te enviar dados de um planejamento de campanha com suas estruturas, públicos e criativos.
Gere um resumo estratégico detalhado e prático para servir de guia na hora de subir a campanha na plataforma.

Organize em 4 seções com emojis:

🎯 Objetivo da Campanha
- Descreva claramente o objetivo principal da campanha, a plataforma e o orçamento definido.

🏗️ Estruturas de Campanha
- Liste CADA estrutura cadastrada pelo nome, tipo e objetivo.
- Explique o papel de cada uma dentro da estratégia e como se complementam.
- Mencione o budget alocado para cada estrutura quando disponível.

👥 Públicos-Alvo
- Liste CADA público cadastrado pelo nome, tipo (lookalike, interesse, remarketing, etc.) e descrição.
- Detalhe a segmentação: tamanho estimado, tags e características.
- Explique a estratégia de segmentação e como os públicos se relacionam entre si.

🎨 Criativos
- Liste CADA criativo cadastrado pelo nome, formato e status.
- Descreva o headline, copy e CTA de cada um.
- Explique a abordagem criativa geral e como os criativos se complementam.

Seja ESPECÍFICO com os dados fornecidos — use os nomes, valores e detalhes exatos que o usuário cadastrou.
Se alguma seção não tiver dados cadastrados, mencione que precisa ser preenchida antes de subir a campanha.
Responda em português brasileiro. Máximo 600 palavras.`;

    const userContent = JSON.stringify({ campaign, structures, audiences, creatives }, null, 2);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      throw new Error("Anthropic API error");
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("planning-ai-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
