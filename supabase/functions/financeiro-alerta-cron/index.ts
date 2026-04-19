import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const AUTOMATION_ID = "financeiro-alert";

// IDs separados no alert_log para cooldown independente
const LOG_REMINDER = "financeiro-lembrete"; // 3 dias antes
const LOG_OVERDUE  = "financeiro-alert";    // já vencido

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authorized =
    (CRON_SECRET && cronSecret === CRON_SECRET) ||
    authHeader === `Bearer ${SERVICE_KEY}`;

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);
  const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") ?? "";

  const results: unknown[] = [];

  try {
    // 0. Lê configuração global
    const { data: config } = await supabase
      .from("automation_configs")
      .select("enabled, threshold_days, cooldown_days")
      .eq("id", AUTOMATION_ID)
      .single();

    if (config && !config.enabled) {
      return new Response(JSON.stringify({ message: "Automação financeira desativada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const COOLDOWN_REMINDER = 3; // lembrete: 1x só (antes do vencimento)
    const COOLDOWN_OVERDUE  = config?.cooldown_days ?? 2; // cobrança: repete a cada 2 dias

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // ── BLOCO 1: Lembrete 3 dias antes do vencimento ──────────────────────────
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 3);
    const reminderStr = reminderDate.toISOString().split("T")[0];

    const { data: upcomingFinances } = await supabase
      .from("finance")
      .select(`id, description, amount, due_date, clients (id, name, company, phone)`)
      .eq("type", "Receita")
      .eq("status", "Pendente")
      .eq("due_date", reminderStr)
      .not("clients", "is", null);

    const reminderByClient = groupByClient(upcomingFinances ?? [], "phone");
    const cooldownSinceReminder = new Date(Date.now() - COOLDOWN_REMINDER * 86400000).toISOString();

    for (const [, { client, records }] of reminderByClient) {
      try {
        const hasCooldown = await checkCooldown(supabase, LOG_REMINDER, client.id, cooldownSinceReminder);
        if (hasCooldown) {
          results.push({ client: client.name, type: "lembrete", skipped: true, reason: "cooldown" });
          continue;
        }

        const total = records.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalFmt = formatBRL(total);
        const itemLines = records.map((r: any) => {
          const amt = formatBRL(Number(r.amount));
          return `• ${r.description || "Fee mensal"}: *${amt}* — vence em *${formatDate(r.due_date)}*`;
        });

        const msg = [
          `🔔 *Olá, ${client.company || client.name}!*`,
          ``,
          `Lembrando que ${records.length === 1 ? "o seguinte pagamento vence" : "os seguintes pagamentos vencem"} em *3 dias* (${formatDate(reminderStr)}):`,
          ``,
          ...itemLines,
          ``,
          `*Total: ${totalFmt}*`,
          ``,
          `Qualquer dúvida, estamos à disposição. 😊`,
          `_RT Publicidade_`,
        ].join("\n");

        const phone = formatPhone(client.phone);
        if (!phone) { results.push({ client: client.name, type: "lembrete", skipped: true, reason: "sem telefone" }); continue; }

        await sendWhatsApp(EVOLUTION_URL, EVOLUTION_INSTANCE, EVOLUTION_KEY, phone, msg);
        await supabase.from("automation_alert_log").insert({ automation_id: LOG_REMINDER, client_id: client.id });

        results.push({ client: client.name, type: "lembrete", sent: true, records: records.length, total: totalFmt });
      } catch (err) {
        results.push({ client: client.name, type: "lembrete", error: String(err) });
      }
    }

    // ── BLOCO 2: Alerta de vencidos/atrasados (repete a cada 2 dias) ─────────
    const { data: overdueFinances, error: finErr } = await supabase
      .from("finance")
      .select(`id, description, amount, due_date, status, clients (id, name, company, phone)`)
      .eq("type", "Receita")
      .in("status", ["Pendente", "Atrasado"])
      .lte("due_date", todayStr)
      .not("clients", "is", null);

    if (finErr) throw finErr;

    const overdueByClient = groupByClient(overdueFinances ?? [], "phone");
    const cooldownSinceOverdue = new Date(Date.now() - COOLDOWN_OVERDUE * 86400000).toISOString();

    for (const [, { client, records }] of overdueByClient) {
      try {
        const hasCooldown = await checkCooldown(supabase, LOG_OVERDUE, client.id, cooldownSinceOverdue);
        if (hasCooldown) {
          results.push({ client: client.name, type: "cobrança", skipped: true, reason: "cooldown" });
          continue;
        }

        const total = records.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalFmt = formatBRL(total);
        const itemLines = records.map((r: any) => {
          const amt = formatBRL(Number(r.amount));
          const daysLate = Math.floor((today.getTime() - new Date(r.due_date + "T12:00:00Z").getTime()) / 86400000);
          const lateNote = daysLate > 0 ? ` _(${daysLate} dia${daysLate > 1 ? "s" : ""} em atraso)_` : "";
          return `• ${r.description || "Fee mensal"}: *${amt}* — venceu em ${formatDate(r.due_date)}${lateNote}`;
        });

        const msg = [
          `💰 *Olá, ${client.company || client.name}!*`,
          ``,
          `${records.length === 1 ? "Identificamos uma cobrança pendente" : `Identificamos ${records.length} cobranças pendentes`} em aberto:`,
          ``,
          ...itemLines,
          ``,
          `*Total: ${totalFmt}*`,
          ``,
          `Por favor, entre em contato para regularizarmos. 🙏`,
          `_RT Publicidade_`,
        ].join("\n");

        const phone = formatPhone(client.phone);
        if (!phone) { results.push({ client: client.name, type: "cobrança", skipped: true, reason: "sem telefone" }); continue; }

        await sendWhatsApp(EVOLUTION_URL, EVOLUTION_INSTANCE, EVOLUTION_KEY, phone, msg);
        await supabase.from("automation_alert_log").insert({ automation_id: LOG_OVERDUE, client_id: client.id });

        results.push({ client: client.name, type: "cobrança", sent: true, records: records.length, total: totalFmt });
      } catch (err) {
        results.push({ client: client.name, type: "cobrança", error: String(err) });
      }
    }

    // ── Finaliza ─────────────────────────────────────────────────────────────
    await supabase.from("automation_configs").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "success",
      last_run_summary: { processed: results.length, results },
    }).eq("id", AUTOMATION_ID);

    await supabase.from("automation_run_log").insert({
      automation_id: AUTOMATION_ID, status: "success",
      processed: results.length, summary: results,
    });

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("automation_configs").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "error",
      last_run_summary: { error: String(err) },
    }).eq("id", AUTOMATION_ID).catch(() => {});

    await supabase.from("automation_run_log").insert({
      automation_id: AUTOMATION_ID, status: "error",
      processed: 0, summary: [{ error: String(err) }],
    }).catch(() => {});

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByClient(rows: any[], phoneField = "phone"): Map<string, { client: any; records: any[] }> {
  const map = new Map<string, { client: any; records: any[] }>();
  for (const r of rows) {
    const client = r.clients;
    if (!client?.[phoneField]) continue;
    if (!map.has(client.id)) map.set(client.id, { client, records: [] });
    map.get(client.id)!.records.push(r);
  }
  return map;
}

// Normaliza telefone para formato E.164 sem "+" (ex: "5511999999999")
function formatPhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `55${digits}`; // BR sem DDI
  if (digits.length === 13 && digits.startsWith("55")) return digits;
  if (digits.length >= 10) return digits; // outros formatos — usa como está
  return null;
}

async function checkCooldown(supabase: any, logId: string, clientId: string, since: string): Promise<boolean> {
  const { data } = await supabase
    .from("automation_alert_log")
    .select("sent_at")
    .eq("automation_id", logId)
    .eq("client_id", clientId)
    .gte("sent_at", since)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function sendWhatsApp(url: string, instance: string, key: string, number: string, text: string) {
  await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "apikey": key, "Content-Type": "application/json" },
    body: JSON.stringify({ number, text }),
  });
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("pt-BR");
}
