
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


/* ADMIN LOGIN MODAL */

const adminLoginTrigger = document.getElementById("adminLoginTrigger");
const mobileLoginTrigger = document.getElementById("mobileLoginTrigger");
const adminLoginModal = document.getElementById("adminLoginModal");
const closeAdminModal = document.getElementById("closeAdminModal");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminPassword = document.getElementById("adminPassword");
const togglePassword = document.getElementById("togglePassword");
const loginError = document.getElementById("loginError");

function openAdminLogin() {
    if (!adminLoginModal) return;

    adminLoginModal.classList.add("active");
    adminLoginModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
        document.getElementById("adminEmail")?.focus();
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

/* SHOW / HIDE PASSWORD */

togglePassword?.addEventListener("click", function() {
    const isPassword = adminPassword.type === "password";

    adminPassword.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "HIDE" : "SHOW";
});

