
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders,
        });
    }

    const jsonResponse = (
        body: Record<string, unknown>,
        status = 200
    ) => {
        return new Response(JSON.stringify(body), {
            status,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
        });
    };

    if (req.method !== "POST") {
        return jsonResponse(
            { error: "Method not allowed." },
            405
        );
    }

    let createdUserId: string | null = null;

    try {
        // SUPABASE ENVIRONMENT VARIABLES
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY"
        );

        if (
            !SUPABASE_URL ||
            !SUPABASE_ANON_KEY ||
            !SUPABASE_SERVICE_ROLE_KEY
        ) {
            console.error("Missing Supabase environment variables.");

            return jsonResponse(
                { error: "Server configuration error." },
                500
            );
        }

        // VERIFY CALLER SESSION
        const authorization = req.headers.get("Authorization");

        if (!authorization) {
            return jsonResponse(
                { error: "Unauthorized. Please log in." },
                401
            );
        }

        const supabaseUser = createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: authorization,
                    },
                },
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        );

        const {
            data: { user: caller },
            error: userError,
        } = await supabaseUser.auth.getUser();

        if (userError || !caller) {
            return jsonResponse(
                { error: "Invalid or expired administrator session." },
                401
            );
        }

        // VERIFY ADMIN ROLE
        const supabaseAdmin = createClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        );

        const { data: callerProfile, error: callerProfileError } =
            await supabaseAdmin
                .from("profiles")
                .select("id, role")
                .eq("id", caller.id)
                .maybeSingle();

        if (callerProfileError) {
            console.error(
                "Administrator profile lookup failed:",
                callerProfileError
            );

            return jsonResponse(
                { error: "Unable to verify administrator permissions." },
                500
            );
        }

        if (!callerProfile || callerProfile.role !== "admin") {
            return jsonResponse(
                { error: "Access denied. Administrator privileges required." },
                403
            );
        }

        // READ REQUEST BODY
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

        // VALIDATION
        if (!fullName || !email || !password) {
            return jsonResponse(
                { error: "Please provide the full name, email, and password." },
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
                { error: "Please provide a valid email address." },
                400
            );
        }

        if (password.length < 8) {
            return jsonResponse(
                { error: "Password must contain at least 8 characters." },
                400
            );
        }

        // CREATE AUTH USER
        const {
            data: newUserData,
            error: createUserError,
        } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
            },
        });

        if (createUserError || !newUserData.user) {
            console.error(
                "Auth user creation failed:",
                createUserError
            );

            return jsonResponse(
                {
                    error:
                        createUserError?.message ||
                        "Unable to create the administrator account.",
                },
                400
            );
        }

        createdUserId = newUserData.user.id;

        // CREATE OR UPDATE PROFILE
        // A database trigger may already have created this profile.
        // Upsert avoids a duplicate primary key conflict.
        const {
            data: profile,
            error: profileError,
        } = await supabaseAdmin
            .from("profiles")
            .upsert(
                {
                    id: createdUserId,
                    full_name: fullName,
                    role: "admin",
                },
                {
                    onConflict: "id",
                }
            )
            .select("id, full_name, role")
            .single();

        if (profileError || !profile) {
            console.error(
                "Profile creation failed:",
                profileError
            );

            // Roll back the newly created Auth account.
            const { error: rollbackError } =
                await supabaseAdmin.auth.admin.deleteUser(
                    createdUserId
                );

            if (rollbackError) {
                console.error(
                    "Auth rollback failed:",
                    rollbackError
                );
            }

            createdUserId = null;

            return jsonResponse(
                {
                    error:
                        "Profile creation failed. The new account could not be completed.",
                },
                500
            );
        }

        // SUCCESS
        console.log(
            "Administrator created successfully:",
            createdUserId
        );

        return jsonResponse(
            {
                success: true,
                message: "Administrator created successfully.",
                user: {
                    id: newUserData.user.id,
                    email: newUserData.user.email,
                    full_name: profile.full_name,
                    role: profile.role,
                },
            },
            200
        );

    } catch (error) {
        console.error("Create admin function error:", error);

        // Roll back if an unexpected error occurs after Auth creation.
        if (createdUserId) {
            try {
                const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
                const SERVICE_ROLE_KEY = Deno.env.get(
                    "SUPABASE_SERVICE_ROLE_KEY"
                );

                if (SUPABASE_URL && SERVICE_ROLE_KEY) {
                    const adminClient = createClient(
                        SUPABASE_URL,
                        SERVICE_ROLE_KEY,
                        {
                            auth: {
                                persistSession: false,
                                autoRefreshToken: false,
                            },
                        }
                    );

                    await adminClient.auth.admin.deleteUser(
                        createdUserId
                    );
                }
            } catch (rollbackError) {
                console.error(
                    "Unexpected error during rollback:",
                    rollbackError
                );
            }
        }

        return jsonResponse(
            {
                error: "An unexpected server error occurred.",
            },
            500
        );
    }
});
