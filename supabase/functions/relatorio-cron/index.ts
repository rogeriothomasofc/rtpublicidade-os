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
        const introText: string = cfg.intro_text?.trim() ?? "";

        const sections: string[] = [];
        const metricsForAI: string[] = [];

        // --- Campanhas via Meta Ads API ---
        const resultTypes: Record<string, string[]> = {
          "Leads": ["lead", "onsite_conversion.lead_grouped"],
          "Conversas iniciadas": ["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"],
          "Compras": ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"],
          "Cadastros": ["complete_registration", "offsite_conversion.fb_pixel_complete_registration"],
          "Cliques no link": ["link_click"],
        };
        const resultLabel: string = cfg.result_type ?? "Conversas iniciadas";
        const resultActionTypes: string[] = resultTypes[resultLabel] ?? resultTypes["Conversas iniciadas"];

        if (cfg.include_campaigns && client.meta_ads_account && metaToken) {
          const metaData = await fetchMetaMetrics(client.meta_ads_account, metaToken, dateFrom, dateTo, resultActionTypes);
          if (metaData) {
            const spend = formatBRL(metaData.spend);
            const clicks = metaData.clicks.toLocaleString("pt-BR");
            const results = metaData.results;
            const cpc = metaData.clicks > 0 ? formatBRL(metaData.spend / metaData.clicks) : "-";
            const cpr = results > 0 ? formatBRL(metaData.spend / results) : "-";

            sections.push(
              `📣 *Meta Ads*\nInvestido: ${spend}\n${resultLabel}: ${results} | Custo por ${resultLabel.toLowerCase()}: ${cpr}\nCliques: ${clicks} | Custo por clique: ${cpc}`
            );
            metricsForAI.push(`Meta Ads: investimento ${spend}, ${results} ${resultLabel.toLowerCase()}, custo por resultado ${cpr}, ${clicks} cliques, CPC ${cpc}`);

            // Melhores criativos com link
            if (cfg.top_creatives > 0 && metaData.creatives?.length) {
              const top = metaData.creatives.slice(0, cfg.top_creatives);
              const lines = top.map((c: any, i: number) => {
                const num = i + 1;
                const res = c.results ?? 0;
                const cprC = res > 0 ? `R$ ${(c.spend / res).toFixed(2)}` : "-";
                const linkLine = c.post_url ? `\n${c.post_url}` : "";
                return `${num}. ${c.name}${linkLine}\n   ${resultLabel}: ${res} | Custo/${resultLabel.toLowerCase().slice(0, 3)}: ${cprC}`;
              });
              sections.push(`🏆 *Melhores criativos*\n${lines.join("\n\n")}`);
              metricsForAI.push(`Melhores criativos: ${top.map((c: any) => `"${c.name}" (${c.results ?? 0} ${resultLabel.toLowerCase()})`).join(", ")}`);
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
          const count = Number(salesData?.[0]?.count ?? 0);
          const total = Number(salesData?.[0]?.total ?? 0);
          const totalFmt = formatBRL(total);
          const ticket = count > 0 ? formatBRL(total / count) : formatBRL(0);
          sections.push(`🛒 *Vendas registradas*\nReceita: ${totalFmt}\nVendas: ${count}\nTicket Médio: ${ticket}`);
          metricsForAI.push(`Vendas: ${count} registradas, receita total ${totalFmt}, ticket médio ${ticket}`);
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
        const companyName = client.company || client.name;
        const defaultIntro = `Segue o resumo de performance da *${companyName}* — ${periodLabel}`;
        const introPart = introText || defaultIntro;
        const header = `${introPart}\n\n📅 Período: ${formatDateRange(dateFrom, dateTo)}`;
        const body = sections.join("\n\n");
        const whatsappMsg = `${header}\n\n${body}${aiBlock}\n\n_RT Publicidade_`;

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

    // Atualiza last_run na automation_configs + grava histórico
    await supabase.from("automation_configs").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "success",
      last_run_summary: { processed: results.length, results },
    }).eq("id", "relatorio");

    await supabase.from("automation_run_log").insert({
      automation_id: "relatorio", status: "success",
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
    }).eq("id", "relatorio").catch(() => {});

    await supabase.from("automation_run_log").insert({
      automation_id: "relatorio", status: "error",
      processed: 0, summary: [{ error: String(err) }],
    }).catch(() => {});

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

  const period: string = cfg.period ?? "7d";

  if (period === "7d") {
    from = new Date(to);
    from.setDate(from.getDate() - 7);
  } else if (period === "30d") {
    from = new Date(to);
    from.setDate(from.getDate() - 30);
  } else if (period === "current_month") {
    from = new Date(to.getFullYear(), to.getMonth(), 1);
  } else {
    // last_month
    from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
    to = new Date(to.getFullYear(), to.getMonth(), 0);
  }

  return {
    dateFrom: from.toISOString().split("T")[0],
    dateTo: to.toISOString().split("T")[0],
  };
}

function getPeriodLabel(cfg: any): string {
  const period: string = cfg.period ?? "7d";
  if (period === "7d") return "Últimos 7 Dias";
  if (period === "30d") return "Últimos 30 Dias";
  if (period === "current_month") return "Mensal";
  return "Mês Anterior";
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

async function fetchMetaMetrics(accountId: string, token: string, dateFrom: string, dateTo: string, resultActionTypes: string[]) {
  const acc = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }));

  // Totais da conta
  const url = `https://graph.facebook.com/v19.0/${acc}/insights?fields=spend,clicks,impressions,actions&time_range=${timeRange}&access_token=${token}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) return null;

  const d = json.data?.[0];
  if (!d) return null;

  const results = (d.actions ?? [])
    .filter((a: any) => resultActionTypes.includes(a.action_type))
    .reduce((s: number, a: any) => s + Number(a.value), 0);

  // Criativos no nível de anúncio com effective_object_story_id para montar link do post
  const creativeFields = encodeURIComponent("ad_name,ad_id,spend,actions,effective_object_story_id");
  const creativeUrl = `https://graph.facebook.com/v19.0/${acc}/insights?fields=${creativeFields}&time_range=${timeRange}&level=ad&sort=${encodeURIComponent('["spend_descending"]')}&limit=10&access_token=${token}`;
  const creativeRes = await fetch(creativeUrl);
  const creativeJson = await creativeRes.json();

  const creatives = (creativeJson.data ?? []).map((ad: any) => {
    const adResults = (ad.actions ?? [])
      .filter((a: any) => resultActionTypes.includes(a.action_type))
      .reduce((s: number, a: any) => s + Number(a.value), 0);

    // effective_object_story_id format: "pageId_postId"
    let post_url: string | null = null;
    const storyId: string = ad.effective_object_story_id ?? "";
    if (storyId.includes("_")) {
      const [pageId, postId] = storyId.split("_");
      post_url = `https://www.facebook.com/${pageId}/posts/${postId}`;
    }

    return {
      name: ad.ad_name,
      spend: Number(ad.spend ?? 0),
      results: adResults,
      post_url,
    };
  }).sort((a: any, b: any) => b.results - a.results);

  return {
    spend: Number(d.spend ?? 0),
    clicks: Number(d.clicks ?? 0),
    impressions: Number(d.impressions ?? 0),
    results,
    creatives,
  };
}
