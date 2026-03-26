import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWebsiteSnippet(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(normalized, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
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
Title: ${titleMatch?.[1] ?? 'AUSENTE'}
Meta description: ${metaDesc?.[1] ?? metaDesc2?.[1] ?? 'AUSENTE'}
Lorem ipsum: ${hasLoremIpsum ? 'SIM ⚠️' : 'não'}
Telefone no HTML: ${hasPhone ? 'sim' : 'não'}
WhatsApp: ${hasWhatsApp ? 'sim' : 'não'}
Formulário: ${hasForm ? 'sim' : 'não'}
Schema.org: ${hasSchema ? 'sim' : 'não'}
Viewport mobile: ${hasViewport ? 'ok' : 'AUSENTE ⚠️'}

--- HTML (8KB) ---
${html.slice(0, 8000)}`;
  } catch { return null; }
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

    const { lead } = await req.json() as {
      lead: {
        id: string;
        nome_empresa: string;
        endereco: string | null;
        website: string | null;
        rating: number | null;
        reviews: number | null;
        especialidades: string | null;
        telefone: string | null;
      };
    };

    if (!lead?.nome_empresa) return new Response(JSON.stringify({ error: "lead is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Buscar site se disponível
    const websiteSnippet = lead.website ? await fetchWebsiteSnippet(lead.website) : null;

    // Montar contexto
    const context = `
🏢 EMPRESA: ${lead.nome_empresa}
📍 Endereço: ${lead.endereco ?? 'não informado'}
🔧 Especialidades: ${lead.especialidades ?? 'não informado'}
⭐ Google: ${lead.rating ? `${lead.rating}/5 (${lead.reviews?.toLocaleString('pt-BR') ?? 0} avaliações)` : 'não encontrado'}
🌐 Site: ${lead.website ?? 'não tem'}

${websiteSnippet ? `--- ANÁLISE DO SITE ---\n${websiteSnippet}` : '--- SEM SITE PARA ANALISAR ---'}
`.trim();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `Você é especialista em marketing digital e prospecção comercial da agência RT Publicidade.
Analise os dados reais do lead e gere um diagnóstico personalizado e uma mensagem de WhatsApp altamente personalizada.
Seja ESPECÍFICO — cite dados reais: nome do negócio, avaliação exata do Google, problemas reais encontrados no site.
JAMAIS use mensagem genérica. Responda SOMENTE com JSON válido, sem markdown.`,
        messages: [{
          role: "user",
          content: `Dados do lead:\n\n${context}\n\nRetorne exatamente este JSON:\n{\n  "diagnosis": "Diagnóstico em 3-5 linhas citando dados reais: avaliação Google, problemas do site, oportunidades específicas para este tipo de negócio.",\n  "website_issues": {\n    "critical": ["problema crítico 1"],\n    "warnings": ["alerta 1"],\n    "positives": ["ponto positivo 1"],\n    "score": 45\n  },\n  "message": "Mensagem WhatsApp personalizada (máx 8 linhas) que:\\n- Cita o nome real do negócio\\n- Menciona dado específico do Google (avaliação, nº de reviews)\\n- Cita 1-2 problema real encontrado no site OU oportunidade específica do segmento\\n- CTA para marcar reunião rápida\\n- Tom amigável com emojis\\n- Assinar como RT Publicidade"\n}`,
        }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
    const data = await res.json();
    const raw = data.content?.[0]?.text ?? '{}';

    let result: { diagnosis: string; website_issues: object; message: string };
    try { result = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) result = JSON.parse(m[0]);
      else throw new Error('Parse error');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("analyze-gmb-lead error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
