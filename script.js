
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
const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

// Change this to your actual admin dashboard filename.
const ADMIN_DASHBOARD_URL = "admin.html";

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
