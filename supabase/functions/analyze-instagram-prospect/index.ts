import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProspectInput {
  username: string;
  full_name?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  niche?: string;
  website?: string;
  whatsapp?: string;
  email?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prospect: ProspectInput = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const profileSummary = `
Perfil Instagram: @${prospect.username}
Nome: ${prospect.full_name || "Não informado"}
Bio: ${prospect.bio || "Não informada"}
Seguidores: ${prospect.followers_count?.toLocaleString("pt-BR") || "Não informado"}
Seguindo: ${prospect.following_count?.toLocaleString("pt-BR") || "Não informado"}
Posts: ${prospect.posts_count || "Não informado"}
Nicho/Segmento: ${prospect.niche || "A identificar pela bio"}
Site: ${prospect.website || "Não informado"}
WhatsApp: ${prospect.whatsapp || "Não informado"}
Email: ${prospect.email || "Não informado"}
    `.trim();

    const systemPrompt = `Você é um especialista em prospecção comercial de uma agência de marketing digital e tráfego pago brasileira chamada RT Publicidade.
Seu objetivo é analisar perfis do Instagram e criar estratégias personalizadas de abordagem para marcar reuniões comerciais.
Responda SOMENTE com um JSON válido, sem markdown, sem explicações, apenas o JSON puro.`;

    const userMessage = `Analise este perfil do Instagram e gere uma estratégia de prospecção completa:

${profileSummary}

Retorne exatamente este JSON:
{
  "analysis": "Análise detalhada do perfil: quem é, qual o negócio, principais dores prováveis de marketing, oportunidades identificadas (3-4 parágrafos)",
  "dm_message": "Mensagem de DM personalizada, natural e direta, referenciando algo específico do perfil. Objetivo: marcar uma reunião. Tom amigável, não salesperson. Máximo 5 linhas. Assinar como RT Publicidade.",
  "whatsapp_message": "Versão da mensagem para WhatsApp, um pouco mais informal. Pode incluir emojis naturais. Objetivo: marcar reunião. Máximo 6 linhas.",
  "proposal_brief": "Brief inicial da proposta: serviços recomendados para este cliente (gestão de tráfego, criação de conteúdo, etc), plataformas ideais (Meta, Google, TikTok), investimento sugerido em mídia e fee estimado de gestão em R$",
  "creative_concept": "Conceito criativo para um anúncio de teste deste cliente: tema, formato, copy principal, call to action e argumento de venda principal do negócio deles"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? "{}";

    let result: {
      analysis: string;
      dm_message: string;
      whatsapp_message: string;
      proposal_brief: string;
      creative_concept: string;
    };

    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-instagram-prospect error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
