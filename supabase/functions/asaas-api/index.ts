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

// Shared function — no self-fetch needed
async function ensureCustomer(
  supabase: ReturnType<typeof createClient>,
  environment: string,
  apiKey: string,
  client_id: string
): Promise<string> {
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, company, email, phone, cpf, cnpj, person_type, asaas_customer_id")
    .eq("id", client_id)
    .single();

  if (!client) throw new Error("Cliente não encontrado");

  if (client.asaas_customer_id) {
    try {
      const existing = await asaasFetch(
        asaasUrl(environment, `/customers/${client.asaas_customer_id}`),
        apiKey
      );
      return existing.id;
    } catch {
      // Customer deleted in Asaas — recreate below
    }
  }

  const cpfCnpj = client.person_type === "pj" ? client.cnpj : client.cpf;
  const name = client.company || client.name;
  if (!name) throw new Error("Cliente sem nome definido");

  const body: Record<string, unknown> = { name };
  if (client.email) body.email = client.email;
  if (cpfCnpj) body.cpfCnpj = cpfCnpj.replace(/\D/g, "");
  if (client.phone) body.mobilePhone = client.phone.replace(/\D/g, "");

  const customer = await asaasFetch(
    asaasUrl(environment, "/customers"),
    apiKey,
    { method: "POST", body: JSON.stringify(body) }
  );

  await supabase.from("clients").update({ asaas_customer_id: customer.id }).eq("id", client_id);
  return customer.id;
}

// Shared function — create charge for a finance record
async function createCharge(
  supabase: ReturnType<typeof createClient>,
  environment: string,
  apiKey: string,
  finance_id: string,
  billing_type: string
): Promise<Record<string, unknown>> {
  const { data: finance } = await supabase
    .from("finance")
    .select("*, client:clients(id, name, company, asaas_customer_id)")
    .eq("id", finance_id)
    .single();

  if (!finance) throw new Error("Lançamento não encontrado");
  if (finance.type !== "Receita") throw new Error("Apenas receitas podem gerar cobranças");
  if (finance.asaas_charge_id) throw new Error("Já existe uma cobrança Asaas para este lançamento");
  if (!finance.client_id) throw new Error("Lançamento sem cliente vinculado");

  const customerId = await ensureCustomer(supabase, environment, apiKey, finance.client_id);

  const today = new Date().toISOString().split("T")[0];
  const dueDate = finance.due_date && finance.due_date >= today ? finance.due_date : today;

  const chargeBody: Record<string, unknown> = {
    customer: customerId,
    billingType: billing_type,
    value: Number(finance.amount),
    dueDate,
    description: finance.description || `Cobrança - ${finance.client?.company || finance.client?.name || ""}`,
  };

  const charge = await asaasFetch(
    asaasUrl(environment, "/payments"),
    apiKey,
    { method: "POST", body: JSON.stringify(chargeBody) }
  );

  const updateData: Record<string, unknown> = {
    asaas_charge_id: charge.id,
    asaas_payment_url: charge.invoiceUrl || charge.bankSlipUrl || null,
    asaas_billing_type: billing_type,
  };
  if (billing_type === "PIX" && charge.pixQrCode) {
    updateData.asaas_pix_code = charge.pixQrCode;
  }

  await supabase.from("finance").update(updateData).eq("id", finance_id);
  return charge;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: integration } = await supabase
    .from("integrations")
    .select("config, status")
    .eq("provider", "asaas")
    .single();

  if (!integration || integration.status !== "connected") {
    return new Response(JSON.stringify({ error: "Asaas não está configurado" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const config = integration.config as Record<string, string>;
  const apiKey = config.api_key;
  const environment = config.environment || "sandbox";

  const { action, payload } = await req.json();

  try {
    // ── ensure_customer ──────────────────────────────────────────────────────
    if (action === "ensure_customer") {
      const customer_id = await ensureCustomer(supabase, environment, apiKey, payload.client_id);
      return new Response(JSON.stringify({ customer_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── create_charge ────────────────────────────────────────────────────────
    if (action === "create_charge") {
      const charge = await createCharge(supabase, environment, apiKey, payload.finance_id, payload.billing_type || "PIX");
      return new Response(JSON.stringify({ charge }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── bulk_create_charges ──────────────────────────────────────────────────
    if (action === "bulk_create_charges") {
      const { data: pending } = await supabase
        .from("finance")
        .select("id, client_id")
        .eq("type", "Receita")
        .in("status", ["Pendente", "Atrasado"])
        .is("asaas_charge_id", null)
        .not("client_id", "is", null);

      if (!pending?.length) {
        return new Response(JSON.stringify({ created: 0, errors: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let created = 0;
      let errors = 0;
      const errorMessages: string[] = [];
      for (const record of pending) {
        try {
          await createCharge(supabase, environment, apiKey, record.id, "PIX");
          created++;
        } catch (e: unknown) {
          errors++;
          errorMessages.push(`${record.id}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
        }
      }

      return new Response(JSON.stringify({ created, errors, errorMessages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── get_pix_qr ───────────────────────────────────────────────────────────
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

    // ── cancel_charge ────────────────────────────────────────────────────────
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

    // ── receive_in_cash ──────────────────────────────────────────────────────
    if (action === "receive_in_cash") {
      const { finance_id } = payload;
      const { data: finance } = await supabase
        .from("finance")
        .select("asaas_charge_id")
        .eq("id", finance_id)
        .single();

      if (!finance?.asaas_charge_id) throw new Error("Nenhuma cobrança Asaas vinculada");

      await asaasFetch(
        asaasUrl(environment, `/payments/${finance.asaas_charge_id}/receiveInCash`),
        apiKey,
        { method: "POST", body: JSON.stringify({ paymentDate: new Date().toISOString().split("T")[0] }) }
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── sync_charges ─────────────────────────────────────────────────────────
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

    // ── import_customers ─────────────────────────────────────────────────────
    if (action === "import_customers") {
      let offset = 0;
      const limit = 100;
      const allCustomers: Record<string, unknown>[] = [];

      while (true) {
        const page = await asaasFetch(asaasUrl(environment, `/customers?limit=${limit}&offset=${offset}`), apiKey);
        if (!page.data?.length) break;
        allCustomers.push(...page.data);
        if (!page.hasMore) break;
        offset += limit;
      }

      if (!allCustomers.length) {
        return new Response(JSON.stringify({ linked: 0, skipped: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, company, email, cpf, cnpj, asaas_customer_id");

      let linked = 0; let skipped = 0;

      for (const customer of allCustomers) {
        const asaasId = customer.id as string;
        const asaasEmail = (customer.email as string || "").toLowerCase().trim();
        const asaasName = (customer.name as string || "").toLowerCase().trim();
        const asaasCpfCnpj = ((customer.cpfCnpj as string) || "").replace(/\D/g, "");

        const match = (clients || []).find((c: Record<string, string | null>) => {
          if (c.asaas_customer_id) return false;
          if (asaasEmail && c.email && c.email.toLowerCase().trim() === asaasEmail) return true;
          const cpf = (c.cpf || "").replace(/\D/g, "");
          const cnpj = (c.cnpj || "").replace(/\D/g, "");
          if (asaasCpfCnpj && (cpf === asaasCpfCnpj || cnpj === asaasCpfCnpj)) return true;
          const clientName = (c.company || c.name || "").toLowerCase().trim();
          if (asaasName && clientName === asaasName) return true;
          return false;
        });

        if (match) {
          await supabase.from("clients").update({ asaas_customer_id: asaasId }).eq("id", (match as Record<string, string>).id);
          (match as Record<string, string>).asaas_customer_id = asaasId;
          linked++;
        } else {
          skipped++;
        }
      }

      return new Response(JSON.stringify({ linked, skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── import_charges ───────────────────────────────────────────────────────
    if (action === "import_charges") {
      const limit = 100;
      const allCharges: Record<string, unknown>[] = [];

      for (const status of ["PENDING", "OVERDUE"]) {
        let offset = 0;
        while (true) {
          const page = await asaasFetch(
            asaasUrl(environment, `/payments?limit=${limit}&offset=${offset}&status=${status}`),
            apiKey
          );
          if (!page.data?.length) break;
          allCharges.push(...page.data);
          if (!page.hasMore) break;
          offset += limit;
        }
      }

      if (!allCharges.length) {
        return new Response(JSON.stringify({ linked: 0, created: 0, skipped: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: clients } = await supabase
        .from("clients")
        .select("id, asaas_customer_id")
        .not("asaas_customer_id", "is", null);

      const customerMap = new Map((clients || []).map((c: Record<string, string>) => [c.asaas_customer_id, c.id]));

      const { data: alreadyLinked } = await supabase
        .from("finance")
        .select("asaas_charge_id")
        .not("asaas_charge_id", "is", null);

      const linkedIds = new Set((alreadyLinked || []).map((f: Record<string, string>) => f.asaas_charge_id));

      let linked = 0; let created = 0; let skipped = 0;

      for (const charge of allCharges) {
        const chargeId = charge.id as string;
        if (linkedIds.has(chargeId)) { skipped++; continue; }

        const customerId = charge.customer as string;
        const clientId = customerMap.get(customerId);
        const amount = Number(charge.value);
        const dueDate = charge.dueDate as string;
        const newStatus = mapAsaasStatus(charge.status as string) || "Pendente";

        const updateData: Record<string, unknown> = {
          asaas_charge_id: chargeId,
          asaas_payment_url: (charge.invoiceUrl || charge.bankSlipUrl || null) as string | null,
          asaas_billing_type: charge.billingType as string,
        };

        if (!clientId) { skipped++; continue; }

        const { data: match } = await supabase
          .from("finance")
          .select("id")
          .eq("type", "Receita")
          .eq("client_id", clientId)
          .eq("amount", amount)
          .eq("due_date", dueDate)
          .is("asaas_charge_id", null)
          .limit(1)
          .single();

        if (match) {
          await supabase.from("finance").update(updateData).eq("id", match.id);
          linked++;
        } else {
          await supabase.from("finance").insert({
            type: "Receita",
            client_id: clientId,
            amount,
            due_date: dueDate,
            status: newStatus,
            description: (charge.description || "Cobrança importada do Asaas") as string,
            recurrence: "Nenhuma",
            ...updateData,
          });
          created++;
        }
      }

      return new Response(JSON.stringify({ linked, created, skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── get_balance ──────────────────────────────────────────────────────────
    if (action === "get_balance") {
      const data = await asaasFetch(asaasUrl(environment, "/finance/getCurrentBalance"), apiKey);
      return new Response(JSON.stringify({ balance: data.totalBalance ?? data.balance ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
