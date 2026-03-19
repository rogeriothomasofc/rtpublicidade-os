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

    const { account_id, period } = await req.json() as { account_id: string; period?: string };

    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read Meta access token from integrations table using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // Normalize account ID
    const normalizedAccountId = account_id.replace(/^act_/, "");
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

    return new Response(JSON.stringify({ insights }), {
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
