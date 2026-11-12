
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (data: unknown, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed." },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Server configuration is incomplete." },
        500
      );
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Authentication required." },
        401
      );
    }

    const token = authorization.replace("Bearer ", "").trim();

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the currently logged-in user.
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !currentUser) {
      return jsonResponse(
        { error: "Invalid or expired session." },
        401
      );
    }

    // Confirm that the requesting user is an administrator.
    const {
      data: currentProfile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (
      profileError ||
      !currentProfile ||
      currentProfile.role !== "admin"
    ) {
      return jsonResponse(
        { error: "Administrator access required." },
        403
      );
    }

    // Read the new administrator details.
    const body = await req.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!fullName || !email || !password) {
      return jsonResponse(
        { error: "Full name, email, and password are required." },
        400
      );
    }

    if (fullName.length > 150) {
      return jsonResponse(
        { error: "Full name is too long." },
        400
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return jsonResponse(
        { error: "Please enter a valid email address." },
        400
      );
    }

    if (password.length < 8) {
      return jsonResponse(
        { error: "Password must be at least 8 characters." },
        400
      );
    }

    // Create the new Supabase Auth user.
    // Email confirmation is bypassed as requested.
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
        {
          error: createError?.message || "Unable to create administrator.",
        },
        400
      );
    }

    const newUserId = createdUser.user.id;

    // Create the corresponding administrator profile.
    const {
      error: insertProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        full_name: fullName,
        role: "admin",
      });

    // Roll back the Auth user if profile creation fails.
    if (insertProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return jsonResponse(
        {
          error: "Administrator profile could not be created.",
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      message: "New administrator created successfully.",
      user: {
        id: newUserId,
        full_name: fullName,
        email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);

    return jsonResponse(
      { error: "An unexpected server error occurred." },
      500
    );
  }
});
