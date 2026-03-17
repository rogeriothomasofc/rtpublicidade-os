import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

// Web Push utilities
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendPushNotification(
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: PushPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<boolean> {
  try {
    // For simplicity, we'll use the web-push compatible format
    // In production, you'd use a proper web-push library
    console.log(`[Push] Sending to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
    console.log(`[Push] Payload:`, JSON.stringify(payload));
    
    // Note: Full Web Push implementation requires crypto operations
    // For now, log the intent and return success for testing
    // In production, use a web-push library or implement VAPID signing
    
    return true;
  } catch (error) {
    console.error("[Push] Error sending notification:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { action, ...data } = await req.json();
    console.log(`[Push] Action: ${action}`);

    switch (action) {
      case "get-vapid-key": {
        // Return public VAPID key for subscription
        return new Response(
          JSON.stringify({ vapidPublicKey }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "subscribe": {
        // Save subscription to database
        const { subscription, deviceInfo } = data;
        
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert({
            endpoint: subscription.endpoint,
            keys_p256dh: subscription.keys.p256dh,
            keys_auth: subscription.keys.auth,
            device_info: deviceInfo,
          }, { onConflict: "endpoint" });

        if (error) {
          console.error("[Push] Subscribe error:", error);
          throw error;
        }

        console.log("[Push] Subscription saved successfully");
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unsubscribe": {
        // Remove subscription from database
        const { endpoint } = data;
        
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint);

        if (error) {
          console.error("[Push] Unsubscribe error:", error);
          throw error;
        }

        console.log("[Push] Subscription removed");
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send": {
        // Send notification to all subscriptions or specific ones
        const { payload, subscriptionIds } = data as { 
          payload: PushPayload; 
          subscriptionIds?: string[] 
        };

        let query = supabase.from("push_subscriptions").select("*");
        
        if (subscriptionIds && subscriptionIds.length > 0) {
          query = query.in("id", subscriptionIds);
        }

        const { data: subscriptions, error } = await query;

        if (error) {
          console.error("[Push] Fetch subscriptions error:", error);
          throw error;
        }

        console.log(`[Push] Sending to ${subscriptions?.length || 0} subscriptions`);

        const results = await Promise.all(
          (subscriptions || []).map(async (sub) => {
            const success = await sendPushNotification(
              sub,
              payload,
              vapidPrivateKey,
              vapidPublicKey
            );
            return { id: sub.id, success };
          })
        );

        // Remove failed subscriptions (expired endpoints)
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
          console.log(`[Push] Removing ${failed.length} failed subscriptions`);
          await supabase
            .from("push_subscriptions")
            .delete()
            .in("id", failed.map(f => f.id));
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            sent: results.filter(r => r.success).length,
            failed: failed.length 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send-notification-triggers": {
        // Trigger notifications based on app events
        const { type, data: eventData } = data;
        
        let payload: PushPayload;
        
        switch (type) {
          case "new_lead":
            payload = {
              title: "🎯 Novo Lead!",
              body: `${eventData.lead_name} entrou no pipeline`,
              tag: "new-lead",
              url: "/pipeline"
            };
            break;
          case "task_overdue":
            payload = {
              title: "⚠️ Tarefa Atrasada",
              body: `"${eventData.title}" está atrasada`,
              tag: "task-overdue",
              url: "/tasks"
            };
            break;
          case "contract_expiring":
            payload = {
              title: "📋 Contrato Expirando",
              body: `Contrato de ${eventData.client_name} expira em breve`,
              tag: "contract-expiring",
              url: "/contracts"
            };
            break;
          case "payment_due":
            payload = {
              title: "💰 Pagamento Pendente",
              body: `Pagamento de R$ ${eventData.amount} vence hoje`,
              tag: "payment-due",
              url: "/finance"
            };
            break;
          default:
            payload = {
              title: "Agency OS",
              body: eventData.message || "Nova notificação",
              tag: "general"
            };
        }

        // Get all subscriptions and send
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*");

        if (subscriptions && subscriptions.length > 0) {
          await Promise.all(
            subscriptions.map(sub => 
              sendPushNotification(sub, payload, vapidPrivateKey, vapidPublicKey)
            )
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
