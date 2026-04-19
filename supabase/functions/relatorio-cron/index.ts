import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

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
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
  const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") ?? "";

  const results: unknown[] = [];

  try {
    // 0. Verifica se automação está ativa globalmente
    const { data: globalConfig } = await supabase
      .from("automation_configs")
      .select("enabled")
      .eq("id", "relatorio")
      .single();

    if (globalConfig && !globalConfig.enabled) {
      return new Response(JSON.stringify({ message: "Automação de relatório desativada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Busca clientes que precisam receber relatório agora (next_send_at <= now)
    const now = new Date().toISOString();
    const { data: configs, error: configErr } = await (supabase as any)
      .from("client_report_configs")
      .select(`
        *,
        clients (id, name, company, whatsapp_group_id, meta_ads_account)
      `)
      .eq("enabled", true)
      .lte("next_send_at", now)
      .not("next_send_at", "is", null);

    if (configErr) throw configErr;
    if (!configs?.length) {
      return new Response(JSON.stringify({ message: "Nenhum relatório pendente.", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Token Meta Ads (global da agência)
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("provider", "meta_ads")
      .eq("status", "connected")
      .maybeSingle();

    const metaToken: string = (integration?.config as any)?.access_token ?? "";

    for (const cfg of configs) {
      const client = cfg.clients;
      if (!client?.whatsapp_group_id) {
        results.push({ client: cfg.client_id, skipped: true, reason: "sem whatsapp_group_id" });
        await advanceNextSend(supabase, cfg);
        continue;
      }

      try {
        const periodLabel = getPeriodLabel(cfg);
        const { dateFrom, dateTo } = getPeriodDates(cfg);

        const sections: string[] = [];
        const metricsForAI: string[] = [];

        // --- Campanhas via Meta Ads API ---
        if (cfg.include_campaigns && client.meta_ads_account && metaToken) {
          const metaData = await fetchMetaMetrics(client.meta_ads_account, metaToken, dateFrom, dateTo);
          if (metaData) {
            const spend = formatBRL(metaData.spend);
            const clicks = metaData.clicks.toLocaleString("pt-BR");
            const conversions = metaData.conversions;
            const cpc = metaData.clicks > 0 ? formatBRL(metaData.spend / metaData.clicks) : "-";
            const cpa = conversions > 0 ? formatBRL(metaData.spend / conversions) : "-";

            sections.push(
              `📣 *Campanhas*\nInvestido: ${spend}\nCliques: ${clicks} | Conversões: ${conversions}\nCPC: ${cpc} | CPA: ${cpa}`
            );
            metricsForAI.push(`Campanhas: investimento ${spend}, ${clicks} cliques, ${conversions} conversões, CPC ${cpc}, CPA ${cpa}`);

            // Melhores criativos
            if (cfg.top_creatives > 0 && metaData.creatives?.length) {
              const top = metaData.creatives.slice(0, cfg.top_creatives);
              const lines = top.map((c: any, i: number) => {
                const medal = i === 0 ? "1️⃣" : i === 1 ? "2️⃣" : "3️⃣";
                const convs = c.conversions ?? 0;
                const cpaC = convs > 0 ? ` | CPA ${formatBRL(c.spend / convs)}` : "";
                return `${medal} "${c.name}" — ${convs} conv${cpaC}`;
              });
              sections.push(`🏆 *Melhores criativos*\n${lines.join("\n")}`);
              metricsForAI.push(`Melhores criativos: ${top.map((c: any) => `"${c.name}" (${c.conversions ?? 0} conv)`).join(", ")}`);
            }
          }
        }

        // --- Vendas ---
        if (cfg.include_sales) {
          const { data: salesData } = await supabase
            .rpc("get_client_sales_in_period", {
              p_client_id: client.id,
              p_date_from: dateFrom,
              p_date_to: dateTo,
            });
          const count = salesData?.[0]?.count ?? 0;
          const total = salesData?.[0]?.total ?? 0;
          const totalFmt = formatBRL(Number(total));
          sections.push(`🛒 *Vendas registradas*\n${count} venda${count !== 1 ? "s" : ""} — Total: ${totalFmt}`);
          metricsForAI.push(`Vendas: ${count} registradas, total ${totalFmt}`);
        }

        if (!sections.length) {
          results.push({ client: client.name, skipped: true, reason: "sem métricas configuradas" });
          await advanceNextSend(supabase, cfg);
          continue;
        }

        // --- Resumo IA ---
        let aiBlock = "";
        if (cfg.include_ai && metricsForAI.length) {
          const aiContext = cfg.ai_context ? `\nContexto do cliente: ${cfg.ai_context}` : "";
          const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_KEY,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 350,
              messages: [{
                role: "user",
                content: `Você é um consultor de marketing digital da agência RT Publicidade.\n\nCliente: ${client.company || client.name}\nPeríodo: ${periodLabel}${aiContext}\n\nMétricas do período:\n${metricsForAI.join("\n")}\n\nEscreva um resumo executivo de 2 a 3 frases, direto e motivador, destacando o ponto mais relevante dos dados e uma recomendação prática. NÃO inclua saudação, link ou assinatura. Responda APENAS com o texto.`,
              }],
            }),
          });
          const claudeData = await claudeRes.json();
          const aiText = claudeData.content?.[0]?.text?.trim() ?? "";
          if (aiText) aiBlock = `\n🤖 *Análise da RT Publicidade*\n${aiText}`;
        }

        // Monta mensagem
        const header = `📊 *Relatório ${periodLabel}*\n${client.company || client.name}\n📅 ${formatDateRange(dateFrom, dateTo)}\n`;
        const body = sections.join("\n\n");
        const whatsappMsg = `${header}\n${body}${aiBlock}\n\n_RT Publicidade_`;

        // Envia WhatsApp
        await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
          method: "POST",
          headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ number: client.whatsapp_group_id, text: whatsappMsg }),
        });

        // Aviso no portal
        await supabase.from("portal_announcements").insert({
          title: `📊 Relatório ${periodLabel} disponível`,
          message: `${body}${aiBlock ? "\n\n" + aiBlock.replace(/\*/g, "") : ""}`,
          client_id: client.id,
          is_global: false,
          is_read: false,
        });

        // Atualiza last_sent_at e calcula próximo envio
        await advanceNextSend(supabase, cfg);

        results.push({ client: client.name, sent: true, period: periodLabel });
      } catch (err) {
        results.push({ client: client.name, error: String(err) });
        await advanceNextSend(supabase, cfg);
      }
    }

    // Atualiza last_run na automation_configs
    await supabase.from("automation_configs").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "success",
      last_run_summary: { processed: results.length, results },
    }).eq("id", "relatorio");

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("automation_configs").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "error",
      last_run_summary: { error: String(err) },
    }).eq("id", "relatorio").catch(() => {});

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPeriodDates(cfg: any): { dateFrom: string; dateTo: string } {
  const now = new Date();
  let from: Date;
  let to: Date = new Date(now);
  to.setHours(0, 0, 0, 0);

  if (cfg.frequency === "daily") {
    from = new Date(to);
    from.setDate(from.getDate() - 1);
  } else if (cfg.frequency === "weekly") {
    from = new Date(to);
    from.setDate(from.getDate() - 7);
  } else {
    // monthly: mês anterior completo
    from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
    to = new Date(to.getFullYear(), to.getMonth(), 0);
  }

  return {
    dateFrom: from.toISOString().split("T")[0],
    dateTo: to.toISOString().split("T")[0],
  };
}

function getPeriodLabel(cfg: any): string {
  if (cfg.frequency === "daily") return "Diário";
  if (cfg.frequency === "weekly") return "Semanal";
  return "Mensal";
}

function formatDateRange(from: string, to: string): string {
  const f = new Date(from + "T12:00:00Z");
  const t = new Date(to + "T12:00:00Z");
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(f)} a ${fmt(t)}`;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcNextSendAt(cfg: any): string {
  const now = new Date();
  const hour = cfg.send_hour ?? 9;
  let next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(hour);

  if (cfg.frequency === "daily") {
    next.setDate(now.getDate() + 1);
  } else if (cfg.frequency === "weekly") {
    const dow = cfg.day_of_week ?? 1;
    next.setDate(now.getDate() + ((dow - now.getDay() + 7) % 7 || 7));
  } else {
    const dom = cfg.day_of_month ?? 1;
    next = new Date(now.getFullYear(), now.getMonth() + 1, dom, hour, 0, 0, 0);
  }
  return next.toISOString();
}

async function advanceNextSend(supabase: any, cfg: any) {
  const next_send_at = calcNextSendAt(cfg);
  await supabase
    .from("client_report_configs")
    .update({ last_sent_at: new Date().toISOString(), next_send_at })
    .eq("id", cfg.id);
}

async function fetchMetaMetrics(accountId: string, token: string, dateFrom: string, dateTo: string) {
  const acc = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const fields = "spend,clicks,actions,impressions";
  const url = `https://graph.facebook.com/v19.0/${acc}/insights?fields=${fields}&time_range={"since":"${dateFrom}","until":"${dateTo}"}&access_token=${token}`;

  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) return null;

  const d = json.data?.[0];
  if (!d) return null;

  const conversions = (d.actions ?? [])
    .filter((a: any) => ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"].includes(a.action_type))
    .reduce((s: number, a: any) => s + Number(a.value), 0);

  // Busca criativos
  const creativeUrl = `https://graph.facebook.com/v19.0/${acc}/insights?fields=ad_name,spend,actions&time_range={"since":"${dateFrom}","until":"${dateTo}"}&level=ad&sort=["spend_descending"]&limit=10&access_token=${token}`;
  const creativeRes = await fetch(creativeUrl);
  const creativeJson = await creativeRes.json();
  const creatives = (creativeJson.data ?? []).map((ad: any) => ({
    name: ad.ad_name,
    spend: Number(ad.spend ?? 0),
    conversions: (ad.actions ?? [])
      .filter((a: any) => ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"].includes(a.action_type))
      .reduce((s: number, a: any) => s + Number(a.value), 0),
  })).sort((a: any, b: any) => b.conversions - a.conversions);

  return {
    spend: Number(d.spend ?? 0),
    clicks: Number(d.clicks ?? 0),
    impressions: Number(d.impressions ?? 0),
    conversions,
    creatives,
  };
}
