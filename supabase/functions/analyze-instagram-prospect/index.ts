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

interface GoogleData {
  rating: number | null;
  reviews_count: number | null;
  address: string | null;
  name: string | null;
}

// ─── Instagram fetch (4 métodos) ────────────────────────────────────────────

async function fetchViaBusinessDiscovery(
  username: string,
  accessToken: string,
  igUserId: string
): Promise<ProfileData | null> {
  if (!accessToken || !igUserId) return null;
  try {
    const fields = "biography,followers_count,follows_count,media_count,name,website,profile_picture_url,username,category";
    const url = `https://graph.facebook.com/v20.0/${igUserId}?fields=business_discovery.fields(${fields})&username=${encodeURIComponent(username)}&access_token=${accessToken}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    const bd = json?.business_discovery;
    if (!bd) return null;
    return {
      full_name: bd.name || null,
      bio: bd.biography || null,
      followers_count: bd.followers_count ?? null,
      following_count: bd.follows_count ?? null,
      posts_count: bd.media_count ?? null,
      website: bd.website || null,
      niche: bd.category || null,
      is_business: true,
      avatar_url: bd.profile_picture_url || null,
    };
  } catch { return null; }
}

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
        },
        signal: AbortSignal.timeout(8000),
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

async function fetchViaMobileApi(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "User-Agent": "Instagram 275.0.0.27.98 Android (29/10; 420dpi; 1080x2134; samsung; SM-G973F; beyond1; exynos9820; pt_BR; 458517901)",
          "Accept-Language": "pt-BR",
        },
        signal: AbortSignal.timeout(8000),
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

async function fetchViaHtml(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const bioMatch = html.match(/"biography":"([^"]*)"/);
    const followersMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
    const fullNameMatch = html.match(/"full_name":"([^"]*)"/);
    const websiteMatch = html.match(/"external_url":"([^"]*)"/);
    if (!bioMatch && !followersMatch) return null;
    return {
      full_name: fullNameMatch ? fullNameMatch[1] : null,
      bio: bioMatch ? bioMatch[1].replace(/\\n/g, '\n') : null,
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

async function fetchInstagramProfile(
  username: string,
  accessToken: string,
  igUserId: string
): Promise<{ profile: ProfileData | null; fetched: boolean }> {
  const profile = await fetchViaBusinessDiscovery(username, accessToken, igUserId)
    ?? await fetchViaWebApi(username)
    ?? await fetchViaMobileApi(username)
    ?? await fetchViaHtml(username);
  return { profile, fetched: profile !== null };
}

// ─── Análise de site (só fetch HTML, sem chamada Anthropic) ──────────────────

async function fetchWebsiteSnippet(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(normalized, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 40000);

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDesc2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const hasLoremIpsum = /lorem\s+ipsum/i.test(html);
    const hasPhone = /\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}/.test(html);
    const hasWhatsApp = /whatsapp|wa\.me/i.test(html);
    const hasForm = /<form/i.test(html);
    const hasSchema = /application\/ld\+json/i.test(html);
    const hasViewport = /name=["']viewport["']/i.test(html);

    return `URL: ${url}
Title tag: ${titleMatch ? titleMatch[1] : 'AUSENTE'}
Meta description: ${metaDesc ? metaDesc[1] : metaDesc2 ? metaDesc2[1] : 'AUSENTE'}
Lorem ipsum detectado: ${hasLoremIpsum ? 'SIM ⚠️' : 'não'}
Telefone/contato no HTML: ${hasPhone ? 'sim' : 'não detectado'}
WhatsApp no site: ${hasWhatsApp ? 'sim' : 'não'}
Formulário de contato: ${hasForm ? 'sim' : 'não'}
Schema.org (SEO estruturado): ${hasSchema ? 'sim' : 'não'}
Viewport (mobile): ${hasViewport ? 'ok' : 'AUSENTE ⚠️'}

--- TRECHO DO HTML (primeiros 8KB) ---
${html.slice(0, 8000)}`;
  } catch { return null; }
}

// ─── Google Places ────────────────────────────────────────────────────────────

async function fetchGoogleBusiness(query: string, apiKey: string): Promise<GoogleData | null> {
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    const place = json?.results?.[0];
    if (!place) return null;
    return {
      rating: place.rating ?? null,
      reviews_count: place.user_ratings_total ?? null,
      address: place.formatted_address ?? null,
      name: place.name ?? null,
    };
  } catch { return null; }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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

    const { username, manual_bio, website_url } = await req.json() as {
      username: string;
      manual_bio?: string;
      website_url?: string;
    };
    if (!username) {
      return new Response(JSON.stringify({ error: "username is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";
    const INSTAGRAM_ACCESS_TOKEN = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") ?? "";
    const INSTAGRAM_USER_ID = Deno.env.get("INSTAGRAM_USER_ID") ?? "";

    // 1. Buscar perfil Instagram
    let profile: ProfileData | null = null;
    let profileFetched = false;

    if (!manual_bio) {
      const result = await fetchInstagramProfile(username, INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID);
      profile = result.profile;
      profileFetched = result.fetched;
    } else {
      profile = {
        full_name: null, bio: manual_bio, followers_count: null,
        following_count: null, posts_count: null,
        website: website_url ?? null, niche: null,
        is_business: false, avatar_url: null,
      };
      profileFetched = true;
    }

    // Se não tem bio, pedir manualmente
    if (!profileFetched || !profile?.bio) {
      return new Response(
        JSON.stringify({ needs_manual_bio: true, profile_fetched: false, profile }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar website da bio ou o informado manualmente
    const websiteToAudit = website_url || profile.website;

    // 2. Buscar HTML do site + Google em paralelo (sem chamada Anthropic aqui)
    const [websiteSnippet, googleData] = await Promise.all([
      websiteToAudit ? fetchWebsiteSnippet(websiteToAudit) : Promise.resolve(null),
      profile.full_name
        ? fetchGoogleBusiness(`${profile.full_name}`, GOOGLE_API_KEY)
        : Promise.resolve(null),
    ]);

    // 3. Montar contexto completo para a IA analisar tudo de uma vez
    const instagramSection = `
📱 INSTAGRAM: @${username}
• Nome: ${profile.full_name || "não identificado"}
• Bio: ${profile.bio}
• Seguidores: ${profile.followers_count?.toLocaleString("pt-BR") ?? "não obtido"}
• Posts: ${profile.posts_count ?? "não obtido"}
• Nicho: ${profile.niche || "a identificar"}
• Site no bio: ${profile.website || "não informado"}
• Conta comercial: ${profile.is_business ? "sim" : "não"}
    `.trim();

    const websiteSection = websiteSnippet
      ? `\n\n🌐 SITE: ${websiteToAudit}\n${websiteSnippet}`
      : "\n\n🌐 SITE: não disponível para análise";

    const googleSection = googleData
      ? `\n\n⭐ GOOGLE MINHA EMPRESA:\n• Avaliação: ${googleData.rating}/5 (${googleData.reviews_count?.toLocaleString("pt-BR")} avaliações)\n• Endereço: ${googleData.address}`
      : "\n\n⭐ GOOGLE: não analisado";

    const fullContext = `${instagramSection}${websiteSection}${googleSection}`;

    // 4. UMA única chamada à Anthropic para diagnóstico + auditoria do site
    const systemPrompt = `Você é um especialista em marketing digital e prospecção comercial da agência RT Publicidade.
Com base nos dados REAIS coletados automaticamente do perfil, site e Google do prospect, gere um diagnóstico completo e mensagens de abordagem altamente personalizadas.
Seja específico, cite dados reais. Nunca invente informações.
Responda SOMENTE com JSON válido, sem markdown.`;

    const userMessage = `Dados coletados automaticamente do prospect:

${fullContext}

Retorne exatamente este JSON:
{
  "website_critical": ["problema crítico 1 se site disponível, senão array vazio"],
  "website_warnings": ["alerta 1 se site disponível, senão array vazio"],
  "website_positives": ["ponto positivo 1 se site disponível, senão array vazio"],
  "website_score": 50,
  "diagnosis_report": "🔥 DIAGNÓSTICO COMPLETO — [Nome do negócio]\n\n📍 [Localização se disponível]\n⭐ Google: [rating] ([N] avaliações) SE DISPONÍVEL\n📱 Instagram: @[username] ([N] seguidores, [N] posts)\n🌐 Site: [url] SE DISPONÍVEL\n\n─────────────────────────\n🔴 PROBLEMAS CRÍTICOS:\n[liste cada problema crítico com bullet 🔴]\n\n⚠️ ALERTAS:\n[liste alertas com bullet ⚠️]\n\n✅ PONTOS POSITIVOS:\n[liste pontos positivos com bullet ✅]\n\n─────────────────────────\n💡 OPORTUNIDADE PARA A RT PUBLICIDADE:\n[2-3 frases sobre o que a agência pode resolver/melhorar especificamente para este cliente]",
  "dm_message": "DM personalizada citando 1-2 problemas específicos encontrados. Tom amigável. Máximo 5 linhas. Assinar como RT Publicidade.",
  "whatsapp_message": "WhatsApp informal com emojis, citando problemas reais encontrados. Máximo 6 linhas. Assinar como RT Publicidade.",
  "proposal_brief": "Proposta baseada nos problemas reais encontrados: serviços, plataformas, investimento em mídia e fee de gestão em R$",
  "creative_concept": "Conceito de anúncio baseado no negócio real: produto/serviço principal, público-alvo, copy, formato e CTA",
  "extracted_whatsapp": "número WhatsApp da bio se encontrado, senão null",
  "extracted_email": "email da bio se encontrado, senão null"
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text().catch(() => "");
      console.error("Anthropic error:", aiRes.status, errBody);
      if (aiRes.status === 529 || aiRes.status === 503) {
        return new Response(JSON.stringify({ error: "IA sobrecarregada. Tente novamente em alguns segundos." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições. Aguarde alguns segundos e tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${aiRes.status} — ${errBody.slice(0, 300)}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.content?.[0]?.text ?? "{}";

    let aiResult: {
      website_critical: string[];
      website_warnings: string[];
      website_positives: string[];
      website_score: number;
      diagnosis_report: string;
      dm_message: string;
      whatsapp_message: string;
      proposal_brief: string;
      creative_concept: string;
      extracted_whatsapp: string | null;
      extracted_email: string | null;
    };

    try { aiResult = JSON.parse(raw); }
    catch {
      const match = raw.match(/\{[\s\S]*\}/);
      try { aiResult = match ? JSON.parse(match[0]) : null; }
      catch { aiResult = null as any; }
      if (!aiResult) throw new Error("Failed to parse AI response");
    }

    const websiteAudit = websiteSnippet ? {
      critical: aiResult.website_critical ?? [],
      warnings: aiResult.website_warnings ?? [],
      positives: aiResult.website_positives ?? [],
      score: aiResult.website_score ?? 50,
    } : null;

    return new Response(
      JSON.stringify({
        profile,
        profile_fetched: profileFetched,
        needs_manual_bio: false,
        website_audit: websiteAudit,
        google_data: googleData,
        diagnosis_report: aiResult.diagnosis_report,
        dm_message: aiResult.dm_message,
        whatsapp_message: aiResult.whatsapp_message,
        proposal_brief: aiResult.proposal_brief,
        creative_concept: aiResult.creative_concept,
        extracted_whatsapp: aiResult.extracted_whatsapp,
        extracted_email: aiResult.extracted_email,
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
