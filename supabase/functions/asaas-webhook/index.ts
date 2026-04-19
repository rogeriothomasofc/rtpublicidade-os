import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Asaas webhook — no JWT required (receives from Asaas servers)
// Security: optional ASAAS_WEBHOOK_TOKEN env var to validate token header

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Optional token validation
  const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (webhookToken) {
    const sentToken = req.headers.get("asaas-access-token") || req.headers.get("access_token");
    if (sentToken !== webhookToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = body.event as string;
  const payment = body.payment as Record<string, unknown>;

  if (!payment?.id) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const chargeId = payment.id as string;

  // Map Asaas event → local status
  const statusMap: Record<string, string> = {
    PAYMENT_RECEIVED: "Pago",
    PAYMENT_CONFIRMED: "Pago",
    PAYMENT_RECEIVED_IN_CASH: "Pago",
    PAYMENT_OVERDUE: "Atrasado",
    PAYMENT_DELETED: "Pendente",
    PAYMENT_RESTORED: "Pendente",
    PAYMENT_REFUNDED: "Pago",
  };

  const newStatus = statusMap[event];

  if (newStatus) {
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "Pago") {
      update.paid_date = (payment.paymentDate as string) ||
        new Date().toISOString().split("T")[0];
    }

    await supabase
      .from("finance")
      .update(update)
      .eq("asaas_charge_id", chargeId);
  }

  // If pix QR arrived in payload, save it
  if (payment.pixQrCode) {
    await supabase
      .from("finance")
      .update({ asaas_pix_code: payment.pixQrCode })
      .eq("asaas_charge_id", chargeId);
  }

  console.log(`[asaas-webhook] event=${event} charge=${chargeId} status=${newStatus ?? "ignored"}`);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
