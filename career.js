
/* =========================================
   HSN PHILIPPINES - CAREER PAGE
   SUPABASE CAREER LISTINGS
   CAREER APPLICATION SYSTEM
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================
       CONFIGURATION
    ========================================= */

    const CAREERS_TABLE = "careers";
    const APPLICATIONS_TABLE = "career_applications";
    const RESUME_BUCKET = "career-resumes";
    const MAX_RESUME_SIZE = 5 * 1024 * 1024;

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase client is not available.");
        return;
    }

    /* =========================================
       DOM ELEMENTS
    ========================================= */

    const careerGrid = document.getElementById("publicCareerGrid");

    const detailModal = document.getElementById("careerDetailModal");
    const closeDetails = document.getElementById("closeCareerDetails");
    const closeDetailsBottom = document.getElementById("closeCareerDetailsBottom");

    const detailTitle = document.getElementById("detailTitle");
    const detailMeta = document.getElementById("detailMeta");
    const detailDescription = document.getElementById("detailDescription");
    const requirementsSection = document.getElementById("requirementsSection");
    const detailRequirements = document.getElementById("detailRequirements");

    const searchInput =
        document.getElementById("careerSearch") ||
        document.getElementById("searchCareers");

    const departmentFilter =
        document.getElementById("departmentFilter");

    /* =========================================
       APPLICATION ELEMENTS
    ========================================= */

    const applicationModal = document.getElementById("applicationModal");
    const applicationForm = document.getElementById("careerApplicationForm");

    const closeApplication = document.getElementById("closeApplicationModal");

    const applicationCareerId = document.getElementById("applicationCareerId");
    const applicationPosition = document.getElementById("applicationPosition");

    const applicantFullName = document.getElementById("applicantFullName");
    const applicantContact = document.getElementById("applicantContact");
    const applicantAddress = document.getElementById("applicantAddress");
    const applicantSalary = document.getElementById("applicantSalary");
    const applicantResume = document.getElementById("applicantResume");

    const submitApplication = document.getElementById("submitApplication");
    const applicationMessage = document.getElementById("applicationMessage");

    /* =========================================
       STATE
    ========================================= */

    let careers = [];
    let filteredCareers = [];

    /* =========================================
       SECURITY HELPERS
    ========================================= */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    function safeFileName(name) {
        return String(name)
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(-150);
    }

    /* =========================================
       CAREER LOADING
    ========================================= */

    async function loadCareers() {
        if (!careerGrid) {
            console.error("Career grid element not found.");
            return;
        }

        careerGrid.innerHTML = `
            <div class="career-loading">
                <p>Loading available positions...</p>
            </div>
        `;

        try {
            const { data, error } = await supabase
                .from(CAREERS_TABLE)
                .select(`
                    id,
                    title,
                    department,
                    location,
                    employment_type,
                    description,
                    requirements,
                    is_published,
                    created_at
                `)
                .eq("is_published", true)
                .order("created_at", { ascending: false });

            if (error) throw error;

            careers = data || [];
            filteredCareers = [...careers];

            renderCareers();

        } catch (error) {
            console.error("Career loading error:", error);

            careerGrid.innerHTML = `
                <div class="career-empty">
                    <h3>Unable to load careers</h3>
                    <p>Please refresh the page and try again.</p>
                </div>
            `;
        }
    }

    /* =========================================
       CAREER RENDERING
    ========================================= */

    function renderCareers() {
        if (!careerGrid) return;

        if (!filteredCareers.length) {
            careerGrid.innerHTML = `
                <div class="career-empty">
                    <h3>No available positions</h3>
                    <p>Please check again later for new opportunities.</p>
                </div>
            `;

            return;
        }

        careerGrid.innerHTML = filteredCareers.map(career => {
            const title = escapeHTML(career.title);
            const department = escapeHTML(career.department || "General");
            const location = escapeHTML(career.location || "Not specified");
            const employment = escapeHTML(career.employment_type || "Full-time");
            const description = escapeHTML(
                career.description || "No description available."
            );

            return `
                <article class="career-card">
                    <div class="career-card-content">

                        <div class="career-card-meta">
                            <span>${department}</span>
                            <span>${employment}</span>
                        </div>

                        <h3>${title}</h3>

                        <p class="career-location">${location}</p>

                        <p class="career-description">${description}</p>

                    </div>

                    <div class="career-card-actions">

                        <button
                            type="button"
                            class="view-career-btn"
                            data-id="${escapeHTML(career.id)}"
                        >
                            View Details
                        </button>

                        <button
                            type="button"
                            class="apply-career-btn"
                            data-id="${escapeHTML(career.id)}"
                        >
                            Apply Now
                        </button>

                    </div>
                </article>
            `;
        }).join("");
    }

    /* =========================================
       CAREER SEARCH
    ========================================= */

    function filterCareers() {
        const searchTerm = searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

        const department = departmentFilter
            ? departmentFilter.value.toLowerCase()
            : "";

        filteredCareers = careers.filter(career => {
            const searchableText = [
                career.title,
                career.department,
                career.location,
                career.employment_type,
                career.description
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm);

            const matchesDepartment =
                !department ||
                department === "all" ||
                String(career.department || "").toLowerCase() === department;

            return matchesSearch && matchesDepartment;
        });

        renderCareers();
    }

    searchInput?.addEventListener("input", filterCareers);
    departmentFilter?.addEventListener("change", filterCareers);

    /* =========================================
       CAREER DETAILS MODAL
    ========================================= */

    function openCareerDetails(career) {
        if (!detailModal) return;

        if (detailTitle) {
            detailTitle.textContent = career.title || "";
        }

        if (detailMeta) {
            detailMeta.textContent = [
                career.department,
                career.location,
                career.employment_type
            ].filter(Boolean).join(" • ");
        }

        if (detailDescription) {
            detailDescription.textContent =
                career.description || "No description available.";
        }

        if (detailRequirements) {
            const requirements = Array.isArray(career.requirements)
                ? career.requirements
                : String(career.requirements || "")
                    .split("\n")
                    .filter(Boolean);

            detailRequirements.innerHTML = requirements.length
                ? requirements.map(item =>
                    `<li>${escapeHTML(item)}</li>`
                ).join("")
                : "<li>No requirements specified.</li>";
        }

        if (requirementsSection) {
            requirementsSection.style.display = "block";
        }

        detailModal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeCareerDetails() {
        detailModal?.classList.remove("active");
        document.body.style.overflow = "";
    }

    closeDetails?.addEventListener("click", closeCareerDetails);
    closeDetailsBottom?.addEventListener("click", closeCareerDetails);

    detailModal?.addEventListener("click", event => {
        if (event.target === detailModal) {
            closeCareerDetails();
        }
    });

    /* =========================================
       APPLICATION MODAL
    ========================================= */

    function showApplicationMessage(text, success = false) {
        if (!applicationMessage) return;

        applicationMessage.textContent = text;
        applicationMessage.style.color = success
            ? "#087d5b"
            : "#dc2626";
    }

    function openApplication(career) {
        if (!applicationModal || !applicationForm) {
            console.error("Application modal is missing from career.html.");
            return;
        }

        applicationForm.reset();

        if (applicationCareerId) {
            applicationCareerId.value = career.id;
        }

        if (applicationPosition) {
            applicationPosition.textContent = career.title;
        }

        showApplicationMessage("");

        applicationModal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeApplicationModal() {
        applicationModal?.classList.remove("active");
        document.body.style.overflow = "";
    }

    closeApplication?.addEventListener("click", closeApplicationModal);

    applicationModal?.addEventListener("click", event => {
        if (event.target === applicationModal) {
            closeApplicationModal();
        }
    });

    /* =========================================
       CAREER CARD BUTTON EVENTS
    ========================================= */

    careerGrid?.addEventListener("click", event => {
        const detailsButton = event.target.closest(".view-career-btn");
        const applyButton = event.target.closest(".apply-career-btn");

        if (detailsButton) {
            const career = careers.find(item =>
                String(item.id) === String(detailsButton.dataset.id)
            );

            if (career) {
                openCareerDetails(career);
            }

            return;
        }

        if (applyButton) {
            const career = careers.find(item =>
                String(item.id) === String(applyButton.dataset.id)
            );

            if (career) {
                openApplication(career);
            }
        }
    });

    /* =========================================
       NUMBER 5 - RESUME VALIDATION
    ========================================= */

    function validateResume(file) {
        if (!file) {
            return "Please upload your resume.";
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return "Only PDF files are accepted.";
        }

        if (file.type && file.type !== "application/pdf") {
            return "Invalid file type. Please upload a PDF.";
        }

        if (file.size > MAX_RESUME_SIZE) {
            return "Resume must not exceed 5 MB.";
        }

        if (file.size === 0) {
            return "The uploaded file is empty.";
        }

        return null;
    }

    /* =========================================
       APPLICATION SUBMISSION
    ========================================= */

    applicationForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const careerId = applicationCareerId?.value.trim();
        const fullName = applicantFullName?.value.trim();
        const contact = applicantContact?.value.trim();
        const address = applicantAddress?.value.trim();
        const salary = Number(applicantSalary?.value);
        const resume = applicantResume?.files?.[0];

        if (!careerId || !fullName || !contact || !address) {
            showApplicationMessage("Please complete all required fields.");
            return;
        }

        if (!Number.isFinite(salary) || salary <= 0) {
            showApplicationMessage("Please enter a valid expected salary.");
            return;
        }

        const resumeError = validateResume(resume);

        if (resumeError) {
            showApplicationMessage(resumeError);
            return;
        }

        const career = careers.find(item =>
            String(item.id) === String(careerId)
        );

        if (!career) {
            showApplicationMessage(
                "The selected position is no longer available."
            );
            return;
        }

        if (!submitApplication) return;

        submitApplication.disabled = true;
        submitApplication.textContent = "Submitting...";

        let uploadedPath = null;

        try {
            const { data: verifiedCareer, error: careerError } =
                await supabase
                    .from(CAREERS_TABLE)
                    .select("id,title,is_published")
                    .eq("id", careerId)
                    .eq("is_published", true)
                    .single();

            if (careerError || !verifiedCareer) {
                throw new Error(
                    "This position is no longer accepting applications."
                );
            }

            const uniqueFileName =
                `${crypto.randomUUID()}-${safeFileName(resume.name)}`;

            const { error: uploadError } = await supabase.storage
                .from(RESUME_BUCKET)
                .upload(uniqueFileName, resume, {
                    contentType: "application/pdf",
                    upsert: false
                });

            if (uploadError) throw uploadError;

            uploadedPath = uniqueFileName;

            const { error: insertError } = await supabase
                .from(APPLICATIONS_TABLE)
                .insert({
                    career_id: verifiedCareer.id,
                    position_title: verifiedCareer.title,
                    full_name: fullName,
                    contact_no: contact,
                    address: address,
                    expected_salary: salary,
                    resume_path: uploadedPath
                });

            if (insertError) throw insertError;

            showApplicationMessage(
                "Your application has been submitted successfully!",
                true
            );

            applicationForm.reset();

            setTimeout(() => {
                closeApplicationModal();
            }, 1800);

        } catch (error) {
            console.error("Application submission error:", error);

            if (uploadedPath) {
                const { error: cleanupError } = await supabase.storage
                    .from(RESUME_BUCKET)
                    .remove([uploadedPath]);

                if (cleanupError) {
                    console.error("Resume cleanup failed:", cleanupError);
                }
            }

            showApplicationMessage(
                error.message || "Unable to submit your application."
            );

        } finally {
            submitApplication.disabled = false;
            submitApplication.textContent = "Submit Application";
        }
    });

    /* =========================================
       ESCAPE KEY
    ========================================= */

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeCareerDetails();
            closeApplicationModal();
        }
    });

    /* =========================================
       INITIALIZATION
    ========================================= */

    loadCareers();

});
