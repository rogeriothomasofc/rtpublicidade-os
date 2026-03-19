// ============================================================
//  Agency OS — Edge Function: provision
//  Deploy no SEU Supabase (não no do comprador)
//
//  Chamada pelo install.sh do comprador com a chave de licença.
//  Retorna as credenciais do Supabase que você criou para ele.
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { key, domain } = await req.json();
    if (!key) return Response.json({ error: "Chave de licença obrigatória" }, { headers: cors, status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: license, error } = await supabase
      .from("licenses")
      .select("status, supabase_url, supabase_anon_key, supabase_service_key, supabase_project_ref, buyer_email, buyer_name")
      .eq("key", key)
      .single();

    if (error || !license) {
      return Response.json({ error: "Chave de licença inválida" }, { headers: cors, status: 404 });
    }

    if (license.status === "suspended") {
      return Response.json({ error: "Licença suspensa. Entre em contato com o suporte." }, { headers: cors, status: 403 });
    }

    if (license.status === "cancelled") {
      return Response.json({ error: "Licença cancelada." }, { headers: cors, status: 403 });
    }

    // Atualiza domínio e último acesso
    await supabase.from("licenses").update({
      domain,
      last_seen: new Date().toISOString(),
    }).eq("key", key);

    return Response.json({
      valid:               true,
      supabase_url:        license.supabase_url,
      supabase_anon_key:   license.supabase_anon_key,
      supabase_service_key: license.supabase_service_key,
      supabase_project_ref: license.supabase_project_ref,
      buyer_name:          license.buyer_name,
    }, { headers: cors });

  } catch (e) {
    return Response.json({ error: String(e) }, { headers: cors, status: 500 });
  }
});
