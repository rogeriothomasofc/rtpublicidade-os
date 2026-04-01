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
    const hasPrices = /r\$\s*[\d.,]+/i.test(html);
    const hasTestimonials = /depoimento|avalia[çc][ãa]o|testimon/i.test(html);
    const hasBlog = /blog|artigo|post/i.test(html);

    return `URL: ${url}
Title: ${titleMatch?.[1] ?? 'AUSENTE'}
Meta description: ${metaDesc?.[1] ?? metaDesc2?.[1] ?? 'AUSENTE'}
Lorem ipsum detectado: ${hasLoremIpsum ? 'SIM ⚠️' : 'não'}
Telefone/contato: ${hasPhone ? 'sim' : 'não detectado'}
WhatsApp: ${hasWhatsApp ? 'sim' : 'não'}
Formulário de contato: ${hasForm ? 'sim' : 'não'}
Schema.org (SEO): ${hasSchema ? 'sim' : 'não'}
Viewport mobile: ${hasViewport ? 'ok' : 'AUSENTE ⚠️'}
Preços expostos: ${hasPrices ? 'sim' : 'não'}
Depoimentos/provas sociais: ${hasTestimonials ? 'sim' : 'não'}
Blog/conteúdo: ${hasBlog ? 'sim' : 'não'}

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

    // Contexto do lead
    const leadContext = `
Empresa: ${lead.nome_empresa}
Segmento/nicho: ${lead.especialidades ?? 'a identificar pelo site'}
Localização: ${lead.endereco ?? 'não informada'}
Google Meu Negócio:
  - Avaliação: ${lead.rating ? `${lead.rating}/5` : 'não encontrado'}
  - Número de avaliações: ${lead.reviews?.toLocaleString('pt-BR') ?? 'não encontrado'}
Site: ${lead.website ?? 'não possui'}

${websiteSnippet ? `Dados coletados do site:\n${websiteSnippet}` : 'Site não disponível para análise.'}
`.trim();

    // PASSO 1: Diagnóstico completo no mesmo formato do Instagram
    const diagRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1400,
        system: `Você é especialista em auditoria de presença digital e marketing de performance da agência RT PUBLICIDADE.
Analise os dados do lead e gere um diagnóstico COMPLETO e DETALHADO. Responda SOMENTE com JSON válido.

O campo "diagnosis" deve ser um relatório formatado exatamente assim (use quebras de linha \\n):

🔥 DIAGNÓSTICO COMPLETO — [Nome da Empresa]

📍 Localização: [endereço ou "não identificada nos dados coletados"]
⭐ Google: [X]/5 ([N] avaliações) ou "não analisado"
📱 Instagram: [se disponível] ou "não identificado"
🌐 Site: [URL] ou "não possui site próprio"

─────────────────────────
🔴 PROBLEMAS CRÍTICOS:
🔴 [problema crítico real e específico desta empresa, com dados concretos]
(repita para cada problema crítico encontrado)

⚠️ ALERTAS:
⚠️ [alerta específico]
(repita para cada alerta)

✅ PONTOS POSITIVOS:
✅ [ponto positivo real]
(repita para cada positivo)

─────────────────────────
💡 OPORTUNIDADE PARA A RT PUBLICIDADE:
[Parágrafo específico explicando como a RT Publicidade pode ajudar ESTA empresa, citando serviços concretos: site, tráfego pago, Google Business, Instagram Ads, gestão de conteúdo, etc. Mencione potencial de crescimento com dados reais do lead.]

IMPORTANTE: Seja específico. Use os dados reais do lead. Não seja genérico.`,
        messages: [{
          role: "user",
          content: `Analise esta empresa e retorne diagnóstico em JSON:\n\n${leadContext}\n\nRetorne SOMENTE este JSON:\n{\n  "diagnosis": "relatório completo formatado conforme instruções do sistema",\n  "website_issues": {\n    "critical": ["problema crítico real 1", "problema crítico real 2"],\n    "warnings": ["alerta real 1"],\n    "positives": ["ponto positivo real 1"],\n    "score": 0\n  }\n}\n\nO score deve ser de 0 a 100 baseado na qualidade da presença digital geral (não só do site).`,
        }],
      }),
    });
    if (!diagRes.ok) throw new Error(`Anthropic error: ${diagRes.status}`);
    const diagData = await diagRes.json();
    const diagRaw = diagData.content?.[0]?.text ?? '{}';
    let diagResult: { diagnosis: string; website_issues: { critical: string[]; warnings: string[]; positives: string[]; score: number } };
    try { diagResult = JSON.parse(diagRaw); }
    catch { const m = diagRaw.match(/\{[\s\S]*\}/); diagResult = m ? JSON.parse(m[0]) : { diagnosis: '', website_issues: { critical: [], warnings: [], positives: [], score: 0 } }; }

    // PASSO 2: Sequência de 3 mensagens WhatsApp personalizadas
    const msgRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: `Você é um estrategista sênior em marketing digital e tráfego pago, com mais de 10 anos de experiência em aquisição de clientes, performance e crescimento previsível. Sua personalidade combina visão analítica com comunicação consultiva — você pensa como um gestor de negócios, analisa como um media buyer experiente e se comunica de forma clara, humana e persuasiva.

Crie sequências de mensagens WhatsApp altamente personalizadas que:
- Estabeleçam conexão imediata com empresas qualificadas
- Despertem curiosidade sobre melhoria de resultados com tráfego pago
- Gerem alta taxa de resposta através de personalização estratégica
- Posicionem a gestão de tráfego como alavanca de crescimento previsível
- Iniciem conversas consultivas focadas em diagnóstico, não em venda agressiva

Aplique a fórmula PAS:
- Problem: Identifique um desafio real de aquisição ou conversão
- Agitation: Conecte com desperdício de verba, leads desqualificados ou estagnação
- Solution: Apresente a gestão estratégica de tráfego pago como solução natural

Critérios de Rating:
- Rating ≥ 4.0: Valorize a reputação como indicativo de potencial de escala
- Rating < 4.0: Sugira otimização de aquisição para melhorar qualidade de clientes

PROIBIDO:
❌ Pressão, urgência artificial ou escassez falsa
❌ Promessas irreais de faturamento ou ROI garantido
❌ Linguagem genérica ou claramente automatizada
❌ Mais de uma pergunta por mensagem
❌ Jargões técnicos desnecessários
❌ Pitch de venda direta
❌ Emojis em excesso ou no início de frases

Responda SOMENTE com JSON válido, sem markdown.`,
        messages: [{
          role: "user",
          content: `Dados da empresa para prospecção:\n\n${leadContext}\n\nDiagnóstico identificado: ${diagResult.diagnosis}\n\nProblemas críticos: ${diagResult.website_issues?.critical?.join(', ') || 'nenhum identificado'}\n\nCrie uma sequência de exatamente 3 mensagens WhatsApp (40-70 tokens cada) para prospecção consultiva. Retorne SOMENTE este JSON:\n[\n  {\n    "part": 1,\n    "message": "Mensagem 1 — Conexão + Autoridade: cumprimento personalizado, menção específica ao negócio, reconhecimento sutil de oportunidade"\n  },\n  {\n    "part": 2,\n    "message": "Mensagem 2 — Problema + Contexto: desafio real de aquisição de forma empática, conectar com perdas potenciais, introduzir tráfego pago estratégico"\n  },\n  {\n    "part": 3,\n    "message": "Mensagem 3 — Benefício + Engajamento: benefício central, pergunta aberta consultiva, tom de parceria estratégica"\n  }\n]`,
        }],
      }),
    });

    if (!msgRes.ok) throw new Error(`Anthropic messages error: ${msgRes.status}`);
    const msgData = await msgRes.json();
    const msgRaw = msgData.content?.[0]?.text ?? '[]';
    let messages: Array<{ part: number; message: string }>;
    try { messages = JSON.parse(msgRaw); }
    catch { const m = msgRaw.match(/\[[\s\S]*\]/); messages = m ? JSON.parse(m[0]) : []; }

    return new Response(JSON.stringify({
      diagnosis: diagResult.diagnosis,
      website_issues: diagResult.website_issues,
      messages,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("analyze-gmb-lead error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
