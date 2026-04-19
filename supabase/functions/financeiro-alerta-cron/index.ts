import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const AUTOMATION_ID = "financeiro-alert";

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

    const THRESHOLD = config?.threshold_days ?? 0; // dias de tolerância após vencimento
    const COOLDOWN = config?.cooldown_days ?? 3;   // não repete alerta em X dias

    // 1. Busca todos os registros de Receita pendentes/atrasados cujo vencimento já passou
    const today = new Date();
    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() - THRESHOLD);
    const thresholdStr = thresholdDate.toISOString().split("T")[0];

    const { data: overdueFinances, error: finErr } = await supabase
      .from("finance")
      .select(`
        id, description, amount, due_date, status,
        clients (id, name, company, whatsapp_group_id)
      `)
      .eq("type", "Receita")
      .in("status", ["Pendente", "Atrasado"])
      .lte("due_date", thresholdStr)
      .not("clients", "is", null);

    if (finErr) throw finErr;
    if (!overdueFinances?.length) {
      await logRun(supabase, "success", 0, [{ message: "Sem receitas pendentes/atrasadas." }]);
      return new Response(JSON.stringify({ message: "Nenhuma cobrança pendente.", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Agrupa por cliente (pode ter mais de uma cobrança)
    const byClient = new Map<string, { client: any; records: any[] }>();
    for (const f of overdueFinances) {
      const client = (f as any).clients;
      if (!client?.whatsapp_group_id) continue;
      if (!byClient.has(client.id)) byClient.set(client.id, { client, records: [] });
      byClient.get(client.id)!.records.push(f);
    }

    if (!byClient.size) {
      await logRun(supabase, "success", 0, [{ message: "Clientes sem WhatsApp configurado." }]);
      return new Response(JSON.stringify({ message: "Nenhum cliente com WhatsApp.", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Para cada cliente, verifica cooldown e envia alerta
    const cooldownSinceDate = new Date(Date.now() - COOLDOWN * 24 * 60 * 60 * 1000).toISOString();

    for (const [, { client, records }] of byClient) {
      try {
        // Verifica cooldown
        const { data: recentLog } = await supabase
          .from("automation_alert_log")
          .select("sent_at")
          .eq("automation_id", AUTOMATION_ID)
          .eq("client_id", client.id)
          .gte("sent_at", cooldownSinceDate)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentLog) {
          const daysSince = Math.floor((Date.now() - new Date(recentLog.sent_at).getTime()) / 86400000);
          results.push({ client: client.name, skipped: true, reason: `cooldown — alertado há ${daysSince} dia(s)` });
          continue;
        }

        // Monta mensagem
        const total = records.reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalFmt = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        const itemLines = records.map((r: any) => {
          const due = new Date(r.due_date + "T12:00:00Z").toLocaleDateString("pt-BR");
          const amt = Number(r.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const label = r.description || "Fee mensal";
          const daysLate = Math.floor((today.getTime() - new Date(r.due_date + "T12:00:00Z").getTime()) / 86400000);
          const lateNote = daysLate > 0 ? ` _(${daysLate} dia${daysLate > 1 ? "s" : ""} em atraso)_` : "";
          return `• ${label}: *${amt}* — venceu em ${due}${lateNote}`;
        });

        const whatsappMsg = [
          `💰 *Olá, ${client.company || client.name}!*`,
          ``,
          `Identificamos ${records.length === 1 ? "uma cobrança pendente" : `${records.length} cobranças pendentes"} em aberto:`,
          ``,
          ...itemLines,
          ``,
          `*Total: ${totalFmt}*`,
          ``,
          `Por favor, entre em contato para regularizarmos. 🙏`,
          `_RT Publicidade_`,
        ].join("\n");

        // Envia WhatsApp
        await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
          method: "POST",
          headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ number: client.whatsapp_group_id, text: whatsappMsg }),
        });

        // Registra cooldown
        await supabase.from("automation_alert_log").insert({
          automation_id: AUTOMATION_ID,
          client_id: client.id,
        });

        results.push({ client: client.name, sent: true, records: records.length, total: totalFmt });
      } catch (err) {
        results.push({ client: client.name, error: String(err) });
      }
    }

    // 4. Atualiza automation_configs + grava histórico
    const runAt = new Date().toISOString();
    await supabase.from("automation_configs").update({
      last_run_at: runAt,
      last_run_status: "success",
      last_run_summary: { processed: results.length, results },
    }).eq("id", AUTOMATION_ID);

    await logRun(supabase, "success", results.length, results);

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const runAt = new Date().toISOString();
    await supabase.from("automation_configs").update({
      last_run_at: runAt,
      last_run_status: "error",
      last_run_summary: { error: String(err) },
    }).eq("id", AUTOMATION_ID).catch(() => {});

    await logRun(supabase, "error", 0, [{ error: String(err) }]).catch(() => {});

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logRun(supabase: any, status: "success" | "error", processed: number, summary: unknown[]) {
  await supabase.from("automation_run_log").insert({
    automation_id: AUTOMATION_ID,
    status,
    processed,
    summary,
  });
}
