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

const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

const ADMIN_DASHBOARD_URL = "admin.html";

let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
}


/* =========================================
   ADMIN SESSION NAVIGATION
========================================= */

const adminLoginTrigger = document.getElementById("adminLoginTrigger");
const mobileLoginTrigger = document.getElementById("mobileLoginTrigger");
const adminLoginModal = document.getElementById("adminLoginModal");
const closeAdminModal = document.getElementById("closeAdminModal");

let adminPortalLink = null;
let sessionCheckInProgress = false;

function createAdminPortalLink() {
    if (!navigation) return null;

    let link = navigation.querySelector(".admin-portal-nav-link");

    if (!link) {
        link = document.createElement("a");
        link.href = ADMIN_DASHBOARD_URL;
        link.className = "admin-portal-nav-link";
        link.textContent = "Admin Portal";

        const careerLink = navigation.querySelector(
            'a[href="career.html"], a.career-nav-active'
        );

        if (careerLink) {
            careerLink.insertAdjacentElement("afterend", link);
        } else {
            navigation.appendChild(link);
        }
    }

    return link;
}

function showAdminNavigation(isAdmin) {
    if (adminLoginTrigger) {
        adminLoginTrigger.hidden = isAdmin;
        adminLoginTrigger.style.display = isAdmin ? "none" : "";
    }

    if (mobileLoginTrigger) {
        mobileLoginTrigger.hidden = isAdmin;
        mobileLoginTrigger.style.display = isAdmin ? "none" : "";
    }

    if (isAdmin) {
        adminPortalLink = createAdminPortalLink();

        if (adminPortalLink) {
            adminPortalLink.hidden = false;
            adminPortalLink.style.display = "";
        }
    } else if (adminPortalLink) {
        adminPortalLink.remove();
        adminPortalLink = null;
    }
}

async function refreshAdminNavigation() {
    if (!supabaseClient || sessionCheckInProgress) return;

    sessionCheckInProgress = true;

    try {
        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            showAdminNavigation(false);
            return;
        }

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .maybeSingle();

        if (profileError) {
            console.error(
                "Admin session profile verification error:",
                profileError
            );

            showAdminNavigation(false);
            return;
        }

        const isAdmin =
            profile &&
            String(profile.role).toLowerCase() === "admin";

        showAdminNavigation(Boolean(isAdmin));

    } catch (error) {
        console.error("Admin session verification error:", error);
        showAdminNavigation(false);
    } finally {
        sessionCheckInProgress = false;
    }
}

if (supabaseClient) {
    refreshAdminNavigation();

    supabaseClient.auth.onAuthStateChange((event) => {
        if (
            event === "SIGNED_IN" ||
            event === "SIGNED_OUT" ||
            event === "TOKEN_REFRESHED" ||
            event === "USER_UPDATED"
        ) {
            window.setTimeout(() => {
                refreshAdminNavigation();
            }, 0);
        }
    });
}


/* =========================================
   ADMIN LOGIN MODAL
========================================= */

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

    window.setTimeout(() => {
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

adminLoginModal?.addEventListener("click", event => {
    if (event.target === adminLoginModal) {
        closeAdminLogin();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeAdminLogin();
    }
});


/* =========================================
   SHOW / HIDE PASSWORD
========================================= */

togglePassword?.addEventListener("click", () => {
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

adminLoginForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!supabaseClient) {
        showLoginError(
            "Supabase is not configured. Please check the project credentials."
        );
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
        const { data: authData, error: authError } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (authError) {
            throw new Error("Invalid email or password.");
        }

        const user = authData.user;

        if (!user) {
            throw new Error("Unable to verify your account.");
        }

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("full_name, role")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            throw new Error(
                "Unable to verify your administrator profile. Please try again."
            );
        }

        if (
            !profile ||
            String(profile.role).toLowerCase() !== "admin"
        ) {
            await supabaseClient.auth.signOut();

            throw new Error(
                "Access denied. This account does not have administrator privileges."
            );
        }

        window.location.href = ADMIN_DASHBOARD_URL;

    } catch (error) {
        console.error("Admin login error:", error);
        showLoginError(
            error.message || "Something went wrong. Please try again."
        );

        if (adminLoginSubmit) {
            adminLoginSubmit.disabled = false;
            adminLoginSubmit.textContent = "Sign In to Admin Portal";
        }
    }
});
