import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileData {
  full_name: string | null;
  bio: string | null;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  website: string | null;
  niche: string | null;
  is_business: boolean;
  avatar_url: string | null;
}

async function fetchInstagramProfile(username: string): Promise<ProfileData | null> {
  try {
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const res = await fetch(url, {
      headers: {
        "x-ig-app-id": "936619743392459",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Referer": "https://www.instagram.com/",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      console.warn("Instagram API status:", res.status);
      return null;
    }

    const json = await res.json();
    const user = json?.data?.user;
    if (!user) return null;

    return {
      full_name: user.full_name || null,
      bio: user.biography || null,
      followers_count: user.edge_followed_by?.count ?? null,
      following_count: user.edge_follow?.count ?? null,
      posts_count: user.edge_owner_to_timeline_media?.count ?? null,
      website: user.external_url || null,
      niche: user.category_name || user.business_category_name || null,
      is_business: user.is_business_account || false,
      avatar_url: user.profile_pic_url || null,
    };
  } catch (err) {
    console.warn("fetchInstagramProfile error:", err);
    return null;
  }
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

    const { username } = await req.json() as { username: string };
    if (!username) {
      return new Response(JSON.stringify({ error: "username is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // 1. Buscar dados reais do perfil
    const profile = await fetchInstagramProfile(username);

    const profileSummary = `
Perfil Instagram: @${username}
Nome: ${profile?.full_name || "Não obtido"}
Bio: ${profile?.bio || "Não obtida"}
Seguidores: ${profile?.followers_count?.toLocaleString("pt-BR") ?? "Não obtido"}
Seguindo: ${profile?.following_count?.toLocaleString("pt-BR") ?? "Não obtido"}
Posts: ${profile?.posts_count ?? "Não obtido"}
Nicho/Categoria: ${profile?.niche || "A identificar pela bio e username"}
Site: ${profile?.website || "Não informado"}
Conta Comercial: ${profile?.is_business ? "Sim" : "Não"}
    `.trim();

    const systemPrompt = `Você é um especialista em prospecção comercial de uma agência de marketing digital e tráfego pago brasileira chamada RT Publicidade.
Seu objetivo é analisar perfis do Instagram e criar estratégias personalizadas de abordagem para marcar reuniões comerciais.
Responda SOMENTE com um JSON válido, sem markdown, sem explicações, apenas o JSON puro.`;

    const userMessage = `Analise este perfil do Instagram e gere uma estratégia de prospecção completa:

${profileSummary}

Retorne exatamente este JSON:
{
  "analysis": "Análise detalhada do perfil: quem é, qual o negócio, principais dores prováveis de marketing, oportunidades identificadas. Se dados foram limitados, inferir pelo username e contexto. (3-4 parágrafos)",
  "dm_message": "Mensagem de DM personalizada, natural e direta, referenciando algo específico do perfil (username, nicho ou bio). Objetivo: marcar uma reunião. Tom amigável, não salesperson. Máximo 5 linhas. Assinar como RT Publicidade.",
  "whatsapp_message": "Versão da mensagem para WhatsApp, um pouco mais informal. Pode incluir emojis naturais. Objetivo: marcar reunião. Máximo 6 linhas. Assinar como RT Publicidade.",
  "proposal_brief": "Brief inicial da proposta: serviços recomendados (gestão de tráfego, criação de conteúdo, etc), plataformas ideais (Meta, Google, TikTok), investimento sugerido em mídia e fee estimado de gestão em R$",
  "creative_concept": "Conceito criativo para um anúncio de teste: tema, formato, copy principal, call to action e argumento de venda principal do negócio deles",
  "extracted_whatsapp": "Número de WhatsApp extraído da bio se encontrado, senão null",
  "extracted_email": "Email extraído da bio se encontrado, senão null"
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

    let aiResult: {
      analysis: string;
      dm_message: string;
      whatsapp_message: string;
      proposal_brief: string;
      creative_concept: string;
      extracted_whatsapp: string | null;
      extracted_email: string | null;
    };

    try {
      aiResult = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        aiResult = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    return new Response(
      JSON.stringify({
        profile,
        ...aiResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-instagram-prospect error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
