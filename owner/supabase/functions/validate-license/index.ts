// ============================================================
//  FUNÇÃO DO DONO DO SISTEMA — deploy no SEU Supabase
//  (não no Supabase do comprador)
//
//  Tabela necessária no SEU banco:
//  CREATE TABLE licenses (
//    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//    key         text UNIQUE NOT NULL,
//    status      text NOT NULL DEFAULT 'active',  -- active | suspended | cancelled
//    buyer_name  text,
//    buyer_email text,
//    domain      text,
//    last_seen   timestamptz,
//    created_at  timestamptz DEFAULT now()
//  );
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { key, domain } = await req.json();

    if (!key) {
      return Response.json({ valid: false, status: "no_key" }, { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: license, error } = await supabase
      .from("licenses")
      .select("status, buyer_email, buyer_name")
      .eq("key", key)
      .single();

    if (error || !license) {
      return Response.json({ valid: false, status: "not_found" }, { headers: corsHeaders });
    }

    // Atualiza último acesso e domínio
    await supabase
      .from("licenses")
      .update({ last_seen: new Date().toISOString(), domain })
      .eq("key", key);

    if (license.status === "active") {
      return Response.json({ valid: true }, { headers: corsHeaders });
    }

    return Response.json({ valid: false, status: license.status }, { headers: corsHeaders });

  } catch (e) {
    return Response.json({ valid: false, status: "error", error: String(e) }, { headers: corsHeaders });
  }
});
