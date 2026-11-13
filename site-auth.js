/* HSN Philippines - shared admin login for all public pages */
(() => {
    "use strict";

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";
    const ADMIN_DASHBOARD_URL = "admin.html";

    const modal = document.getElementById("adminLoginModal");
    if (!modal) return;

    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");
    const form = document.getElementById("adminLoginForm");
    const errorBox = document.getElementById("loginError");
    const submitButton = document.getElementById("adminLoginSubmit");
    const passwordToggle = document.getElementById("togglePassword");

    const openModal = () => {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        window.setTimeout(() => emailInput?.focus(), 150);
    };

    const closeModal = () => {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (errorBox) {
            errorBox.textContent = "";
            errorBox.classList.remove("show");
        }
    };

    ["adminLoginTrigger", "mobileLoginTrigger", "siteLoginTrigger"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", openModal);
    });
    document.getElementById("closeAdminModal")?.addEventListener("click", closeModal);
    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("active")) closeModal();
    });

    passwordToggle?.addEventListener("click", () => {
        const show = passwordInput.type === "password";
        passwordInput.type = show ? "text" : "password";
        passwordToggle.textContent = show ? "HIDE" : "SHOW";
    });

    const showError = message => {
        if (!errorBox) return;
        errorBox.textContent = message;
        errorBox.classList.add("show");
    };

    form?.addEventListener("submit", async event => {
        event.preventDefault();
        if (!window.supabase) {
            showError("The login service is unavailable. Please refresh and try again.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = "<span>Signing in...</span>";
        if (errorBox) {
            errorBox.textContent = "";
            errorBox.classList.remove("show");
        }

        try {
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
            const { data, error } = await client.auth.signInWithPassword({
                email: emailInput.value.trim(),
                password: passwordInput.value
            });
            if (error || !data.user) throw new Error("Invalid email or password.");

            const { data: profile, error: profileError } = await client
                .from("profiles")
                .select("full_name, role")
                .eq("id", data.user.id)
                .single();

            if (profileError || !profile) {
                await client.auth.signOut();
                throw new Error("Your account profile could not be found.");
            }
            if (profile.role !== "admin") {
                await client.auth.signOut();
                throw new Error("Access denied. This account does not have administrator privileges.");
            }
            window.location.assign(ADMIN_DASHBOARD_URL);
        } catch (error) {
            showError(error.message || "Unable to sign in. Please try again.");
            submitButton.disabled = false;
            submitButton.innerHTML = "<span>Sign In to Admin Portal</span><span class=\"login-arrow\">→</span>";
        }
    });
})();
