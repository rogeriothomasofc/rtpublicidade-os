import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v19.0";

// ─── helpers ────────────────────────────────────────────────
async function getMetaToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await supabase
    .from("integrations")
    .select("config, status")
    .eq("provider", "meta_ads")
    .single();

  if (error || !data || data.status !== "connected") {
    throw new Error("Meta Ads não configurado ou desconectado");
  }

  const token = (data.config as Record<string, unknown>)?.access_token as string;
  if (!token) throw new Error("Access token não encontrado");
  return token;
}

async function getClientAccountId(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("clients")
    .select("meta_ads_account")
    .eq("id", clientId)
    .single();

  if (error || !data?.meta_ads_account) {
    throw new Error("Conta Meta Ads não configurada para este cliente");
  }
  return data.meta_ads_account.replace(/^act_/, "");
}

function metaError(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── CAMPAIGN ───────────────────────────────────────────────
async function createCampaign(
  supabase: ReturnType<typeof createClient>,
  token: string,
  accountId: string,
  payload: Record<string, unknown>,
) {
  const body = new URLSearchParams({
    name: payload.name as string,
    objective: payload.objective as string,
    status: "PAUSED",
    buying_type: (payload.buying_type as string) || "AUCTION",
    special_ad_categories: JSON.stringify(payload.special_ad_categories || []),
    access_token: token,
  });

  if (payload.budget_type === "daily" && payload.budget_value) {
    body.set("daily_budget", String(Math.round(Number(payload.budget_value) * 100)));
  } else if (payload.budget_type === "lifetime" && payload.budget_value) {
    body.set("lifetime_budget", String(Math.round(Number(payload.budget_value) * 100)));
  }

  const res = await fetch(`${META_API}/act_${accountId}/campaigns`, {
    method: "POST",
    body,
  });
  const metaData = await res.json();
  if (metaData.error) throw new Error(metaData.error.message);

  // salva localmente
  const { data, error } = await supabase
    .from("meta_campaigns")
    .update({ meta_id: metaData.id, meta_status: "PAUSED", local_status: "Enviado" })
    .eq("id", payload.local_id as string)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateCampaignStatus(
  token: string,
  metaId: string,
  status: "ACTIVE" | "PAUSED" | "ARCHIVED",
) {
  const body = new URLSearchParams({ status, access_token: token });
  const res = await fetch(`${META_API}/${metaId}`, { method: "POST", body });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// ─── ADSET ──────────────────────────────────────────────────
async function createAdSet(
  supabase: ReturnType<typeof createClient>,
  token: string,
  accountId: string,
  payload: Record<string, unknown>,
) {
  const metaCampaignId = payload.meta_campaign_id as string;
  if (!metaCampaignId) throw new Error("campaign_id no Meta não encontrado. Envie a campanha primeiro.");

  const body = new URLSearchParams({
    name: payload.name as string,
    campaign_id: metaCampaignId,
    optimization_goal: (payload.optimization_goal as string) || "LINK_CLICKS",
    billing_event: (payload.billing_event as string) || "IMPRESSIONS",
    status: "PAUSED",
    targeting: JSON.stringify(payload.targeting || {}),
    access_token: token,
  });

  if (payload.budget_type === "daily" && payload.budget_value) {
    body.set("daily_budget", String(Math.round(Number(payload.budget_value) * 100)));
  } else if (payload.budget_type === "lifetime" && payload.budget_value) {
    body.set("lifetime_budget", String(Math.round(Number(payload.budget_value) * 100)));
  }

  if (payload.bid_amount) {
    body.set("bid_amount", String(Math.round(Number(payload.bid_amount) * 100)));
  }

  if (payload.start_time) body.set("start_time", payload.start_time as string);
  if (payload.end_time) body.set("end_time", payload.end_time as string);

  const res = await fetch(`${META_API}/act_${accountId}/adsets`, {
    method: "POST",
    body,
  });
  const metaData = await res.json();
  if (metaData.error) throw new Error(metaData.error.message);

  const { data, error } = await supabase
    .from("meta_adsets")
    .update({ meta_id: metaData.id, meta_status: "PAUSED", local_status: "Enviado" })
    .eq("id", payload.local_id as string)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── AD ─────────────────────────────────────────────────────
async function createAd(
  supabase: ReturnType<typeof createClient>,
  token: string,
  accountId: string,
  payload: Record<string, unknown>,
) {
  const metaAdSetId = payload.meta_adset_id as string;
  if (!metaAdSetId) throw new Error("adset_id no Meta não encontrado. Envie o conjunto primeiro.");

  // 1. criar criativo
  const creativeBody = new URLSearchParams({ access_token: token });

  const objectStorySpec: Record<string, unknown> = {
    page_id: payload.page_id as string,
  };

  if (payload.format === "IMAGE") {
    objectStorySpec.link_data = {
      image_url: payload.image_url,
      link: payload.link_url,
      message: payload.body,
      name: payload.headline,
      description: payload.description,
      call_to_action: { type: payload.cta_type || "LEARN_MORE", value: { link: payload.link_url } },
    };
  } else if (payload.format === "VIDEO") {
    objectStorySpec.video_data = {
      video_id: payload.video_id,
      message: payload.body,
      title: payload.headline,
      call_to_action: { type: payload.cta_type || "LEARN_MORE", value: { link: payload.link_url } },
    };
  } else if (payload.format === "CAROUSEL") {
    objectStorySpec.link_data = {
      link: payload.link_url,
      message: payload.body,
      child_attachments: payload.carousel_cards,
      call_to_action: { type: payload.cta_type || "LEARN_MORE" },
    };
  }

  creativeBody.set("name", `Creative - ${payload.name}`);
  creativeBody.set("object_story_spec", JSON.stringify(objectStorySpec));

  const creativeRes = await fetch(`${META_API}/act_${accountId}/adcreatives`, {
    method: "POST",
    body: creativeBody,
  });
  const creativeData = await creativeRes.json();
  if (creativeData.error) throw new Error(`Erro no criativo: ${creativeData.error.message}`);

  // 2. criar anúncio
  const adBody = new URLSearchParams({
    name: payload.name as string,
    adset_id: metaAdSetId,
    creative: JSON.stringify({ creative_id: creativeData.id }),
    status: "PAUSED",
    access_token: token,
  });

  const adRes = await fetch(`${META_API}/act_${accountId}/ads`, {
    method: "POST",
    body: adBody,
  });
  const adData = await adRes.json();
  if (adData.error) throw new Error(adData.error.message);

  const { data, error } = await supabase
    .from("meta_ads")
    .update({
      meta_id: adData.id,
      meta_creative_id: creativeData.id,
      meta_status: "PAUSED",
      local_status: "Enviado",
    })
    .eq("id", payload.local_id as string)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── MAIN ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return metaError("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return metaError("Invalid token", 401);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json() as Record<string, unknown>;

    const token = await getMetaToken(supabase);

    // ── LIST campaigns ──────────────────────────────────────
    if (action === "list" || req.method === "GET") {
      const clientId = url.searchParams.get("client_id") || (body.client_id as string);
      let query = supabase
        .from("meta_campaigns")
        .select(`
          *,
          client:clients(id, name),
          adsets:meta_adsets(
            *,
            ads:meta_ads(*)
          )
        `)
        .order("created_at", { ascending: false });

      if (clientId) query = query.eq("client_id", clientId);

      const { data, error } = await query;
      if (error) throw error;
      return ok({ campaigns: data });
    }

    // ── CREATE local campaign ───────────────────────────────
    if (action === "create-campaign") {
      const { data, error } = await supabase
        .from("meta_campaigns")
        .insert({
          client_id: body.client_id,
          name: body.name,
          objective: body.objective,
          budget_type: body.budget_type || "daily",
          budget_value: body.budget_value,
          start_time: body.start_time,
          end_time: body.end_time,
          buying_type: body.buying_type || "AUCTION",
          special_ad_categories: body.special_ad_categories || [],
          notes: body.notes,
          created_by: user.id,
          local_status: "Rascunho",
        })
        .select()
        .single();

      if (error) throw error;
      return ok({ campaign: data });
    }

    // ── SEND campaign to Meta ───────────────────────────────
    if (action === "send-campaign") {
      const accountId = await getClientAccountId(supabase, body.client_id as string);
      const result = await createCampaign(supabase, token, accountId, body);
      return ok({ campaign: result });
    }

    // ── CREATE local adset ──────────────────────────────────
    if (action === "create-adset") {
      const { data, error } = await supabase
        .from("meta_adsets")
        .insert({
          campaign_id: body.campaign_id,
          name: body.name,
          budget_type: body.budget_type,
          budget_value: body.budget_value,
          optimization_goal: body.optimization_goal || "LINK_CLICKS",
          billing_event: body.billing_event || "IMPRESSIONS",
          bid_amount: body.bid_amount,
          targeting: body.targeting || {},
          placement_type: body.placement_type || "AUTOMATIC",
          placements: body.placements || {},
          start_time: body.start_time,
          end_time: body.end_time,
          notes: body.notes,
          local_status: "Rascunho",
        })
        .select()
        .single();

      if (error) throw error;
      return ok({ adset: data });
    }

    // ── SEND adset to Meta ──────────────────────────────────
    if (action === "send-adset") {
      // busca meta_campaign_id
      const { data: campaign } = await supabase
        .from("meta_campaigns")
        .select("meta_id, client_id")
        .eq("id", body.campaign_id as string)
        .single();

      if (!campaign?.meta_id) return metaError("Envie a campanha ao Meta antes do conjunto");

      const accountId = await getClientAccountId(supabase, campaign.client_id);
      const result = await createAdSet(supabase, token, accountId, {
        ...body,
        meta_campaign_id: campaign.meta_id,
      });
      return ok({ adset: result });
    }

    // ── CREATE local ad ─────────────────────────────────────
    if (action === "create-ad") {
      const { data, error } = await supabase
        .from("meta_ads")
        .insert({
          adset_id: body.adset_id,
          name: body.name,
          format: body.format || "IMAGE",
          headline: body.headline,
          body: body.body,
          description: body.description,
          cta_type: body.cta_type || "LEARN_MORE",
          image_url: body.image_url,
          video_url: body.video_url,
          link_url: body.link_url,
          display_url: body.display_url,
          carousel_cards: body.carousel_cards || [],
          notes: body.notes,
          local_status: "Rascunho",
        })
        .select()
        .single();

      if (error) throw error;
      return ok({ ad: data });
    }

    // ── SEND ad to Meta ─────────────────────────────────────
    if (action === "send-ad") {
      // busca meta_adset_id e client_id via cadeia
      const { data: adset } = await supabase
        .from("meta_adsets")
        .select("meta_id, campaign:meta_campaigns(client_id)")
        .eq("id", body.adset_id as string)
        .single();

      if (!adset?.meta_id) return metaError("Envie o conjunto ao Meta antes do anúncio");

      const clientId = (adset.campaign as Record<string, unknown>)?.client_id as string;
      const accountId = await getClientAccountId(supabase, clientId);

      const result = await createAd(supabase, token, accountId, {
        ...body,
        meta_adset_id: adset.meta_id,
      });
      return ok({ ad: result });
    }

    // ── TOGGLE status ───────────────────────────────────────
    if (action === "toggle-status") {
      const { type, meta_id, new_status, local_id } = body as {
        type: "campaign" | "adset" | "ad";
        meta_id: string;
        new_status: "ACTIVE" | "PAUSED" | "ARCHIVED";
        local_id: string;
      };

      if (!meta_id) return metaError("Objeto não enviado ao Meta ainda");

      await updateCampaignStatus(token, meta_id, new_status);

      const table =
        type === "campaign" ? "meta_campaigns" : type === "adset" ? "meta_adsets" : "meta_ads";

      const localStatus =
        new_status === "ACTIVE" ? "Publicado" :
        new_status === "PAUSED" ? "Pausado" : "Arquivado";

      const { data, error } = await supabase
        .from(table)
        .update({ meta_status: new_status, local_status: localStatus })
        .eq("id", local_id)
        .select()
        .single();

      if (error) throw error;
      return ok({ updated: data });
    }

    // ── UPDATE local ────────────────────────────────────────
    if (action === "update-campaign") {
      const { id, ...fields } = body;
      const { data, error } = await supabase
        .from("meta_campaigns")
        .update(fields)
        .eq("id", id as string)
        .select()
        .single();
      if (error) throw error;
      return ok({ campaign: data });
    }

    if (action === "update-adset") {
      const { id, ...fields } = body;
      const { data, error } = await supabase
        .from("meta_adsets")
        .update(fields)
        .eq("id", id as string)
        .select()
        .single();
      if (error) throw error;
      return ok({ adset: data });
    }

    if (action === "update-ad") {
      const { id, ...fields } = body;
      const { data, error } = await supabase
        .from("meta_ads")
        .update(fields)
        .eq("id", id as string)
        .select()
        .single();
      if (error) throw error;
      return ok({ ad: data });
    }

    // ── DELETE ──────────────────────────────────────────────
    if (action === "delete-campaign") {
      const { data: camp } = await supabase
        .from("meta_campaigns")
        .select("meta_id")
        .eq("id", body.id as string)
        .single();

      if (camp?.meta_id) {
        // arquiva no Meta antes de deletar localmente
        try {
          await updateCampaignStatus(token, camp.meta_id, "ARCHIVED");
        } catch (_) { /* ignora se já arquivado */ }
      }

      const { error } = await supabase
        .from("meta_campaigns")
        .delete()
        .eq("id", body.id as string);

      if (error) throw error;
      return ok({ deleted: true });
    }

    return metaError("Ação não reconhecida", 404);
  } catch (err) {
    console.error("meta-campaigns-manager error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
