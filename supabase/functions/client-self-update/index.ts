import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_FIELDS = [
  "name", "company", "email", "phone", "person_type",
  "cnpj", "cpf", "rg", "razao_social", "inscricao_estadual",
  "address", "city", "state", "zip_code", "instagram_username",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // GET: pre-fill form with current client data
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: client, error } = await adminClient
        .from("clients")
        .select("name, company, email, phone, person_type, cnpj, cpf, rg, razao_social, inscricao_estadual, address, city, state, zip_code, instagram_username")
        .eq("form_token", token)
        .single();

      if (error || !client) {
        return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(client), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: update client data
    if (req.method === "POST") {
      const body = await req.json();
      const { token, ...fields } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: "Token obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify token exists
      const { data: existing, error: findError } = await adminClient
        .from("clients")
        .select("id")
        .eq("form_token", token)
        .single();

      if (findError || !existing) {
        return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Whitelist only allowed fields
      const updateData: Record<string, unknown> = {};
      for (const key of ALLOWED_FIELDS) {
        if (key in fields) updateData[key] = fields[key];
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum campo válido enviado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await adminClient
        .from("clients")
        .update(updateData)
        .eq("id", existing.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
