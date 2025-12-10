import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create auth client for user verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("Not admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Only admins can update other users' usernames" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, username } = await req.json();

    if (!userId || !username) {
      return new Response(
        JSON.stringify({ error: "userId and username are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate username format
    if (!/^[a-z0-9_]+$/.test(username) || username.length < 3) {
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if username is already taken by another user
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (checkError) {
      console.error("Check error:", checkError);
      throw checkError;
    }

    if (existingUser && existingUser.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Username already in use" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get old username for audit log
    const { data: oldProfile } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    const oldUsername = oldProfile?.username || null;

    // Update username using service role (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ username })
      .eq("id", userId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    // Log audit entry
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "username_update",
      action_details: {
        old_username: oldUsername,
        new_username: username,
      },
      user_agent: req.headers.get("user-agent"),
    });

    console.log(`Admin ${user.id} updated username for user ${userId} to: ${username}`);

    return new Response(
      JSON.stringify({ success: true, username }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
