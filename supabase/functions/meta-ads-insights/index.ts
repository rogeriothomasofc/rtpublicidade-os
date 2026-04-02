import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateSummary(
  insights: Record<string, unknown>,
  resultLabel: string,
  resultValue: number,
  costPerResult: number,
  period: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const userMessage = `Analise estas métricas de Meta Ads dos últimos ${period === "30d" ? "30" : "7"} dias e gere um resumo executivo em 2 frases curtas em português. Seja direto e destaque o ponto mais relevante (positivo ou negativo). Não use markdown.

Métricas:
- Investimento: R$ ${Number(insights.spend || 0).toFixed(2)}
- Impressões: ${Number(insights.impressions || 0).toLocaleString("pt-BR")}
- Cliques: ${Number(insights.clicks || 0).toLocaleString("pt-BR")}
- CTR: ${Number(insights.ctr || 0).toFixed(2)}%
- CPC: R$ ${Number(insights.cpc || 0).toFixed(2)}
- Alcance: ${Number(insights.reach || 0).toLocaleString("pt-BR")}
- Resultado (${resultLabel}): ${resultValue}
- Custo por resultado: ${costPerResult > 0 ? `R$ ${costPerResult.toFixed(2)}` : "sem resultados"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 150 },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      account_id?: string;
      client_id?: string;
      period?: string;
      // Summary-only mode: skip Meta API, just regenerate summary
      summary_only?: boolean;
      insights?: Record<string, unknown>;
      result_label?: string;
      result_value?: number;
      cost_per_result?: number;
    };

    const { period = "7d" } = body;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Summary-only mode — no Meta API call needed
    if (body.summary_only && body.insights) {
      const summary = GEMINI_API_KEY
        ? await generateSummary(
            body.insights,
            body.result_label || "Resultado",
            body.result_value || 0,
            body.cost_per_result || 0,
            period,
            GEMINI_API_KEY,
          )
        : null;

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full mode — fetch from Meta API
    let accountId = body.account_id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!accountId && body.client_id) {
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("meta_ads_account")
        .eq("id", body.client_id)
        .single();

      accountId = client?.meta_ads_account || null;
    }

    if (!accountId) {
      return new Response(JSON.stringify({ error: "Conta Meta Ads não configurada para este cliente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config, status")
      .eq("provider", "meta_ads")
      .single();

    if (!integration || integration.status !== "connected") {
      return new Response(JSON.stringify({ error: "Meta Ads não configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = integration.config as Record<string, unknown>;
    const accessToken = config?.access_token as string;

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Access token não encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedAccountId = accountId.replace(/^act_/, "");
    const datePreset = period === "30d" ? "last_30d" : "last_7d";
    const fields = "spend,impressions,clicks,reach,ctr,cpc,actions";

    const url = `https://graph.facebook.com/v19.0/act_${normalizedAccountId}/insights?fields=${encodeURIComponent(fields)}&date_preset=${datePreset}&access_token=${accessToken}`;

    const metaRes = await fetch(url);
    const metaData = await metaRes.json();

    if (metaData.error) {
      console.error("Meta API error:", metaData.error);
      return new Response(
        JSON.stringify({ error: metaData.error.message || "Erro ao buscar dados do Meta Ads" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const insights = metaData.data?.[0] || null;

    // Generate initial summary with "Conversas iniciadas" as default result
    let summary: string | null = null;
    if (insights && GEMINI_API_KEY) {
      const defaultResultTypes = [
        "onsite_conversion.messaging_conversation_started_7d",
        "onsite_conversion.messaging_first_reply",
      ];
      const actions = insights.actions as { action_type: string; value: string }[] || [];
      let defaultResultValue = 0;
      for (const type of defaultResultTypes) {
        const found = actions.find((a) => a.action_type === type);
        if (found) { defaultResultValue = Number(found.value || 0); break; }
      }
      const spend = Number(insights.spend || 0);
      const costPerResult = defaultResultValue > 0 ? spend / defaultResultValue : 0;

      summary = await generateSummary(
        insights,
        "Conversas iniciadas",
        defaultResultValue,
        costPerResult,
        period,
        GEMINI_API_KEY,
      );
    }

    return new Response(JSON.stringify({ insights, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meta ads insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
