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

interface WebsiteAudit {
  critical: string[];
  warnings: string[];
  positives: string[];
  score: number;
}

interface GoogleData {
  rating: number | null;
  reviews_count: number | null;
  address: string | null;
  name: string | null;
}

// ─── Instagram fetch (4 métodos) ────────────────────────────────────────────

// Método 1: Instagram Business Discovery API (oficial, usa token da agência)
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

// ─── Análise de site ─────────────────────────────────────────────────────────

async function fetchWebsiteHtml(url: string): Promise<string | null> {
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
    const html = await res.text();
    // Limitar a 40KB para não estourar o contexto
    return html.slice(0, 40000);
  } catch { return null; }
}

async function analyzeWebsite(url: string, apiKey: string): Promise<WebsiteAudit | null> {
  const html = await fetchWebsiteHtml(url);
  if (!html) return null;

  // Extrair só as partes relevantes do HTML para análise
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const metaDesc2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const hasLoremIpsum = /lorem\s+ipsum/i.test(html);
  const hasPhone = /\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}/.test(html);
  const hasWhatsApp = /whatsapp|wa\.me/i.test(html);
  const hasForm = /<form/i.test(html);
  const hasSchema = /application\/ld\+json/i.test(html);
  const hasViewport = /name=["']viewport["']/i.test(html);

  // Snippet limpo para a IA analisar
  const snippet = `
URL: ${url}
Title tag: ${titleMatch ? titleMatch[1] : 'AUSENTE'}
Meta description: ${metaDesc ? metaDesc[1] : metaDesc2 ? metaDesc2[1] : 'AUSENTE'}
Lorem ipsum detectado: ${hasLoremIpsum ? 'SIM ⚠️' : 'não'}
Telefone/contato no HTML: ${hasPhone ? 'sim' : 'não detectado'}
WhatsApp no site: ${hasWhatsApp ? 'sim' : 'não'}
Formulário de contato: ${hasForm ? 'sim' : 'não'}
Schema.org (SEO estruturado): ${hasSchema ? 'sim' : 'não'}
Viewport (mobile): ${hasViewport ? 'ok' : 'AUSENTE ⚠️'}

--- TRECHO DO HTML (primeiros 8KB) ---
${html.slice(0, 8000)}
  `.trim();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: "Você é um especialista em auditoria de sites e marketing digital. Analise o site fornecido e identifique problemas críticos, alertas e pontos positivos. Responda SOMENTE com JSON válido." }] },
          contents: [{
            role: "user",
            parts: [{ text: `Analise este site e retorne um JSON com problemas encontrados:\n\n${snippet}\n\nRetorne SOMENTE este JSON:\n{\n  "critical": ["problema crítico 1", "problema crítico 2"],\n  "warnings": ["alerta 1", "alerta 2"],\n  "positives": ["ponto positivo 1"],\n  "score": 45\n}\n\nOnde score é de 0-100 (presença digital geral). critical = problemas graves que prejudicam vendas. warnings = melhorias importantes. positives = o que está bem.` }],
          }],
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try {
      return JSON.parse(raw) as WebsiteAudit;
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch { return null; }
}

// ─── Google Places ────────────────────────────────────────────────────────────

async function fetchGoogleBusiness(query: string, apiKey: string): Promise<GoogleData | null> {
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&key=${apiKey}`;
    const res = await fetch(url);
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
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

    // 2. Análise do site + Google em paralelo
    const [websiteAudit, googleData] = await Promise.all([
      websiteToAudit ? analyzeWebsite(websiteToAudit, GEMINI_API_KEY) : Promise.resolve(null),
      profile.full_name
        ? fetchGoogleBusiness(`${profile.full_name}`, GOOGLE_API_KEY)
        : Promise.resolve(null),
    ]);

    // 3. Montar contexto completo para o diagnóstico final
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

    const websiteSection = websiteAudit ? `
🌐 SITE: ${websiteToAudit}
• Score de presença digital: ${websiteAudit.score}/100
• Problemas CRÍTICOS: ${websiteAudit.critical.length > 0 ? websiteAudit.critical.join(' | ') : 'nenhum'}
• Alertas: ${websiteAudit.warnings.length > 0 ? websiteAudit.warnings.join(' | ') : 'nenhum'}
• Pontos positivos: ${websiteAudit.positives.length > 0 ? websiteAudit.positives.join(' | ') : 'nenhum'}
    `.trim() : '🌐 SITE: não analisado';

    const googleSection = googleData ? `
⭐ GOOGLE MINHA EMPRESA:
• Avaliação: ${googleData.rating}/5 (${googleData.reviews_count?.toLocaleString("pt-BR")} avaliações)
• Endereço: ${googleData.address}
    `.trim() : '⭐ GOOGLE: não analisado';

    const fullContext = `${instagramSection}\n\n${websiteSection}\n\n${googleSection}`;

    // 4. Gerar diagnóstico completo + mensagens
    const systemPrompt = `Você é um especialista em marketing digital e prospecção comercial da agência RT Publicidade.
Com base nos dados REAIS coletados automaticamente do perfil, site e Google do prospect, gere um diagnóstico completo e mensagens de abordagem altamente personalizadas.
Seja específico, cite dados reais. Nunca invente informações.
Responda SOMENTE com JSON válido, sem markdown.`;

    const userMessage = `Dados coletados automaticamente do prospect:

${fullContext}

Retorne exatamente este JSON:
{
  "diagnosis_report": "🔥 DIAGNÓSTICO COMPLETO — [Nome do negócio]\n\n📍 [Localização se disponível]\n⭐ Google: [rating] ([N] avaliações) SE DISPONÍVEL\n📱 Instagram: @[username] ([N] seguidores, [N] posts)\n🌐 Site: [url] SE DISPONÍVEL\n\n─────────────────────────\n🔴 PROBLEMAS CRÍTICOS:\n[liste cada problema crítico do site com bullet 🔴]\n\n⚠️ ALERTAS:\n[liste alertas com bullet ⚠️]\n\n✅ PONTOS POSITIVOS:\n[liste pontos positivos com bullet ✅]\n\n─────────────────────────\n💡 OPORTUNIDADE PARA A RT PUBLICIDADE:\n[2-3 frases sobre o que a agência pode resolver/melhorar especificamente para este cliente]",
  "dm_message": "DM personalizada citando 1-2 problemas específicos encontrados. Ex: 'Vi que seu site tem [problema real]...' Objetivo: marcar reunião. Tom amigável. Máximo 5 linhas. Assinar como RT Publicidade.",
  "whatsapp_message": "WhatsApp informal com emojis, citando problemas reais encontrados. Objetivo: marcar reunião. Máximo 6 linhas. Assinar como RT Publicidade.",
  "proposal_brief": "Proposta baseada nos problemas reais encontrados: serviços que resolvem especificamente os problemas identificados, plataformas, investimento em mídia e fee de gestão em R$",
  "creative_concept": "Conceito de anúncio baseado no negócio real e problemas identificados: produto/serviço principal, público-alvo, copy, formato e CTA",
  "extracted_whatsapp": "número WhatsApp da bio se encontrado, senão null",
  "extracted_email": "email da bio se encontrado, senão null"
}`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 3000 },
        }),
      }
    );

    if (!aiRes.ok) throw new Error(`Gemini API error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const raw = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let aiResult: {
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
      if (match) aiResult = JSON.parse(match[0]);
      else throw new Error("Failed to parse AI response");
    }

    return new Response(
      JSON.stringify({
        profile,
        profile_fetched: profileFetched,
        needs_manual_bio: false,
        website_audit: websiteAudit,
        google_data: googleData,
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
