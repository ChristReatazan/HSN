
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Server configuration is incomplete." },
        500,
      );
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const token = authorization.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return jsonResponse({ error: "Invalid session." }, 401);
    }

    const { data: callerProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();

    if (
      profileError ||
      callerProfile?.role !== "admin"
    ) {
      return jsonResponse(
        { error: "Only administrators can create admins." },
        403,
      );
    }

    const body = await req.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!fullName || !email || !password) {
      return jsonResponse(
        { error: "Full name, email, and password are required." },
        400,
      );
    }

    if (password.length < 8) {
      return jsonResponse(
        { error: "Password must be at least 8 characters." },
        400,
      );
    }

    const {
      data: createdUser,
      error: createError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !createdUser.user) {
      return jsonResponse(
        { error: createError?.message ?? "Unable to create admin." },
        400,
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdUser.user.id,
        full_name: fullName,
        role: "admin",
      });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(
        createdUser.user.id,
      );

      return jsonResponse(
        { error: "Profile creation failed: " + insertError.message },
        500,
      );
    }

    return jsonResponse({
      success: true,
      message: "New administrator created successfully.",
      user: {
        id: createdUser.user.id,
        email: createdUser.user.email,
        full_name: fullName,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);

    return jsonResponse(
      { error: "An unexpected server error occurred." },
      500,
    );
  }
});
