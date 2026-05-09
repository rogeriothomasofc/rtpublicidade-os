/**
 * prospeccao-followup-cron
 *
 * Roda diariamente às 10h Brasília (13h UTC) e envia follow-ups automáticos
 * para leads que foram abordados pelo SDR mas não responderam.
 *
 * Cadência completa:
 *   Dia 1  → WhatsApp msg 1 (feito pelo prospeccao-automatica-cron)
 *   Dia 3  → Email (se tiver email cadastrado)
 *   Dia 5  → WhatsApp msg 2 (follow-up)
 *   Dia 10 → WhatsApp msg 3 (último toque) → move para 'Sem Retorno'
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GmbLead {
  id: string;
  nome_empresa: string;
  telefone: string | null;
  whatsapp_jid: string | null;
  email: string | null;
  auto_prospectado_em: string;
  ai_messages: Array<{ part: number; channel: string; message: string }> | null;
  followup_msg2_em: string | null;
  followup_msg3_em: string | null;
  followup_email_em: string | null;
  status: string;
}

interface LogItem {
  lead_id: string;
  nome: string;
  acao: string;
  canal: string;
  status: 'enviado' | 'erro' | 'sem_canal';
  erro?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── WhatsApp via Evolution API ───────────────────────────────────────────────

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

// ─── Email via send-client-email ─────────────────────────────────────────────

async function sendEmail(
  supabaseUrl: string,
  serviceKey: string,
  toEmail: string,
  toName: string,
  subject: string,
  body: string
): Promise<void> {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-client-email`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to_email: toEmail,
      to_name: toName,
      subject,
      html_body: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333">
${body}
          </pre>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
          <p style="font-size:12px;color:#999">RT Publicidade · Agência de Tráfego Pago</p>
        </div>
      `,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Email error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVOLUTION_URL      = Deno.env.get("EVOLUTION_API_URL")!;
  const EVOLUTION_KEY      = Deno.env.get("EVOLUTION_API_KEY")!;
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") ?? "pipeline";

  const log: LogItem[] = [];
  let enviados = 0;
  let erros = 0;

  try {
    // Verificar se prospecção está ativa
    const { data: config } = await supabase
      .from('prospeccao_config')
      .select('ativa')
      .limit(1)
      .single();

    if (!config?.ativa) {
      return new Response(JSON.stringify({
        ok: true,
        message: "Prospecção automática desativada.",
        enviados: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Buscar todos os leads que foram abordados pelo SDR e ainda estão como 'Contatado'
    const { data: leads, error } = await supabase
      .from('gmb_leads')
      .select('id, nome_empresa, telefone, whatsapp_jid, email, auto_prospectado_em, ai_messages, followup_msg2_em, followup_msg3_em, followup_email_em, status')
      .eq('status', 'Contatado')
      .not('auto_prospectado_em', 'is', null)
      .order('auto_prospectado_em', { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!leads?.length) {
      return new Response(JSON.stringify({
        ok: true,
        message: "Nenhum lead aguardando follow-up.",
        enviados: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const lead of leads as GmbLead[]) {
      const dias = daysSince(lead.auto_prospectado_em);
      const phone = lead.whatsapp_jid || lead.telefone;
      const messages = lead.ai_messages ?? [];

      // ── Dia 3: Email (se tiver email e ainda não enviou) ──────────────────
      if (dias >= 3 && lead.email && !lead.followup_email_em) {
        const emailMsg = messages.find(m => m.channel === 'email');
        const emailSubject = `${lead.nome_empresa} — análise gratuita da sua presença digital`;

        try {
          const body = emailMsg?.message ?? `Olá, equipe ${lead.nome_empresa}!\n\nFizemos uma análise gratuita da presença digital de vocês e identificamos algumas oportunidades de crescimento.\n\nGostaria de apresentar em uma conversa rápida de 15 minutos?\n\nAguardo retorno,\nRT Publicidade`;

          await sendEmail(SUPABASE_URL, SERVICE_KEY, lead.email, lead.nome_empresa, emailSubject, body);
          await supabase.from('gmb_leads').update({ followup_email_em: new Date().toISOString() }).eq('id', lead.id);
          enviados++;
          log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'email_dia3', canal: 'email', status: 'enviado' });
          console.log(`✓ Email enviado para ${lead.nome_empresa}`);
        } catch (e) {
          erros++;
          log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'email_dia3', canal: 'email', status: 'erro', erro: String(e) });
        }

        await sleep(2000);
      }

      // ── Dia 5: WhatsApp msg 2 (follow-up) ────────────────────────────────
      if (dias >= 5 && !lead.followup_msg2_em) {
        const msg2 = messages.find(m => m.part === 2 && m.channel === 'whatsapp');

        if (!msg2?.message) {
          log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'followup_dia5', canal: 'whatsapp', status: 'sem_canal', erro: 'Mensagem 2 não encontrada no banco' });
        } else if (!phone) {
          log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'followup_dia5', canal: 'whatsapp', status: 'sem_canal', erro: 'Sem telefone' });
        } else {
          try {
            await sendWhatsApp(EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE, normalizePhone(phone), msg2.message);
            await supabase.from('gmb_leads').update({ followup_msg2_em: new Date().toISOString() }).eq('id', lead.id);
            enviados++;
            log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'followup_dia5', canal: 'whatsapp', status: 'enviado' });
            console.log(`✓ Follow-up dia 5 para ${lead.nome_empresa}`);
          } catch (e) {
            erros++;
            log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'followup_dia5', canal: 'whatsapp', status: 'erro', erro: String(e) });
          }

          await sleep(3000);
        }
      }

      // ── Dia 10: WhatsApp msg 3 (último toque) → move para 'Sem Retorno' ──
      if (dias >= 10 && !lead.followup_msg3_em) {
        const msg3 = messages.find(m => m.part === 3 && m.channel === 'whatsapp');

        if (!msg3?.message) {
          log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'ultimo_dia10', canal: 'whatsapp', status: 'sem_canal', erro: 'Mensagem 3 não encontrada' });
          // Mesmo sem mensagem, move para Sem Retorno após 10 dias
          await supabase.from('gmb_leads').update({ status: 'Sem Retorno', followup_msg3_em: new Date().toISOString() }).eq('id', lead.id);
        } else if (!phone) {
          log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'ultimo_dia10', canal: 'whatsapp', status: 'sem_canal', erro: 'Sem telefone' });
          await supabase.from('gmb_leads').update({ status: 'Sem Retorno', followup_msg3_em: new Date().toISOString() }).eq('id', lead.id);
        } else {
          try {
            await sendWhatsApp(EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE, normalizePhone(phone), msg3.message);
            await supabase.from('gmb_leads').update({
              followup_msg3_em: new Date().toISOString(),
              status: 'Sem Retorno',
            }).eq('id', lead.id);
            enviados++;
            log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'ultimo_dia10', canal: 'whatsapp', status: 'enviado' });
            console.log(`✓ Último toque dia 10 para ${lead.nome_empresa} → Sem Retorno`);
          } catch (e) {
            erros++;
            log.push({ lead_id: lead.id, nome: lead.nome_empresa, acao: 'ultimo_dia10', canal: 'whatsapp', status: 'erro', erro: String(e) });
          }

          await sleep(3000);
        }
      }
    }

    // Registrar no log de prospecção
    if (log.length > 0) {
      await supabase.from('prospeccao_log').insert({
        leads_processados: leads.length,
        leads_qualificados: enviados,
        leads_abordados: enviados,
        leads_fora_icp: 0,
        erros,
        detalhes: log,
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      leads_verificados: leads.length,
      followups_enviados: enviados,
      erros,
      log,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("prospeccao-followup-cron error:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
