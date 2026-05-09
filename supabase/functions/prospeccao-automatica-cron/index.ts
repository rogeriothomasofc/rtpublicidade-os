/**
 * prospeccao-automatica-cron
 *
 * SDR 24/7 — roda diariamente via pg_cron ou chamada externa.
 * 1. Verifica se a prospecção está ativa na tabela prospeccao_config
 * 2. Busca até N leads com status='Novo' e telefone preenchido
 * 3. Para cada lead: analisa com IA (diagnóstico + ICP score + 3 mensagens)
 * 4. Se ICP >= mínimo → envia mensagem 1 via WhatsApp com delay aleatório
 * 5. Atualiza status → 'Contatado' e salva diagnóstico
 * 6. Registra tudo no prospeccao_log
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProspeccaoConfig {
  ativa: boolean;
  leads_por_dia: number;
  intervalo_min_minutos: number;
  intervalo_max_minutos: number;
  icp_score_minimo: number;
  meeting_link: string | null;
}

interface GmbLead {
  id: string;
  nome_empresa: string;
  telefone: string | null;
  whatsapp_jid: string | null;
  endereco: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  especialidades: string | null;
  instagram_username: string | null;
}

interface LogItem {
  lead_id: string;
  nome: string;
  status: 'qualificado' | 'fora_icp' | 'sem_telefone' | 'erro' | 'enviado';
  icp_score?: number;
  canal?: string;
  erro?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

// ─── Análise do lead via IA ───────────────────────────────────────────────────

async function analyzeLead(
  lead: GmbLead,
  anthropicKey: string,
  meetingLink: string | null
): Promise<{
  icp_score: number;
  icp_qualificado: boolean;
  diagnosis: string;
  messages: Array<{ part: number; message: string; channel: string }>;
  website_issues: object | null;
}> {
  const prompt = `Você é um especialista em prospecção B2B para a agência RT Publicidade.
Analise este lead de serviço local e retorne SOMENTE JSON válido.

Dados do lead:
- Empresa: ${lead.nome_empresa}
- Segmento: ${lead.especialidades ?? 'não informado'}
- Localização: ${lead.endereco ?? 'não informada'}
- Google: ${lead.rating ? `${lead.rating}/5 (${lead.reviews ?? 0} avaliações)` : 'sem dados'}
- Site: ${lead.website ?? 'não possui'}
- Instagram: ${lead.instagram_username ? `@${lead.instagram_username}` : 'não identificado'}

ICP da RT Publicidade (agência de tráfego pago):
- Negócio local com presença física (clínica, academia, restaurante, imobiliária, escola, etc.)
- Tem telefone ou WhatsApp para contato
- Tem alguma presença digital (site ou Instagram)
- Segmento que se beneficia de tráfego pago (qualquer serviço local)
- NÃO é ICP: freelancers sem negócio, empresas sem contato, negócios fechados

Retorne exatamente este JSON:
{
  "icp_score": 75,
  "icp_qualificado": true,
  "icp_motivo": "Clínica com 4.5 estrelas e site desatualizado — alto potencial para tráfego pago",
  "diagnosis": "Resumo de 2-3 frases do diagnóstico digital desta empresa",
  "website_issues": {
    "critical": ["problema crítico 1"],
    "warnings": ["alerta 1"],
    "positives": ["ponto positivo 1"],
    "score": 40
  },
  "whatsapp_msg_1": "Mensagem 1 de prospecção WhatsApp — apresentação + gancho específico sobre o negócio deles. Objetivo: despertar curiosidade para uma conversa de 15 min. Tom consultivo, não vendedor. Máximo 3 linhas. ${meetingLink ? 'Inclua o link ' + meetingLink + ' apenas se o lead demonstrar interesse, não na msg 1.' : ''} Assine como RT Publicidade.",
  "whatsapp_msg_2": "Follow-up dia 5 — mencione que não quer incomodar, reforce valor da análise gratuita, proponha dia/horário para conversa rápida. Máximo 3 linhas.",
  "whatsapp_msg_3": "Último toque dia 10 — curto, deixa porta aberta sem pressão, disponível quando quiserem. 2 linhas.",
  "email_subject": "Análise rápida da [Nome] — vale 15 minutos?",
  "email_body": "Corpo do email com diagnóstico detalhado e CTA para reunião. Formal mas amigável. Inclua os problemas encontrados no site/digital.",
  "instagram_dm": "DM curta para Instagram — ultra casual, referencia algo específico do perfil deles, pergunta sobre reunião de 15 min. Máximo 2 linhas."
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic error: ${res.status}: ${errBody.slice(0, 400)}`);
  }
  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "{}";

  let parsed: any;
  try { parsed = JSON.parse(raw); }
  catch { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
  if (!parsed) throw new Error("Falha ao parsear resposta da IA");

  const messages: Array<{ part: number; message: string; channel: string }> = [
    { part: 1, channel: 'whatsapp', message: parsed.whatsapp_msg_1 ?? '' },
    { part: 2, channel: 'whatsapp', message: parsed.whatsapp_msg_2 ?? '' },
    { part: 3, channel: 'whatsapp', message: parsed.whatsapp_msg_3 ?? '' },
  ];

  if (parsed.email_body) {
    messages.push({ part: 4, channel: 'email', message: parsed.email_body ?? '' });
  }
  if (parsed.instagram_dm && lead.instagram_username) {
    messages.push({ part: 5, channel: 'instagram_dm', message: parsed.instagram_dm ?? '' });
  }

  return {
    icp_score: parsed.icp_score ?? 50,
    icp_qualificado: parsed.icp_qualificado ?? false,
    diagnosis: parsed.diagnosis ?? '',
    messages,
    website_issues: parsed.website_issues ?? null,
  };
}

// ─── Enviar WhatsApp via Evolution API ───────────────────────────────────────

async function sendWhatsApp(
  evolutionUrl: string,
  evolutionKey: string,
  instance: string,
  phone: string,
  text: string
): Promise<void> {
  const res = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "apikey": evolutionKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number: phone, text, delay: 1200 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Evolution API ${res.status}: ${err.slice(0, 200)}`);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
  const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL")!;
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") ?? "pipeline";

  const log: LogItem[] = [];
  let leadsProcessados = 0;
  let leadsQualificados = 0;
  let leadsAbordados = 0;
  let leadsFora = 0;
  let erros = 0;

  try {
    // 1. Verificar se prospecção está ativa
    const { data: configData } = await supabase
      .from('prospeccao_config')
      .select('*')
      .limit(1)
      .single();

    const config = configData as ProspeccaoConfig | null;

    if (!config?.ativa) {
      return new Response(JSON.stringify({
        ok: true,
        message: "Prospecção automática desativada. Ative nas configurações do pipeline.",
        abordados: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Buscar leads pendentes com telefone
    const { data: leads, error: leadsError } = await supabase
      .from('gmb_leads')
      .select('id, nome_empresa, telefone, whatsapp_jid, endereco, website, rating, reviews, especialidades, instagram_username')
      .eq('status', 'Novo')
      .not('telefone', 'is', null)
      .is('auto_prospectado_em', null)
      .order('created_at', { ascending: true })
      .limit(config.leads_por_dia);

    if (leadsError) throw leadsError;
    if (!leads?.length) {
      return new Response(JSON.stringify({
        ok: true,
        message: "Nenhum lead novo com telefone encontrado para prospectar.",
        abordados: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    leadsProcessados = leads.length;

    // 3. Processar cada lead com intervalo curto entre envios
    // Os intervalos de minutos são para o cron diário — dentro da execução
    // usamos 3-5s para não sobrecarregar a Evolution API e parecer humano.
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i] as GmbLead;

      // Pequena pausa entre envios (exceto o primeiro)
      if (i > 0) {
        const pausaMs = 3000 + Math.random() * 2000; // 3-5 segundos
        await sleep(pausaMs);
      }

      try {
        const phone = normalizePhone(lead.telefone ?? lead.whatsapp_jid ?? '');
        if (!phone) {
          log.push({ lead_id: lead.id, nome: lead.nome_empresa, status: 'sem_telefone' });
          continue;
        }

        // Analisar lead com IA
        console.log(`Analisando: ${lead.nome_empresa}`);
        const analysis = await analyzeLead(lead, ANTHROPIC_KEY, config.meeting_link);

        // Verificar ICP
        if (analysis.icp_score < config.icp_score_minimo || !analysis.icp_qualificado) {
          leadsFora++;
          log.push({
            lead_id: lead.id,
            nome: lead.nome_empresa,
            status: 'fora_icp',
            icp_score: analysis.icp_score,
          });

          // Atualizar lead como fora do ICP
          await supabase.from('gmb_leads').update({
            icp_score: analysis.icp_score,
            icp_qualificado: false,
            ai_diagnosis: analysis.diagnosis,
            website_issues: analysis.website_issues,
            auto_prospectado_em: new Date().toISOString(),
          }).eq('id', lead.id);

          continue;
        }

        leadsQualificados++;

        const msg1 = analysis.messages.find(m => m.part === 1 && m.channel === 'whatsapp');

        // Salvar diagnóstico e mensagens (ainda como 'Novo' até o envio confirmar)
        await supabase.from('gmb_leads').update({
          icp_score: analysis.icp_score,
          icp_qualificado: true,
          ai_diagnosis: analysis.diagnosis,
          ai_messages: analysis.messages,
          website_issues: analysis.website_issues,
          mensagem_enviada: msg1?.message ?? null,
        }).eq('id', lead.id);

        // Enviar mensagem 1 via WhatsApp e só então atualizar status
        if (msg1?.message) {
          await sendWhatsApp(EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE, phone, msg1.message);

          // Criar card no pipeline de vendas
          const { data: pl } = await supabase
            .from('sales_pipeline')
            .insert({
              lead_name: lead.nome_empresa,
              company: lead.nome_empresa,
              phone: phone,
              stage: 'ATENDIMENTO_INICIA',
              deal_value: 0,
              probability: 10,
              source: 'gmb',
              notes: lead.endereco || null,
            })
            .select('id')
            .single();

          await supabase.from('gmb_leads').update({
            status: 'Contatado',
            auto_prospectado_em: new Date().toISOString(),
            pipeline_lead_id: pl?.id ?? null,
          }).eq('id', lead.id);

          leadsAbordados++;
          log.push({
            lead_id: lead.id,
            nome: lead.nome_empresa,
            status: 'enviado',
            icp_score: analysis.icp_score,
            canal: 'whatsapp',
          });
          console.log(`✓ WhatsApp enviado para ${lead.nome_empresa} (${phone}) → pipeline ${pl?.id}`);
        }

      } catch (err) {
        erros++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Erro no lead ${lead.nome_empresa}:`, msg);
        log.push({ lead_id: lead.id, nome: lead.nome_empresa, status: 'erro', erro: msg });
      }
    }

    // 4. Registrar log da execução
    await supabase.from('prospeccao_log').insert({
      leads_processados: leadsProcessados,
      leads_qualificados: leadsQualificados,
      leads_abordados: leadsAbordados,
      leads_fora_icp: leadsFora,
      erros,
      detalhes: log,
    });

    return new Response(JSON.stringify({
      ok: true,
      leads_processados: leadsProcessados,
      leads_qualificados: leadsQualificados,
      leads_abordados: leadsAbordados,
      leads_fora_icp: leadsFora,
      erros,
      log,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("prospeccao-automatica-cron error:", error);
    // Registra erro no log mesmo em falha geral
    await supabase.from('prospeccao_log').insert({
      leads_processados: leadsProcessados,
      leads_qualificados: leadsQualificados,
      leads_abordados: leadsAbordados,
      leads_fora_icp: leadsFora,
      erros: erros + 1,
      detalhes: [...log, { lead_id: 'system', nome: 'ERRO GERAL', status: 'erro', erro: String(error) }],
    }).catch(() => {});

    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
