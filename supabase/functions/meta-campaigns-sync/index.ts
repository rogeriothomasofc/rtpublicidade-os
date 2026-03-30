import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v19.0";

// Mapeia status do Meta para local
function toLocalStatus(metaStatus: string): string {
  switch (metaStatus) {
    case "ACTIVE":   return "Publicado";
    case "PAUSED":   return "Pausado";
    case "ARCHIVED":
    case "DELETED":  return "Arquivado";
    default:         return "Rascunho";
  }
}

async function fetchMetaStatuses(
  ids: string[],
  token: string,
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};

  // Meta permite buscar múltiplos objetos em batch
  const fields = "id,status,effective_status";
  const url = `${META_API}?ids=${ids.join(",")}&fields=${fields}&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error("Meta batch error:", data.error);
    return {};
  }

  const result: Record<string, string> = {};
  for (const [id, obj] of Object.entries(data as Record<string, Record<string, string>>)) {
    result[id] = obj.effective_status || obj.status || "UNKNOWN";
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Aceita chamada autenticada (do frontend) ou de cron (sem auth, via service role)
    const authHeader = req.headers.get("Authorization");
    const isCron = req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");

    if (!authHeader && !isCron) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (authHeader && !isCron) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { error } = await supabaseAuth.auth.getUser();
      if (error) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca token Meta
    const { data: integration } = await supabase
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

    const token = (integration.config as Record<string, unknown>)?.access_token as string;
    if (!token) throw new Error("Token não encontrado");

    // Busca todos os objetos que já foram enviados ao Meta (tem meta_id)
    // e que não estão Arquivados localmente
    const [campaignsRes, adsetsRes, adsRes] = await Promise.all([
      supabase
        .from("meta_campaigns")
        .select("id, meta_id, meta_status, local_status")
        .not("meta_id", "is", null)
        .not("local_status", "eq", "Arquivado"),
      supabase
        .from("meta_adsets")
        .select("id, meta_id, meta_status, local_status")
        .not("meta_id", "is", null)
        .not("local_status", "eq", "Arquivado"),
      supabase
        .from("meta_ads")
        .select("id, meta_id, meta_status, local_status")
        .not("meta_id", "is", null)
        .not("local_status", "eq", "Arquivado"),
    ]);

    const campaigns = campaignsRes.data || [];
    const adsets = adsetsRes.data || [];
    const ads = adsRes.data || [];

    // Coleta todos os meta_ids
    const allIds = [
      ...campaigns.map((c) => c.meta_id!),
      ...adsets.map((a) => a.meta_id!),
      ...ads.map((a) => a.meta_id!),
    ];

    if (allIds.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "Nenhum objeto enviado ao Meta ainda" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca status no Meta em batch (máx 50 por vez)
    const statusMap: Record<string, string> = {};
    for (let i = 0; i < allIds.length; i += 50) {
      const batch = allIds.slice(i, i + 50);
      const batchStatus = await fetchMetaStatuses(batch, token);
      Object.assign(statusMap, batchStatus);
    }

    let syncedCount = 0;
    const updates: Promise<unknown>[] = [];

    // Atualiza campanhas
    for (const c of campaigns) {
      const newMetaStatus = statusMap[c.meta_id!];
      if (!newMetaStatus || newMetaStatus === c.meta_status) continue;

      const newLocalStatus = toLocalStatus(newMetaStatus);
      if (newLocalStatus === c.local_status) continue;

      updates.push(
        supabase
          .from("meta_campaigns")
          .update({ meta_status: newMetaStatus, local_status: newLocalStatus })
          .eq("id", c.id),
      );
      syncedCount++;
    }

    // Atualiza conjuntos
    for (const a of adsets) {
      const newMetaStatus = statusMap[a.meta_id!];
      if (!newMetaStatus || newMetaStatus === a.meta_status) continue;

      const newLocalStatus = toLocalStatus(newMetaStatus);
      if (newLocalStatus === a.local_status) continue;

      updates.push(
        supabase
          .from("meta_adsets")
          .update({ meta_status: newMetaStatus, local_status: newLocalStatus })
          .eq("id", a.id),
      );
      syncedCount++;
    }

    // Atualiza anúncios
    for (const ad of ads) {
      const newMetaStatus = statusMap[ad.meta_id!];
      if (!newMetaStatus || newMetaStatus === ad.meta_status) continue;

      const newLocalStatus = toLocalStatus(newMetaStatus);
      if (newLocalStatus === ad.local_status) continue;

      updates.push(
        supabase
          .from("meta_ads")
          .update({ meta_status: newMetaStatus, local_status: newLocalStatus })
          .eq("id", ad.id),
      );
      syncedCount++;
    }

    await Promise.all(updates);

    return new Response(
      JSON.stringify({ synced: syncedCount, total_checked: allIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("meta-campaigns-sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
