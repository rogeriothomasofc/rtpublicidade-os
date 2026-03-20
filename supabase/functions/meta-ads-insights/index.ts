import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json() as { account_id?: string; client_id?: string; period?: string };
    const { period = "7d" } = body;
    let accountId = body.account_id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If client_id provided, look up meta_ads_account from clients table
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

    // Read Meta access token from integrations table
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

    // Generate AI summary if insights exist
    let summary: string | null = null;
    if (insights) {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (ANTHROPIC_API_KEY) {
        try {
          const leads = insights.actions?.find(
            (a: { action_type: string }) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped"
          )?.value || "0";

          const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 150,
              messages: [{
                role: "user",
                content: `Analise estas métricas de Meta Ads dos últimos ${period === "30d" ? "30" : "7"} dias e gere um resumo executivo em 2 frases curtas em português. Seja direto e destaque o ponto mais relevante (positivo ou negativo).

Métricas:
- Investimento: R$ ${Number(insights.spend || 0).toFixed(2)}
- Impressões: ${Number(insights.impressions || 0).toLocaleString("pt-BR")}
- Cliques: ${Number(insights.clicks || 0).toLocaleString("pt-BR")}
- CTR: ${Number(insights.ctr || 0).toFixed(2)}%
- CPC: R$ ${Number(insights.cpc || 0).toFixed(2)}
- Alcance: ${Number(insights.reach || 0).toLocaleString("pt-BR")}
- Leads: ${leads}`,
              }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            summary = aiData.content?.[0]?.text || null;
          }
        } catch (e) {
          console.error("AI summary error:", e);
        }
      }
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
