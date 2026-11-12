
/* =========================================
   HERO SLIDESHOW
========================================= */

const heroTrack = document.getElementById("heroTrack");

if (heroTrack) {
    const originalSlides = Array.from(heroTrack.children);
    const slideCount = originalSlides.length;

    originalSlides.forEach(slide => {
        heroTrack.appendChild(slide.cloneNode(true));
    });

    let currentIndex = 0;
    let isTransitioning = false;

    function moveToNextSlide() {
        if (isTransitioning) return;

        isTransitioning = true;
        currentIndex++;

        heroTrack.style.transition =
            "transform 1s cubic-bezier(0.77, 0, 0.175, 1)";

        heroTrack.style.transform =
            `translateX(-${currentIndex * 100}%)`;
    }

    heroTrack.addEventListener("transitionend", () => {
        if (currentIndex >= slideCount) {
            heroTrack.style.transition = "none";
            currentIndex = 0;
            heroTrack.style.transform = "translateX(0)";
            heroTrack.offsetHeight;
        }

        isTransitioning = false;
    });

    setInterval(moveToNextSlide, 5000);
}


/* =========================================
   MOBILE NAVIGATION
========================================= */

const menuToggle = document.getElementById("menuToggle");
const navigation = document.querySelector(".navigation");

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        navigation.classList.toggle("show");
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navigation.classList.remove("show");
        });
    });
}


/* =========================================
   SUPABASE CONFIGURATION
========================================= */

// Replace these with your actual Supabase credentials.
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

// Change this to your actual admin dashboard filename.
const ADMIN_DASHBOARD_URL = "YOUR_ADMIN_DASHBOARD_FILENAME.html";

let supabaseClient = null;

if (
    window.supabase &&
    SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" &&
    SUPABASE_PUBLISHABLE_KEY !== "YOUR_SUPABASE_PUBLISHABLE_KEY"
) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
}


/* =========================================
   ADMIN LOGIN MODAL
========================================= */

const adminLoginTrigger = document.getElementById("adminLoginTrigger");
const mobileLoginTrigger = document.getElementById("mobileLoginTrigger");
const adminLoginModal = document.getElementById("adminLoginModal");
const closeAdminModal = document.getElementById("closeAdminModal");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const togglePassword = document.getElementById("togglePassword");
const loginError = document.getElementById("loginError");
const adminLoginSubmit = document.getElementById("adminLoginSubmit");


function openAdminLogin() {
    if (!adminLoginModal) return;

    adminLoginModal.classList.add("active");
    adminLoginModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
        adminEmail?.focus();
    }, 200);
}


function closeAdminLogin() {
    if (!adminLoginModal) return;

    adminLoginModal.classList.remove("active");
    adminLoginModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (loginError) {
        loginError.classList.remove("show");
        loginError.textContent = "";
    }
}


adminLoginTrigger?.addEventListener("click", openAdminLogin);
mobileLoginTrigger?.addEventListener("click", openAdminLogin);
closeAdminModal?.addEventListener("click", closeAdminLogin);

adminLoginModal?.addEventListener("click", function(event) {
    if (event.target === adminLoginModal) {
        closeAdminLogin();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeAdminLogin();
    }
});


/* =========================================
   SHOW / HIDE PASSWORD
========================================= */

togglePassword?.addEventListener("click", function() {
    const isPassword = adminPassword.type === "password";

    adminPassword.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "HIDE" : "SHOW";
});


/* =========================================
   LOGIN ERROR HANDLER
========================================= */

function showLoginError(message) {
    if (!loginError) return;

    loginError.textContent = message;
    loginError.classList.add("show");
}


/* =========================================
   SUPABASE ADMIN LOGIN
========================================= */

adminLoginForm?.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showLoginError("Supabase is not configured. Please check the project credentials.");
        return;
    }

    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    if (!email || !password) {
        showLoginError("Please enter your email and password.");
        return;
    }

    if (loginError) {
        loginError.classList.remove("show");
        loginError.textContent = "";
    }

    if (adminLoginSubmit) {
        adminLoginSubmit.disabled = true;
        adminLoginSubmit.textContent = "SIGNING IN...";
    }

    try {
        // Step 1: Authenticate using Supabase Auth.
        const { data: authData, error: authError } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (authError) {
            throw new Error("Invalid email or password.");
        }

        const user = authData.user;

        if (!user) {
            throw new Error("Unable to verify your account.");
        }

        // Step 2: Check the user's role in the profiles table.
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("full_name, role")
                .eq("id", user.id)
                .single();

        if (profileError || !profile) {
            await supabaseClient.auth.signOut();
            throw new Error("Your account profile could not be found.");
        }

        // Step 3: Allow admins only.
        if (profile.role !== "admin") {
            await supabaseClient.auth.signOut();
            throw new Error("Access denied. This account does not have administrator privileges.");
        }

        // Step 4: Redirect after successful admin login.
        window.location.href = ADMIN_DASHBOARD_URL;

    } catch (error) {
        console.error("Admin login error:", error);
        showLoginError(error.message || "Something went wrong. Please try again.");

        if (adminLoginSubmit) {
            adminLoginSubmit.disabled = false;
            adminLoginSubmit.textContent = "LOGIN";
        }
    }
});
