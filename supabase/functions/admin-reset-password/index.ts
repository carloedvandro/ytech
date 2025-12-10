import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

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
    
    // Verify the requesting user is authenticated
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
        JSON.stringify({ error: "Only admins can reset passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, sendWhatsApp = false } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new temporary password
    const tempPassword = generateTempPassword();

    // Update user password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log(`Admin ${user.id} reset password for user ${userId}`);

    // Log audit entry
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "password_reset",
      action_details: {
        send_whatsapp: sendWhatsApp,
      },
      user_agent: req.headers.get("user-agent"),
    });

    // Get user's profile for WhatsApp notification
    let whatsappSent = false;
    if (sendWhatsApp) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("whatsapp, full_name")
        .eq("id", userId)
        .single();

      if (profile?.whatsapp) {
        try {
          // Send WhatsApp notification with new password
          const megaApiHost = Deno.env.get("MEGA_API_HOST");
          const megaInstanceKey = Deno.env.get("MEGA_INSTANCE_KEY");
          const megaApiKey = Deno.env.get("MEGA_API_KEY");

          if (megaApiHost && megaInstanceKey && megaApiKey) {
            const message = `🔐 *Y-Tech - Nova Senha*\n\nOlá ${profile.full_name}!\n\nSua senha foi redefinida pelo administrador.\n\n*Nova senha temporária:* ${tempPassword}\n\n⚠️ Por segurança, altere sua senha após o login.\n\nAcesse: https://ytech.yrwentechnology.com.br/login`;

            const response = await fetch(
              `${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${megaApiKey}`,
                },
                body: JSON.stringify({
                  messageData: {
                    to: profile.whatsapp,
                    text: message,
                  },
                }),
              }
            );

            if (response.ok) {
              whatsappSent = true;
              console.log(`WhatsApp notification sent to ${profile.whatsapp}`);
            } else {
              console.error("Failed to send WhatsApp:", await response.text());
            }
          }
        } catch (whatsappError) {
          console.error("WhatsApp error:", whatsappError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        whatsappSent 
      }),
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
