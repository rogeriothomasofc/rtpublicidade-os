import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const vapidPublicKey  = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    // Configura web-push com as chaves VAPID
    webpush.setVapidDetails(
      "mailto:contato@rtpublicidade.com.br",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...data } = await req.json();
    console.log(`[Push] Action: ${action}, user: ${user.id}`);

    switch (action) {
      // ── Retorna a chave pública VAPID para o browser se inscrever ──
      case "get-vapid-key": {
        return new Response(JSON.stringify({ vapidPublicKey }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Salva a subscription no banco ──
      case "subscribe": {
        const { subscription, deviceInfo } = data;
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id:     user.id,
            endpoint:    subscription.endpoint,
            keys_p256dh: subscription.keys.p256dh,
            keys_auth:   subscription.keys.auth,
            device_info: deviceInfo,
          },
          { onConflict: "endpoint" }
        );
        if (error) throw error;
        console.log("[Push] Subscription saved");
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Remove a subscription ──
      case "unsubscribe": {
        const { endpoint } = data;
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint);
        if (error) throw error;
        console.log("[Push] Subscription removed");
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Envia push para subscription(s) específica(s) ou todas ──
      case "send": {
        const { payload, subscriptionIds } = data as {
          payload: PushPayload;
          subscriptionIds?: string[];
        };

        let query = supabase.from("push_subscriptions").select("*");
        if (subscriptionIds?.length) {
          query = query.in("id", subscriptionIds);
        }

        const { data: subs, error } = await query;
        if (error) throw error;

        console.log(`[Push] Sending to ${subs?.length ?? 0} subscriptions`);

        const results = await Promise.allSettled(
          (subs || []).map((sub: PushSubscriptionRow) =>
            webpush
              .sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
                JSON.stringify(payload)
              )
              .then(() => ({ id: sub.id, success: true }))
              .catch((err: Error) => {
                console.error(`[Push] Failed ${sub.id}:`, err.message);
                return { id: sub.id, success: false };
              })
          )
        );

        const sent   = results.filter(r => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.success);
        const failed = results.filter(r => r.status === "fulfilled" && !(r as PromiseFulfilledResult<any>).value.success);

        // Remove endpoints expirados/inválidos
        if (failed.length > 0) {
          const failedIds = failed.map(r => (r as PromiseFulfilledResult<any>).value.id);
          await supabase.from("push_subscriptions").delete().in("id", failedIds);
        }

        return new Response(
          JSON.stringify({ success: true, sent: sent.length, failed: failed.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── Triggers de eventos internos (tarefas, contratos, etc.) ──
      case "send-notification-triggers": {
        const { type, data: eventData } = data;

        const payloads: Record<string, PushPayload> = {
          new_lead: {
            title: "🎯 Novo Lead!",
            body:  `${eventData.lead_name} entrou no pipeline`,
            tag:   "new-lead",
            url:   "/pipeline",
          },
          task_overdue: {
            title: "⚠️ Tarefa Atrasada",
            body:  `"${eventData.title}" está atrasada`,
            tag:   "task-overdue",
            url:   "/tasks",
          },
          contract_expiring: {
            title: "📋 Contrato Expirando",
            body:  `Contrato de ${eventData.client_name} expira em breve`,
            tag:   "contract-expiring",
            url:   "/contracts",
          },
          payment_due: {
            title: "💰 Pagamento Pendente",
            body:  `Pagamento de R$ ${eventData.amount} vence hoje`,
            tag:   "payment-due",
            url:   "/finance",
          },
        };

        const payload: PushPayload = payloads[type] ?? {
          title: "Agency OS",
          body:  eventData.message || "Nova notificação",
          tag:   "general",
        };

        const { data: subs } = await supabase.from("push_subscriptions").select("*");

        await Promise.allSettled(
          (subs || []).map((sub: PushSubscriptionRow) =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
              JSON.stringify(payload)
            )
          )
        );

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("[Push] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
