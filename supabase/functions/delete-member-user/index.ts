import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    // Also allow if profiles.role = 'admin' (fallback)
    let isAdmin = !!roleData;
    if (!isAdmin) {
      const { data: profileData } = await callerClient
        .from("profiles")
        .select("role")
        .eq("user_id", caller.id)
        .maybeSingle();
      isAdmin = profileData?.role === "admin";
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Apenas admins podem remover membros" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { member_id } = await req.json();
    if (!member_id) {
      return new Response(JSON.stringify({ success: false, error: "member_id é obrigatório" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get member email
    const { data: member, error: memberError } = await adminClient
      .from("team_members")
      .select("id, email, name")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ success: false, error: "Membro não encontrado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let authDeleted = false;
    let authUserId: string | null = null;

    // Find auth user by email
    if (member.email) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
      if (!listError && users) {
        const authUser = users.find((u) => u.email === member.email);
        if (authUser) {
          authUserId = authUser.id;
          // Delete the auth user
          const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUser.id);
          if (!deleteError) {
            authDeleted = true;
            // Also clean up profiles
            await adminClient.from("profiles").delete().eq("user_id", authUser.id);
            // Clean up user_roles
            await adminClient.from("user_roles").delete().eq("user_id", authUser.id);
          }
        }
      }
    }

    // Soft delete the team_member record
    await adminClient
      .from("team_members")
      .update({ is_active: false })
      .eq("id", member_id);

    return new Response(
      JSON.stringify({
        success: true,
        auth_deleted: authDeleted,
        auth_user_id: authUserId,
        message: authDeleted
          ? "Membro e acesso ao sistema removidos"
          : "Membro removido (sem acesso ao sistema cadastrado)",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
