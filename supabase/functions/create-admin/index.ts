
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

Deno.serve(async request => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return response({ error: "Method not allowed." }, 405);
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const authorization = request.headers.get("Authorization");

        if (!authorization) {
            return response({ error: "Unauthorized request." }, 401);
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
            return response({ error: "Invalid user session." }, 401);
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        const { data: currentProfile, error: profileError } =
            await adminClient
                .from("profiles")
                .select("id, role")
                .eq("id", user.id)
                .maybeSingle();

        if (
            profileError ||
            !currentProfile ||
            currentProfile.role !== "admin"
        ) {
            return response({
                error: "Only authorized administrators can create admin accounts."
            }, 403);
        }

        const body = await request.json();

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
            return response({ error: "Invalid email address." }, 400);
        }

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
            return response({
                error: createError?.message || "Unable to create the administrator account."
            }, 400);
        }

        const { error: insertProfileError } = await adminClient
            .from("profiles")
            .upsert({
                id: createdUser.user.id,
                full_name: fullName,
                role: "admin"
            });

        if (insertProfileError) {
            await adminClient.auth.admin.deleteUser(createdUser.user.id);

            return response({
                error: "The Auth account was created, but the admin profile could not be saved. The account creation was rolled back."
            }, 500);
        }

        return response({
            success: true,
            message: "Administrator account created successfully."
        });
    } catch (error) {
        console.error("Create admin function error:", error);

        return response({
            error: "An unexpected server error occurred."
        }, 500);
    }
});
