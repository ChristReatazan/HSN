
/* =========================================
   HSN PHILIPPINES - CAREER APPLICATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const BUCKET_NAME = "career-resumes";
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    const supabase = window.supabaseClient;

    const careerListings = document.getElementById("careerListings");
    const applicationModal = document.getElementById("applicationModal");
    const applicationForm = document.getElementById("applicationForm");

    const closeModalButton = document.getElementById("closeApplicationModal");
    const submitButton = document.getElementById("submitApplication");

    const applicationCareerId = document.getElementById("applicationCareerId");
    const applicationPositionTitle = document.getElementById("applicationPositionTitle");
    const applicationMessage = document.getElementById("applicationMessage");

    if (!supabase) {
        console.error("Supabase client was not found. Check script.js.");
        if (careerListings) {
            careerListings.innerHTML =
                "<p>Unable to connect to the career database. Please try again later.</p>";
        }
        return;
    }

    let selectedCareer = null;

    /* =========================================
       LOAD PUBLISHED CAREERS
    ========================================= */

    async function loadCareers() {
        if (!careerListings) return;

        careerListings.innerHTML =
            '<p class="career-loading">Loading available positions...</p>';

        const { data, error } = await supabase
            .from("careers")
            .select("id,title,department,location,employment_type,description,requirements,created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Career loading error:", error);
            careerListings.innerHTML =
                "<p>Unable to load career opportunities. Please try again later.</p>";
            return;
        }

        if (!data || data.length === 0) {
            careerListings.innerHTML =
                "<p>There are currently no available positions.</p>";
            return;
        }

        careerListings.innerHTML = "";

        data.forEach(career => {
            const card = document.createElement("article");
            card.className = "career-card";

            const title = document.createElement("h3");
            title.textContent = career.title || "Untitled Position";

            const department = document.createElement("p");
            department.textContent = career.department || "Department not specified";

            const location = document.createElement("p");
            location.textContent = career.location || "Location not specified";

            const employment = document.createElement("p");
            employment.textContent = career.employment_type || "Employment type not specified";

            const description = document.createElement("p");
            description.textContent = career.description || "No description provided.";

            const applyButton = document.createElement("button");
            applyButton.type = "button";
            applyButton.className = "apply-now-button";
            applyButton.textContent = "Apply Now";

            applyButton.addEventListener("click", () => {
                openApplicationModal(career);
            });

            card.append(
                title,
                department,
                location,
                employment,
                description,
                applyButton
            );

            careerListings.appendChild(card);
        });
    }

    /* =========================================
       OPEN APPLICATION MODAL
    ========================================= */

    function openApplicationModal(career) {
        selectedCareer = career;

        applicationCareerId.value = career.id;
        applicationPositionTitle.textContent = career.title;

        applicationMessage.textContent = "";
        applicationMessage.className = "application-message";

        applicationForm.reset();
        applicationCareerId.value = career.id;

        applicationModal.classList.add("active");
        applicationModal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");
    }

    /* =========================================
       CLOSE APPLICATION MODAL
    ========================================= */

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
        if (event.key === "Escape" &&
            applicationModal.classList.contains("active")) {
            closeApplicationModal();
        }
    });

    /* =========================================
       VALIDATE RESUME
    ========================================= */

    function validateResume(file) {
        if (!file) {
            return "Please attach your resume.";
        }

        if (file.size > MAX_FILE_SIZE) {
            return "Resume must not exceed 5 MB.";
        }

        if (file.type !== "application/pdf" ||
            !file.name.toLowerCase().endsWith(".pdf")) {
            return "Only PDF files are accepted.";
        }

        return null;
    }

    /* =========================================
       UPLOAD RESUME
    ========================================= */

    async function uploadResume(file, careerId) {
        const safeName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(-120);

        const filePath =
            `${careerId}/${crypto.randomUUID()}-${safeName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                contentType: "application/pdf",
                upsert: false
            });

        if (error) {
            throw new Error("Resume upload failed: " + error.message);
        }

        return data.path;
    }

    /* =========================================
       SUBMIT APPLICATION
    ========================================= */

    applicationForm?.addEventListener("submit", async event => {
        event.preventDefault();

        if (!selectedCareer) {
            applicationMessage.textContent =
                "Please select a career position first.";
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

        if (!fullName || !contactNo || !address ||
            !Number.isFinite(expectedSalary) || expectedSalary <= 0) {
            applicationMessage.textContent =
                "Please complete all fields with valid information.";
            return;
        }

        if (resumeError) {
            applicationMessage.textContent = resumeError;
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        applicationMessage.textContent = "Uploading your application...";
        applicationMessage.className = "application-message";

        let uploadedPath = null;

        try {
            uploadedPath = await uploadResume(
                resumeFile,
                selectedCareer.id
            );

            const { error } = await supabase
                .from("career_applications")
                .insert([{
                    career_id: selectedCareer.id,
                    position_title: selectedCareer.title,
                    full_name: fullName,
                    contact_no: contactNo,
                    address: address,
                    expected_salary: expectedSalary,
                    resume_path: uploadedPath,
                    status: "Pending"
                }]);

            if (error) {
                throw new Error(error.message);
            }

            applicationMessage.textContent =
                "Your application has been submitted successfully!";

            applicationMessage.className =
                "application-message success";

            applicationForm.reset();
            applicationCareerId.value = selectedCareer.id;

            setTimeout(() => {
                closeApplicationModal();
            }, 1800);

        } catch (error) {
            console.error("Application submission error:", error);

            if (uploadedPath) {
                const { error: cleanupError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([uploadedPath]);

                if (cleanupError) {
                    console.error("Resume cleanup failed:", cleanupError);
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
