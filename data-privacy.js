
// =====================================================
// HSN PHILIPPINES - DATA PRIVACY JAVASCRIPT
// Navigation + Supabase Feedback Submission
// =====================================================


// =====================================================
// 1. SUPABASE CONFIGURATION
// =====================================================

const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

let supabaseClient = null;

if (window.supabase && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL"
    && SUPABASE_PUBLISHABLE_KEY !== "YOUR_SUPABASE_PUBLISHABLE_KEY") {

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

} else {
    console.error(
        "Supabase is not configured. Check your Project URL and Publishable Key."
    );
}


// =====================================================
// 2. MOBILE NAVIGATION
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const menuToggle = document.getElementById("menuToggle");
    const navigation = document.getElementById("navigation");

    if (menuToggle && navigation) {

        menuToggle.addEventListener("click", function () {

            const isOpen = navigation.classList.toggle("active");

            menuToggle.setAttribute("aria-expanded", isOpen);

            menuToggle.innerHTML = isOpen ? "&times;" : "☰";

        });

        // Close menu when a navigation link is clicked
        navigation.querySelectorAll("a").forEach(function (link) {

            link.addEventListener("click", function () {

                navigation.classList.remove("active");

                menuToggle.setAttribute("aria-expanded", "false");

                menuToggle.innerHTML = "☰";

            });

        });

        // Close menu when clicking outside
        document.addEventListener("click", function (event) {

            if (
                !navigation.contains(event.target) &&
                !menuToggle.contains(event.target)
            ) {

                navigation.classList.remove("active");

                menuToggle.setAttribute("aria-expanded", "false");

                menuToggle.innerHTML = "☰";

            }

        });

    }


    // =====================================================
    // 3. PRIVACY FEEDBACK FORM
    // =====================================================

    const feedbackForm = document.getElementById("privacyFeedbackForm");

    const feedbackStatus = document.getElementById("feedbackStatus");

    const submitButton = feedbackForm
        ? feedbackForm.querySelector('button[type="submit"]')
        : null;


    if (feedbackForm) {

        feedbackForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            // Check Supabase connection
            if (!supabaseClient) {

                feedbackStatus.textContent =
                    "Database connection is not configured. Please contact the administrator.";

                feedbackStatus.style.color = "#dc3545";

                console.error("Supabase client is unavailable.");

                return;

            }


            // Get form values
            const name = document.getElementById("feedbackName").value.trim();

            const email = document.getElementById("feedbackEmail").value.trim();

            const subject = document.getElementById("feedbackSubject").value.trim();

            const message = document.getElementById("feedbackMessage").value.trim();


            // Validate fields
            if (!name || !email || !subject || !message) {

                feedbackStatus.textContent =
                    "Please complete all required fields.";

                feedbackStatus.style.color = "#dc3545";

                return;

            }


            if (name.length > 120 ||
                email.length > 254 ||
                subject.length > 150 ||
                message.length > 5000) {

                feedbackStatus.textContent =
                    "One or more fields exceed the allowed character limit.";

                feedbackStatus.style.color = "#dc3545";

                return;

            }


            // Validate email
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {

                feedbackStatus.textContent =
                    "Please enter a valid email address.";

                feedbackStatus.style.color = "#dc3545";

                return;

            }


            // Disable button while submitting
            submitButton.disabled = true;

            submitButton.textContent = "Submitting...";

            feedbackStatus.textContent =
                "Please wait while we submit your feedback...";

            feedbackStatus.style.color = "#64748b";


            try {

                // Insert directly into Supabase
                // No SELECT request is needed after insertion.

                const { error } = await supabaseClient
                    .from("privacy_feedback")
                    .insert({
                        name: name,
                        email: email,
                        subject: subject,
                        message: message
                    });


                if (error) {

                    console.error("Supabase submission error:", error);

                    throw error;

                }


                // Successful submission
                feedbackStatus.textContent =
                    "Thank you! Your feedback has been successfully submitted.";

                feedbackStatus.style.color = "#00A878";

                feedbackForm.reset();


            } catch (error) {

                console.error("Feedback submission failed:", error);

                feedbackStatus.textContent =
                    "Unable to submit your feedback. " +
                    "Please try again later.";

                feedbackStatus.style.color = "#dc3545";


            } finally {

                submitButton.disabled = false;

                submitButton.innerHTML =
                    'Send Feedback <span>→</span>';

            }

        });

    }

});
