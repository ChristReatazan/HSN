
/* =========================================
   HSN PHILIPPINES - CAREER APPLICATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const BUCKET_NAME = "career-resumes";
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    const supabaseClient =
        window.supabaseClient ||
        (typeof window.supabase !== "undefined" &&
         window.supabase.createClient
            ? window.supabase.createClient(
                "https://qpcsskiocfeeodunpcxa.supabase.co",
                "sb_publishable_oiJHNFvDHWa-aATe_HWJoQ_RLB2m8BZ"
            )
            : null);

    const careerListings = document.getElementById("careerListings");
    const applicationModal = document.getElementById("applicationModal");
    const applicationForm = document.getElementById("applicationForm");

    const closeModalButton = document.getElementById("closeApplicationModal");
    const submitButton = document.getElementById("submitApplication");

    const careerIdInput = document.getElementById("applicationCareerId");
    const positionTitle = document.getElementById("applicationPositionTitle");
    const applicationMessage = document.getElementById("applicationMessage");

    if (!supabaseClient) {
        console.error("Supabase client unavailable.");

        if (careerListings) {
            careerListings.textContent =
                "Unable to connect to the career database.";
        }

        return;
    }

    let selectedCareer = null;

    function createElement(tag, className, content) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (content !== undefined) element.textContent = content;

        return element;
    }

    async function loadCareers() {
        if (!careerListings) return;

        careerListings.innerHTML =
            '<p class="career-loading">Loading available positions...</p>';

        const { data, error } = await supabaseClient
            .from("careers")
            .select("*")
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Career loading error:", error);
            careerListings.innerHTML =
                '<p class="career-error">Unable to load available positions.</p>';
            return;
        }

        careerListings.innerHTML = "";

        if (!data || data.length === 0) {
            careerListings.innerHTML =
                '<p class="career-empty">There are currently no available positions.</p>';
            return;
        }

        data.forEach(career => {
            const card = createElement("article", "career-card");

            card.appendChild(
                createElement("h3", "", career.title || "Untitled Position")
            );

            const meta = createElement("div", "career-meta");

            if (career.department) {
                meta.appendChild(createElement("span", "", career.department));
            }

            if (career.location) {
                meta.appendChild(createElement("span", "", career.location));
            }

            if (career.employment_type) {
                meta.appendChild(createElement("span", "", career.employment_type));
            }

            card.appendChild(meta);

            card.appendChild(
                createElement(
                    "p",
                    "career-description",
                    career.description || "No description provided."
                )
            );

            if (career.requirements) {
                card.appendChild(createElement("h4", "", "Requirements"));

                const requirements = Array.isArray(career.requirements)
                    ? career.requirements.join("\n")
                    : String(career.requirements);

                card.appendChild(
                    createElement("p", "career-requirements", requirements)
                );
            }

            const applyButton = createElement(
                "button",
                "apply-now-button",
                "Apply Now"
            );

            applyButton.type = "button";
            applyButton.addEventListener("click", () => {
                openApplicationModal(career);
            });

            card.appendChild(applyButton);
            careerListings.appendChild(card);
        });
    }

    function openApplicationModal(career) {
        selectedCareer = career;

        applicationForm.reset();

        careerIdInput.value = career.id;
        positionTitle.textContent = career.title || "Selected Position";

        applicationMessage.textContent = "";
        applicationMessage.className = "application-message";

        applicationModal.classList.add("active");
        applicationModal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");
    }

    function closeApplicationModal() {
        applicationModal.classList.remove("active");
        applicationModal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal-open");

        applicationForm.reset();
        applicationMessage.textContent = "";

        selectedCareer = null;
    }

    closeModalButton?.addEventListener("click", closeApplicationModal);

    applicationModal?.addEventListener("click", event => {
        if (event.target === applicationModal) {
            closeApplicationModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            applicationModal.classList.contains("active")
        ) {
            closeApplicationModal();
        }
    });

    function validateResume(file) {
        if (!file) return "Please attach your resume.";

        if (file.size > MAX_FILE_SIZE) {
            return "Resume must not exceed 5 MB.";
        }

        if (
            file.type !== "application/pdf" ||
            !file.name.toLowerCase().endsWith(".pdf")
        ) {
            return "Only PDF files are accepted.";
        }

        return null;
    }

    async function uploadResume(file, careerId) {
        const safeName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(-120);

        const filePath =
            `${careerId}/${crypto.randomUUID()}-${safeName}`;

        const { data, error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                contentType: "application/pdf",
                upsert: false
            });

        if (error) throw error;

        return data.path;
    }

    applicationForm?.addEventListener("submit", async event => {
        event.preventDefault();

        if (!selectedCareer) {
            applicationMessage.textContent =
                "Please select a position before submitting.";
            return;
        }

        const fullName =
            document.getElementById("applicantFullName").value.trim();

        const contactNo =
            document.getElementById("applicantContact").value.trim();

        const address =
            document.getElementById("applicantAddress").value.trim();

        const expectedSalary =
            Number(document.getElementById("applicantSalary").value);

        const resumeFile =
            document.getElementById("applicantResume").files[0];

        const resumeError = validateResume(resumeFile);

        if (
            !fullName ||
            !contactNo ||
            !address ||
            !Number.isFinite(expectedSalary) ||
            expectedSalary <= 0
        ) {
            applicationMessage.textContent =
                "Please complete all fields correctly.";
            applicationMessage.className = "application-message error";
            return;
        }

        if (resumeError) {
            applicationMessage.textContent = resumeError;
            applicationMessage.className = "application-message error";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        applicationMessage.textContent = "Submitting your application...";
        applicationMessage.className = "application-message";

        let uploadedPath = null;

        try {
            uploadedPath = await uploadResume(
                resumeFile,
                selectedCareer.id
            );

            const { error } = await supabaseClient
                .from("career_applications")
                .insert({
                    career_id: selectedCareer.id,
                    position_title: selectedCareer.title,
                    full_name: fullName,
                    contact_no: contactNo,
                    address: address,
                    expected_salary: expectedSalary,
                    resume_path: uploadedPath,
                    status: "Pending"
                });

            if (error) throw error;

            applicationMessage.textContent =
                "Your application has been submitted successfully!";

            applicationMessage.className =
                "application-message success";

            applicationForm.reset();

            setTimeout(closeApplicationModal, 1800);

        } catch (error) {
            console.error("Application submission error:", error);

            if (uploadedPath) {
                const { error: cleanupError } =
                    await supabaseClient.storage
                        .from(BUCKET_NAME)
                        .remove([uploadedPath]);

                if (cleanupError) {
                    console.error("Resume cleanup error:", cleanupError);
                }
            }

            applicationMessage.textContent =
                error.message || "Unable to submit your application.";

            applicationMessage.className =
                "application-message error";

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Application";
        }
    });

    loadCareers();
});
