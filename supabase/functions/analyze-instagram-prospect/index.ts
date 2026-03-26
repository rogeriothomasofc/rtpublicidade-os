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

// Método 1: API web oficial do Instagram
async function fetchViaWebApi(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "Referer": "https://www.instagram.com/",
          "X-Requested-With": "XMLHttpRequest",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const u = json?.data?.user;
    if (!u) return null;
    return {
      full_name: u.full_name || null,
      bio: u.biography || null,
      followers_count: u.edge_followed_by?.count ?? null,
      following_count: u.edge_follow?.count ?? null,
      posts_count: u.edge_owner_to_timeline_media?.count ?? null,
      website: u.external_url || null,
      niche: u.category_name || u.business_category_name || null,
      is_business: u.is_business_account || false,
      avatar_url: u.profile_pic_url || null,
    };
  } catch { return null; }
}

// Método 2: API mobile do Instagram (i.instagram.com)
async function fetchViaMobileApi(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "User-Agent": "Instagram 275.0.0.27.98 Android (29/10; 420dpi; 1080x2134; samsung; SM-G973F; beyond1; exynos9820; pt_BR; 458517901)",
          "Accept": "*/*",
          "Accept-Language": "pt-BR",
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const u = json?.data?.user;
    if (!u) return null;
    return {
      full_name: u.full_name || null,
      bio: u.biography || null,
      followers_count: u.edge_followed_by?.count ?? null,
      following_count: u.edge_follow?.count ?? null,
      posts_count: u.edge_owner_to_timeline_media?.count ?? null,
      website: u.external_url || null,
      niche: u.category_name || u.business_category_name || null,
      is_business: u.is_business_account || false,
      avatar_url: u.profile_pic_url || null,
    };
  } catch { return null; }
}

// Método 3: Parsear HTML da página pública
async function fetchViaHtml(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Tentar extrair JSON embutido na página
    const jsonMatch = html.match(/"biography":"([^"]*)"/) ||
                      html.match(/,"biography":"(.*?)","/);
    const followersMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
    const fullNameMatch = html.match(/"full_name":"([^"]*)"/);
    const websiteMatch = html.match(/"external_url":"([^"]*)"/);

    if (!jsonMatch && !followersMatch) return null;

    return {
      full_name: fullNameMatch ? fullNameMatch[1] : null,
      bio: jsonMatch ? jsonMatch[1].replace(/\\n/g, '\n').replace(/\\u[0-9a-f]{4}/gi, '') : null,
      followers_count: followersMatch ? parseInt(followersMatch[1]) : null,
      following_count: null,
      posts_count: null,
      website: websiteMatch ? websiteMatch[1] : null,
      niche: null,
      is_business: false,
      avatar_url: null,
    };
  } catch { return null; }
}

async function fetchInstagramProfile(username: string): Promise<{ profile: ProfileData | null; fetched: boolean }> {
  // Tenta os 3 métodos em sequência
  const profile = await fetchViaWebApi(username)
    ?? await fetchViaMobileApi(username)
    ?? await fetchViaHtml(username);

  return { profile, fetched: profile !== null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { username, manual_bio } = await req.json() as { username: string; manual_bio?: string };
    if (!username) {
      return new Response(JSON.stringify({ error: "username is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Buscar dados do perfil (somente se não foi passado manual_bio)
    let profile: ProfileData | null = null;
    let profileFetched = false;

    if (!manual_bio) {
      const result = await fetchInstagramProfile(username);
      profile = result.profile;
      profileFetched = result.fetched;
    } else {
      // Dados manuais — montar profile com a bio fornecida
      profile = {
        full_name: null,
        bio: manual_bio,
        followers_count: null,
        following_count: null,
        posts_count: null,
        website: null,
        niche: null,
        is_business: false,
        avatar_url: null,
      };
      profileFetched = true;
    }

    // Se não conseguiu buscar dados, retornar flag para o frontend pedir bio manual
    if (!profileFetched || !profile?.bio) {
      return new Response(
        JSON.stringify({ needs_manual_bio: true, profile }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileSummary = `
Perfil Instagram: @${username}
Nome: ${profile.full_name || "Não obtido"}
Bio: ${profile.bio}
Seguidores: ${profile.followers_count?.toLocaleString("pt-BR") ?? "Não obtido"}
Seguindo: ${profile.following_count?.toLocaleString("pt-BR") ?? "Não obtido"}
Posts: ${profile.posts_count ?? "Não obtido"}
Nicho/Categoria: ${profile.niche || "Identificar pela bio"}
Site: ${profile.website || "Não informado"}
Conta Comercial: ${profile.is_business ? "Sim" : "Não"}
    `.trim();

    const systemPrompt = `Você é um especialista em prospecção comercial de uma agência de marketing digital e tráfego pago brasileira chamada RT Publicidade.
Seu objetivo é analisar perfis do Instagram com base nos dados REAIS fornecidos e criar estratégias personalizadas de abordagem para marcar reuniões comerciais.
A análise deve ser baseada EXCLUSIVAMENTE nos dados reais do perfil fornecidos — bio, seguidores, nicho, site — sem inventar informações.
Responda SOMENTE com um JSON válido, sem markdown, sem explicações, apenas o JSON puro.`;

    const userMessage = `Com base nos dados REAIS deste perfil do Instagram, gere uma estratégia de prospecção completa:

${profileSummary}

Retorne exatamente este JSON:
{
  "analysis": "Análise real e específica baseada nos dados do perfil: o que o negócio faz, qual o público, pontos fracos de marketing identificados na bio/métricas, oportunidades concretas de crescimento. Seja específico e use os dados reais da bio. (3-4 parágrafos)",
  "dm_message": "DM personalizada referenciando elementos reais da bio/perfil. Objetivo: marcar reunião. Tom natural, não de vendedor. Máximo 5 linhas. Assinar como RT Publicidade.",
  "whatsapp_message": "Mensagem WhatsApp informal com emojis naturais, referenciando algo real do perfil. Objetivo: marcar reunião. Máximo 6 linhas. Assinar como RT Publicidade.",
  "proposal_brief": "Brief de proposta baseado no negócio real: serviços que fazem sentido pro nicho deles, plataformas ideais, investimento sugerido em mídia e fee de gestão em R$",
  "creative_concept": "Conceito de anúncio baseado no negócio real deles: produto/serviço principal, público-alvo, copy, formato e call to action",
  "extracted_whatsapp": "Número WhatsApp extraído da bio se houver, senão null",
  "extracted_email": "Email extraído da bio se houver, senão null"
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

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

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
      if (match) aiResult = JSON.parse(match[0]);
      else throw new Error("Failed to parse AI response");
    }

    return new Response(
      JSON.stringify({ profile, profile_fetched: profileFetched, needs_manual_bio: false, ...aiResult }),
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
