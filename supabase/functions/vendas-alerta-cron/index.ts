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
  const PORTAL_LINK = "https://agencia.rtpublicidade.com/";

  const results: unknown[] = [];

  try {
    // 0. Lê configuração da automação
    const { data: config } = await supabase
      .from("automation_configs")
      .select("enabled, threshold_days, cooldown_days")
      .eq("id", "vendas-alert")
      .single();

    if (config && !config.enabled) {
      return new Response(JSON.stringify({ message: "Automação desativada." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const THRESHOLD = config?.threshold_days ?? 5;
    const COOLDOWN = config?.cooldown_days ?? THRESHOLD;

    // 1. Busca clientes ativos com whatsapp configurado
    const { data: clients, error: clientErr } = await supabase
      .from("clients")
      .select("id, name, company, whatsapp_group_id")
      .eq("status", "Ativo")
      .not("whatsapp_group_id", "is", null);

    if (clientErr) throw clientErr;
    if (!clients?.length) {
      return new Response(JSON.stringify({ message: "Nenhum cliente ativo." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const client of clients) {
      try {
        // 2. Busca última venda via RPC
        const { data: saleData, error: saleErr } = await supabase
          .rpc("get_client_last_sale", { p_client_id: client.id });

        if (saleErr) throw saleErr;

        const ultimaVenda = saleData?.[0]?.created_at ?? null;
        let daysSinceLastSale: number;
        let lastSaleDate: string | null = null;

        if (!ultimaVenda) {
          daysSinceLastSale = 999;
        } else {
          const lastDate = new Date(ultimaVenda);
          const today = new Date();
          daysSinceLastSale = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          lastSaleDate = lastDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        }

        if (daysSinceLastSale < THRESHOLD) {
          results.push({ client: client.name, skipped: true, reason: `${daysSinceLastSale} dias — ok` });
          continue;
        }

        // 3. Verifica cooldown: já foi alertado nos últimos COOLDOWN dias?
        const cooldownSince = new Date(Date.now() - COOLDOWN * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentLog } = await supabase
          .from("automation_alert_log")
          .select("sent_at")
          .eq("automation_id", "vendas-alert")
          .eq("client_id", client.id)
          .gte("sent_at", cooldownSince)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentLog) {
          const daysSince = Math.floor((Date.now() - new Date(recentLog.sent_at).getTime()) / (1000 * 60 * 60 * 24));
          results.push({ client: client.name, skipped: true, reason: `cooldown — alertado há ${daysSince} dias` });
          continue;
        }

        const neverRegistered = !ultimaVenda;

        // 4. Gera mensagem com Claude
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            messages: [{
              role: "user",
              content: `Você é um assistente da agência RT Publicidade.\n\nCliente: ${client.name}\nEmpresa: ${client.company || client.name}\n${neverRegistered ? "Situação: nunca registrou uma venda no portal." : `Última venda registrada: ${lastSaleDate} (${daysSinceLastSale} dias atrás)`}\n\nEscreva apenas o corpo da mensagem (2 a 3 frases), amigável e motivadora, lembrando o cliente de registrar suas vendas. Mencione que os dados são importantes para o relatório de desempenho. NÃO inclua saudação, NÃO inclua link, NÃO inclua assinatura. Responda APENAS com o texto do corpo.`,
            }],
          }),
        });
        const claudeData = await claudeRes.json();
        const claudeMsg = claudeData.content?.[0]?.text?.trim() ?? "";

        const ultimaVendaInfo = neverRegistered
          ? "Você ainda não possui nenhuma venda registrada no painel."
          : `Último registro de venda no painel: *${lastSaleDate}* (${daysSinceLastSale} dias atrás).`;

        const whatsappMsg = `🛒 *Olá, ${client.name}!*\n\n${ultimaVendaInfo}\n\n${claudeMsg}\n\n👉 *Acesse o painel e registre suas vendas:*\n${PORTAL_LINK}\n\n_RT Publicidade_`;
        const portalTitle = neverRegistered
          ? "🛒 Você ainda não possui vendas registradas no painel"
          : `🛒 Último registro de venda: ${lastSaleDate} (${daysSinceLastSale} dias atrás)`;
        const portalMsg = `${ultimaVendaInfo}\n\n${claudeMsg}\n\nMantenha seus dados atualizados para que seu relatório de desempenho fique completo! 📊`;

        // 5. Cria aviso no portal
        await supabase.from("portal_announcements").insert({
          title: portalTitle,
          message: portalMsg,
          client_id: client.id,
          is_global: false,
          is_read: false,
        });

        // 6. Envia WhatsApp
        await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
          method: "POST",
          headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ number: client.whatsapp_group_id, text: whatsappMsg }),
        });

        // 7. Registra no log de alertas (controle de cooldown)
        await supabase.from("automation_alert_log").insert({
          automation_id: "vendas-alert",
          client_id: client.id,
        });

        results.push({ client: client.name, sent: true, days: daysSinceLastSale });
      } catch (err) {
        results.push({ client: client.name, error: String(err) });
      }
    }

    // 8. Atualiza last_run na config
    await supabase.from("automation_configs").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "success",
      last_run_summary: { processed: results.length, results },
    }).eq("id", "vendas-alert");

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase.from("automation_configs").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "error",
      last_run_summary: { error: String(err) },
    }).eq("id", "vendas-alert").catch(() => {});

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
