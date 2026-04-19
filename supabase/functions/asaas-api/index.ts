import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function asaasUrl(env: string, path: string) {
  const base = env === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
  return `${base}${path}`;
}

async function asaasFetch(url: string, apiKey: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "access_token": apiKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.errors?.[0]?.description || body?.message || "Asaas API error");
  return body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  // Get Asaas integration config
  const { data: integration } = await supabase
    .from("integrations")
    .select("config, status")
    .eq("provider", "asaas")
    .single();

  if (!integration || integration.status !== "connected") {
    return new Response(JSON.stringify({ error: "Asaas não está configurado" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const config = integration.config as Record<string, string>;
  const apiKey = config.api_key;
  const environment = config.environment || "sandbox";

  const { action, payload } = await req.json();

  try {
    // ── ACTION: ensure_customer ──────────────────────────────────────────────
    // Creates or fetches an Asaas customer for a client.
    // payload: { client_id }
    if (action === "ensure_customer") {
      const { client_id } = payload;

      const { data: client } = await supabase
        .from("clients")
        .select("id, name, company, email, phone, cpf, cnpj, person_type, asaas_customer_id")
        .eq("id", client_id)
        .single();

      if (!client) throw new Error("Cliente não encontrado");

      // Already has customer id — verify it still exists
      if (client.asaas_customer_id) {
        try {
          const existing = await asaasFetch(
            asaasUrl(environment, `/customers/${client.asaas_customer_id}`),
            apiKey
          );
          return new Response(JSON.stringify({ customer_id: existing.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          // Customer not found in Asaas, recreate
        }
      }

      // Build CPF/CNPJ
      const cpfCnpj = client.person_type === "pj" ? client.cnpj : client.cpf;
      const name = client.company || client.name;

      const body: Record<string, unknown> = { name, email: client.email };
      if (cpfCnpj) body.cpfCnpj = cpfCnpj.replace(/\D/g, "");
      if (client.phone) body.mobilePhone = client.phone.replace(/\D/g, "");

      const customer = await asaasFetch(
        asaasUrl(environment, "/customers"),
        apiKey,
        { method: "POST", body: JSON.stringify(body) }
      );

      await supabase.from("clients").update({ asaas_customer_id: customer.id }).eq("id", client_id);

      return new Response(JSON.stringify({ customer_id: customer.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: create_charge ────────────────────────────────────────────────
    // Creates a charge in Asaas for a finance record.
    // payload: { finance_id, billing_type } — billing_type: PIX | BOLETO | CREDIT_CARD
    if (action === "create_charge") {
      const { finance_id, billing_type = "PIX" } = payload;

      const { data: finance } = await supabase
        .from("finance")
        .select("*, client:clients(id, name, company, asaas_customer_id)")
        .eq("id", finance_id)
        .single();

      if (!finance) throw new Error("Lançamento não encontrado");
      if (finance.type !== "Receita") throw new Error("Apenas receitas podem gerar cobranças");
      if (finance.asaas_charge_id) throw new Error("Já existe uma cobrança Asaas para este lançamento");

      // Ensure client exists in Asaas
      let customerId = finance.client?.asaas_customer_id;
      if (!customerId) {
        const ensureRes = await fetch(req.url, {
          method: "POST",
          headers: { "Authorization": authHeader!, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ensure_customer", payload: { client_id: finance.client_id } }),
        });
        const ensureData = await ensureRes.json();
        customerId = ensureData.customer_id;
      }

      const chargeBody: Record<string, unknown> = {
        customer: customerId,
        billingType: billing_type,
        value: Number(finance.amount),
        dueDate: finance.due_date,
        description: finance.description || `Cobrança - ${finance.client?.company || finance.client?.name || ""}`,
      };

      const charge = await asaasFetch(
        asaasUrl(environment, "/payments"),
        apiKey,
        { method: "POST", body: JSON.stringify(chargeBody) }
      );

      // Save charge info back to finance
      const updateData: Record<string, unknown> = {
        asaas_charge_id: charge.id,
        asaas_payment_url: charge.invoiceUrl || charge.bankSlipUrl || null,
        asaas_billing_type: billing_type,
      };
      if (billing_type === "PIX" && charge.pixQrCode) {
        updateData.asaas_pix_code = charge.pixQrCode;
      }

      await supabase.from("finance").update(updateData).eq("id", finance_id);

      return new Response(JSON.stringify({ charge }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: get_pix_qr ───────────────────────────────────────────────────
    // Gets the PIX QR code for an existing charge.
    // payload: { finance_id }
    if (action === "get_pix_qr") {
      const { finance_id } = payload;
      const { data: finance } = await supabase
        .from("finance")
        .select("asaas_charge_id, asaas_pix_code")
        .eq("id", finance_id)
        .single();

      if (!finance?.asaas_charge_id) throw new Error("Nenhuma cobrança Asaas vinculada");

      if (finance.asaas_pix_code) {
        return new Response(JSON.stringify({ pixQrCode: finance.asaas_pix_code }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pix = await asaasFetch(
        asaasUrl(environment, `/payments/${finance.asaas_charge_id}/pixQrCode`),
        apiKey
      );

      if (pix.encodedImage || pix.payload) {
        await supabase.from("finance").update({ asaas_pix_code: pix.payload }).eq("id", finance_id);
      }

      return new Response(JSON.stringify({ pixQrCode: pix.payload, pixImage: pix.encodedImage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: cancel_charge ────────────────────────────────────────────────
    // payload: { finance_id }
    if (action === "cancel_charge") {
      const { finance_id } = payload;
      const { data: finance } = await supabase
        .from("finance")
        .select("asaas_charge_id")
        .eq("id", finance_id)
        .single();

      if (!finance?.asaas_charge_id) throw new Error("Nenhuma cobrança Asaas vinculada");

      await asaasFetch(
        asaasUrl(environment, `/payments/${finance.asaas_charge_id}`),
        apiKey,
        { method: "DELETE" }
      );

      await supabase.from("finance").update({
        asaas_charge_id: null,
        asaas_payment_url: null,
        asaas_pix_code: null,
        asaas_billing_type: null,
      }).eq("id", finance_id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: sync_charges ─────────────────────────────────────────────────
    // Syncs all Asaas charges to the finance table (status updates).
    if (action === "sync_charges") {
      const { data: financeRecords } = await supabase
        .from("finance")
        .select("id, asaas_charge_id, status")
        .not("asaas_charge_id", "is", null)
        .in("status", ["Pendente", "Atrasado"]);

      if (!financeRecords?.length) {
        return new Response(JSON.stringify({ synced: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let synced = 0;
      for (const record of financeRecords) {
        try {
          const charge = await asaasFetch(
            asaasUrl(environment, `/payments/${record.asaas_charge_id}`),
            apiKey
          );

          const newStatus = mapAsaasStatus(charge.status);
          if (newStatus && newStatus !== record.status) {
            await supabase.from("finance").update({
              status: newStatus,
              ...(newStatus === "Pago" ? { paid_date: new Date().toISOString().split("T")[0] } : {}),
            }).eq("id", record.id);
            synced++;
          }
        } catch {
          // Skip if charge not found
        }
      }

      return new Response(JSON.stringify({ synced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: get_balance ──────────────────────────────────────────────────
    // Returns Asaas account balance.
    if (action === "get_balance") {
      const data = await asaasFetch(asaasUrl(environment, "/finance/getCurrentBalance"), apiKey);
      return new Response(JSON.stringify({ balance: data.balance ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapAsaasStatus(asaasStatus: string): string | null {
  const map: Record<string, string> = {
    RECEIVED: "Pago",
    CONFIRMED: "Pago",
    RECEIVED_IN_CASH: "Pago",
    PENDING: "Pendente",
    OVERDUE: "Atrasado",
    REFUNDED: "Pago",
  };
  return map[asaasStatus] || null;
}
