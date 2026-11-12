
/* MOBILE NAVIGATION */

const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navigation.classList.toggle("show");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navigation.classList.remove("show");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.textContent = "☰";
        });
    });
}

/* ACTIVE TABLE OF CONTENTS */

const policySections = document.querySelectorAll(
    ".policy-section[id]"
);

const tocLinks = document.querySelectorAll(".toc a");

if (policySections.length && tocLinks.length) {
    const sectionObserver = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;

                    tocLinks.forEach(link => {
                        const isActive =
                            link.getAttribute("href") === `#${sectionId}`;

                        link.classList.toggle("active", isActive);
                    });
                }
            });
        },
        {
            rootMargin: "-18% 0px -70% 0px",
            threshold: 0
        }
    );

    policySections.forEach(section => {
        sectionObserver.observe(section);
    });
}

/* PRIVACY FEEDBACK FORM */

const feedbackForm = document.getElementById("privacyFeedbackForm");
const feedbackStatus = document.getElementById("feedbackStatus");

if (feedbackForm && feedbackStatus) {
    feedbackForm.addEventListener("submit", event => {
        event.preventDefault();

        if (!feedbackForm.reportValidity()) {
            return;
        }

        const name = document.getElementById("feedbackName").value.trim();
        const email = document.getElementById("feedbackEmail").value.trim();
        const subject = document.getElementById("feedbackSubject").value.trim();
        const message = document.getElementById("feedbackMessage").value.trim();

        if (!name || !email || !subject || !message) {
            showFeedbackStatus(
                "Please complete all required fields.",
                "error"
            );
            return;
        }

        const recipient = "support.ph@hsnservice.com";

        const emailSubject = encodeURIComponent(
            `[HSNP Privacy Policy Feedback] ${subject}`
        );

        const emailBody = encodeURIComponent(
`DATA PRIVACY POLICY FEEDBACK

Name: ${name}
Email Address: ${email}

Subject: ${subject}

Feedback:
${message}

--------------------------------
Submitted through the HSN Philippines Data Privacy Statement page.`
        );

        const mailtoLink =
            `mailto:${recipient}?subject=${emailSubject}&body=${emailBody}`;

        showFeedbackStatus(
            "Your email application will open with your feedback prepared. Please review and press Send to submit it.",
            "info"
        );

        window.location.href = mailtoLink;
    });
}

function showFeedbackStatus(message, type) {
    if (!feedbackStatus) return;

    feedbackStatus.textContent = message;
    feedbackStatus.className = `feedback-status show ${type}`;
}
