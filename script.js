
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
