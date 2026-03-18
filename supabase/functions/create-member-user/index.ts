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
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with caller's JWT to check admin role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      throw new Error("Não autorizado");
    }

    // Check admin role
    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Apenas administradores podem cadastrar membros com acesso ao sistema");
    }

    const { email, password, name, role, access_level, team_member_id } = await req.json();

    if (!email || !password || !name) {
      throw new Error("Email, nome e senha temporária são obrigatórios");
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter no mínimo 6 caracteres");
    }

    // Admin client to create user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create the auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      if (createError.message?.includes("already been registered")) {
        throw new Error("Este email já está cadastrado no sistema");
      }
      throw new Error("Erro ao criar usuário: " + createError.message);
    }

    console.log("User created:", newUser.user.id);

    // Map access level label to app_role enum: Gestor → admin, others → member
    const appRole = access_level === "Gestor" ? "admin" : "member";

    // Assign role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: appRole });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Update profile: store job title in role, access level label for reference
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ name, role: access_level || role || null })
      .eq("user_id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // If team_member_id provided, update team_members email to link them
    if (team_member_id) {
      const { error: teamError } = await adminClient
        .from("team_members")
        .update({ email })
        .eq("id", team_member_id);

      if (teamError) {
        console.error("Error updating team member:", teamError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("create-member-user error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
