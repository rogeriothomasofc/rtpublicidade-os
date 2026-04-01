import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json();
    const { lead_name, website, phone, email, heat_score, instagram, gmb } = body;

    if (!lead_name) return new Response(JSON.stringify({ error: "lead_name is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Montar contexto completo do lead
    const canais: string[] = [];
    if (instagram) canais.push("Instagram DM");
    if (phone) canais.push("WhatsApp");
    if (email) canais.push("E-mail");

    const leadContext = `
LEAD: ${lead_name}
Website: ${website || "não informado"}
Temperatura: ${heat_score}/100
Canais disponíveis: ${canais.join(", ") || "nenhum confirmado"}

${instagram ? `
--- DADOS INSTAGRAM ---
Username: @${instagram.username}
Bio: ${instagram.bio || "sem bio"}
Seguidores: ${instagram.followers_count?.toLocaleString("pt-BR") ?? "?"}
Taxa de engajamento: ${instagram.engagement_rate ? `${instagram.engagement_rate}%` : "?"}
Nicho: ${instagram.niche || "?"}
Problemas críticos no site: ${instagram.website_issues?.critical?.join(", ") || "nenhum identificado"}
Diagnóstico: ${instagram.diagnosis_report || instagram.ai_dm_message || "não gerado"}
`.trim() : ""}

${gmb ? `
--- DADOS GOOGLE MAPS ---
Empresa: ${gmb.nome_empresa}
Endereço: ${gmb.endereco || "?"}
Avaliação Google: ${gmb.rating ? `${gmb.rating}/5` : "?"}
Número de avaliações: ${gmb.reviews?.toLocaleString("pt-BR") ?? "?"}
Especialidades: ${gmb.especialidades || "?"}
Problemas críticos no site: ${gmb.website_issues?.critical?.join(", ") || "nenhum identificado"}
Diagnóstico: ${gmb.ai_diagnosis || "não gerado"}
`.trim() : ""}
`.trim();

    // PASSO 1: Análise unificada
    const analysisRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: "Você é especialista em prospecção de marketing digital. Analise os dados combinados de Instagram e Google Maps de uma empresa e gere um diagnóstico unificado conciso. Responda SOMENTE com JSON válido.",
        messages: [{
          role: "user",
          content: `Analise este lead e retorne um diagnóstico unificado em JSON:\n\n${leadContext}\n\nRetorne:\n{\n  "analysis": "3-5 linhas identificando as principais oportunidades e dores desta empresa com base nos dados de ambas as plataformas. Seja específico e cite dados concretos."\n}`,
        }],
      }),
    });

    if (!analysisRes.ok) throw new Error(`Anthropic error: ${analysisRes.status}`);
    const analysisData = await analysisRes.json();
    const analysisRaw = analysisData.content?.[0]?.text ?? '{}';
    let analysisResult: { analysis: string };
    try { analysisResult = JSON.parse(analysisRaw); }
    catch { const m = analysisRaw.match(/\{[\s\S]*\}/); analysisResult = m ? JSON.parse(m[0]) : { analysis: '' }; }

    // PASSO 2: Gerar fluxo de cadência multicanal
    const cadenceRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `Você é especialista em prospecção consultiva para agências de marketing digital.
Crie uma sequência de mensagens COMPLETAS e PRONTAS PARA ENVIAR — não descreva o que escrever, escreva a mensagem real que será copiada e enviada ao lead.

Cada mensagem deve:
- Ser curta (40-80 palavras), direta e humana
- Ser 100% personalizada com dados reais do lead (nome da empresa, nicho, rating, número de avaliações, problemas específicos do site)
- Ter tom consultivo, não comercial
- Terminar com UMA pergunta aberta simples ou call-to-action claro
- Ser natural para o canal (DM do Instagram ≠ WhatsApp ≠ E-mail)

Distribuição dos 5 passos ao longo de ~14 dias:
- Dia 1: primeiro contato (canal principal disponível)
- Dia 2: segundo canal disponível com mensagem complementar
- Dia 5: follow-up leve, sem pressão
- Dia 8: nova perspectiva ou dado novo
- Dia 12: último toque com proposta rápida de diagnóstico gratuito

PROIBIDO: "oi tudo bem?", promessas de ROI, emojis em excesso, pressão, linguagem robótica, mais de uma pergunta por mensagem.
Responda SOMENTE com JSON válido, sem markdown.`,
        messages: [{
          role: "user",
          content: `Dados do lead:\n${leadContext}\n\nAnálise unificada: ${analysisResult.analysis}\n\nCanais disponíveis: ${canais.join(", ") || "apenas WhatsApp"}\n\nGere exatamente 5 mensagens com o texto COMPLETO e PRONTO PARA ENVIAR. Retorne SOMENTE este JSON:\n[\n  {\n    "day": 1,\n    "channel": "instagram_dm",\n    "message": "Olá [Nome/Empresa]! Vi que vocês têm [X avaliações] no Google com nota [X] — ótima reputação. Dei uma olhada no site de vocês e notei [problema específico real]. Trabalho com agências de marketing digital e ajudo negócios como o de vocês a converter melhor online. Posso te mostrar em 15 min o que encontrei?",\n    "status": "pending"\n  }\n]\n\nValues válidos para channel: instagram_dm, whatsapp, email, ligacao\nSUBSTITUA os colchetes pelos dados reais do lead.`,
        }],
      }),
    });

    if (!cadenceRes.ok) throw new Error(`Anthropic cadence error: ${cadenceRes.status}`);
    const cadenceData = await cadenceRes.json();
    const cadenceRaw = cadenceData.content?.[0]?.text ?? '[]';
    let cadenceSteps: Array<{ day: number; channel: string; message: string; status: string }>;
    try { cadenceSteps = JSON.parse(cadenceRaw); }
    catch { const m = cadenceRaw.match(/\[[\s\S]*\]/); cadenceSteps = m ? JSON.parse(m[0]) : []; }

    // Filtrar apenas canais válidos disponíveis
    const validChannels = new Set<string>();
    if (instagram) validChannels.add("instagram_dm");
    if (phone) validChannels.add("whatsapp");
    if (email) validChannels.add("email");
    validChannels.add("ligacao"); // sempre permitido

    const filteredSteps = cadenceSteps
      .filter(s => validChannels.has(s.channel))
      .map(s => ({ ...s, status: "pending" }));

    return new Response(JSON.stringify({
      analysis: analysisResult.analysis,
      cadence_steps: filteredSteps,
      heat_score,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("generate-lead-cadence error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
