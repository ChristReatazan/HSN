
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
        }
    });
}

Deno.serve(async (request) => {
    console.log("Create-admin request:", request.method);

    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return response({ error: "Method not allowed." }, 405);
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            console.error("Missing required Supabase environment variables.");

            return response({
                error: "Server configuration is incomplete. Check the Edge Function secrets."
            }, 500);
        }

        const authorization = request.headers.get("Authorization");

        if (!authorization) {
            console.error("Missing Authorization header.");

            return response({
                error: "Unauthorized request."
            }, 401);
        }

        const userClient = createClient(supabaseUrl, anonKey, {
            global: {
                headers: {
                    Authorization: authorization
                }
            }
        });

        const {
            data: { user },
            error: userError
        } = await userClient.auth.getUser();

        if (userError || !user) {
            console.error("Authentication failed:", userError?.message);

            return response({
                error: "Invalid user session."
            }, 401);
        }

        console.log("Authenticated caller:", user.id);

        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        const { data: currentProfile, error: profileError } =
            await adminClient
                .from("profiles")
                .select("id, role")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            console.error("Admin profile lookup failed:", profileError);

            return response({
                error: "Unable to verify administrator permissions."
            }, 500);
        }

        if (!currentProfile || currentProfile.role !== "admin") {
            console.error("User is not an administrator:", user.id);

            return response({
                error: "Only authorized administrators can create admin accounts."
            }, 403);
        }

        console.log("Administrator verified.");

        let body;

        try {
            body = await request.json();
        } catch {
            return response({
                error: "Invalid request body."
            }, 400);
        }

        const fullName = String(body.full_name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!fullName || !email || password.length < 8) {
            return response({
                error: "Provide a valid name, email, and password with at least 8 characters."
            }, 400);
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            return response({
                error: "Invalid email address."
            }, 400);
        }

        console.log("Creating administrator account for:", email);

        const {
            data: createdUser,
            error: createError
        } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName
            }
        });

        if (createError || !createdUser.user) {
            console.error("Auth user creation failed:", createError);

            return response({
                error: createError?.message ||
                    "Unable to create the administrator account."
            }, 400);
        }

        console.log("Auth account created:", createdUser.user.id);

        const { error: insertProfileError } = await adminClient
            .from("profiles")
            .upsert({
                id: createdUser.user.id,
                full_name: fullName,
                role: "admin"
            });

        if (insertProfileError) {
            console.error(
                "Admin profile insertion failed:",
                insertProfileError
            );

            const { error: rollbackError } =
                await adminClient.auth.admin.deleteUser(
                    createdUser.user.id
                );

            if (rollbackError) {
                console.error("Account rollback failed:", rollbackError);
            }

            return response({
                error: "Unable to save the administrator profile.",
                details: insertProfileError.message
            }, 500);
        }

        console.log("Administrator profile saved successfully.");

        return response({
            success: true,
            message: "Administrator account created successfully."
        });

    } catch (error) {
        console.error("Unexpected create-admin error:", error);

        return response({
            error: error instanceof Error
                ? error.message
                : "An unexpected server error occurred."
        }, 500);
    }
});
