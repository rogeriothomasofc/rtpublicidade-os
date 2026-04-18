import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
  const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE") ?? "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    // Aceita tanto { empresas: [...] } quanto array direto
    const empresas: Record<string, unknown>[] = Array.isArray(body) ? body : (body.empresas ?? body.body ?? []);

    if (!empresas.length) {
      return new Response(JSON.stringify({ error: "Nenhuma empresa recebida." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { saved: 0, duplicates: 0, errors: 0 };

    for (const emp of empresas) {
      try {
        const telefoneRaw = String(emp.telefone ?? "").replace(/\D/g, "");
        const comPais = telefoneRaw.startsWith("55") ? telefoneRaw : `55${telefoneRaw}`;
        const ddd = comPais.slice(2, 4);
        const numeroSemDDD = comPais.slice(4);
        const jid12 = `${comPais}@s.whatsapp.net`;
        const jid13 = `55${ddd}9${numeroSemDDD}@s.whatsapp.net`;

        // Verifica qual JID existe no WhatsApp (12 ou 13 dígitos)
        let whatsappJid: string | null = null;

        if (EVOLUTION_URL && EVOLUTION_KEY && EVOLUTION_INSTANCE) {
          try {
            const check12 = await fetch(`${EVOLUTION_URL}/chat/whatsappNumbers/${EVOLUTION_INSTANCE}`, {
              method: "POST",
              headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ numbers: [jid12] }),
            });
            const data12 = await check12.json();
            const exists12 = Array.isArray(data12) ? data12[0]?.exists : false;

            if (exists12) {
              whatsappJid = jid12;
            } else {
              const check13 = await fetch(`${EVOLUTION_URL}/chat/whatsappNumbers/${EVOLUTION_INSTANCE}`, {
                method: "POST",
                headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ numbers: [jid13] }),
              });
              const data13 = await check13.json();
              const exists13 = Array.isArray(data13) ? data13[0]?.exists : false;
              if (exists13) whatsappJid = jid13;
            }
          } catch {
            // Se não conseguir verificar, salva sem JID
          }
        }

        // Verifica duplicata pelo telefone
        const { data: existing } = await supabase
          .from("gmb_leads")
          .select("id")
          .eq("telefone", String(emp.telefone ?? ""))
          .maybeSingle();

        if (existing) {
          results.duplicates++;
          continue;
        }

        // Salva lead
        const { error: insertErr } = await supabase.from("gmb_leads").insert({
          nome_empresa: emp.nome_empresa ?? "",
          telefone: emp.telefone ?? "",
          whatsapp_jid: whatsappJid,
          endereco: emp.endereco ?? "",
          website: emp.website ?? "",
          rating: emp.rating ? parseFloat(String(emp.rating)) : null,
          reviews: emp.reviews ? parseInt(String(emp.reviews)) : null,
          especialidades: emp.especialidades ?? "",
        });

        if (insertErr) throw insertErr;
        results.saved++;

        // Pequena pausa para não sobrecarregar a API
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error("Erro ao processar empresa:", emp.nome_empresa, err);
        results.errors++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results, total: empresas.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
