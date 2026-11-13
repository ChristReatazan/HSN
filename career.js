/* =========================================
   HSN PHILIPPINES - CAREER PAGE
   SUPABASE CAREERS + APPLICATION SYSTEM
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    /* =========================================
       SUPABASE CONFIGURATION
    ========================================= */

    const CAREERS_TABLE = "careers";
    const APPLICATIONS_TABLE = "career_applications";
    const RESUME_BUCKET = "career-resumes";
    const MAX_RESUME_SIZE = 5 * 1024 * 1024;

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        console.error("HSN Careers: Supabase client is unavailable.");
        showLoadError("Career opportunities are temporarily unavailable. Please try again later.");
        return;
    }

    /* =========================================
       ELEMENT REFERENCES
    ========================================= */

    const careerGrid = document.getElementById("publicCareerGrid");
    const careerCount = document.getElementById("publicCareerCount");
    const careerSearch = document.getElementById("publicCareerSearch");
    const departmentFilter = document.getElementById("publicCareerDepartment");
    const resultsLabel = document.getElementById("careerResultsLabel");
    const lastUpdated = document.getElementById("careerLastUpdated");
    const noResults = document.getElementById("careerNoResults");
    const clearFiltersButton = document.getElementById("clearCareerFilters");

    const detailModal = document.getElementById("careerDetailModal");
    const closeDetailsButton = document.getElementById("closeCareerDetails");
    const closeDetailsBottom = document.getElementById("closeCareerDetailsBottom");

    const detailTitle = document.getElementById("detailTitle");
    const detailMeta = document.getElementById("detailMeta");
    const detailDescription = document.getElementById("detailDescription");
    const detailRequirements = document.getElementById("detailRequirements");
    const requirementsSection = document.getElementById("requirementsSection");

    const careerDetailsContent = document.getElementById("careerDetailsContent");
    const applicationPanel = document.getElementById("careerApplicationPanel");
    const applicationSuccess = document.getElementById("careerApplicationSuccess");

    const openApplicationButton = document.getElementById("openApplicationForm");
    const backToDetailsButton = document.getElementById("backToCareerDetails");
    const cancelApplicationButton = document.getElementById("cancelCareerApplication");
    const closeApplicationSuccessButton = document.getElementById("closeApplicationSuccess");

    const applicationForm = document.getElementById("careerApplicationForm");
    const applicationMessage = document.getElementById("careerApplicationMessage");
    const submitApplicationButton = document.getElementById("submitCareerApplication");

    const applicantFullName = document.getElementById("applicantFullName");
    const applicantEmail = document.getElementById("applicantEmail");
    const applicantContact = document.getElementById("applicantContact");
    const applicantAddress = document.getElementById("applicantAddress");
    const applicantExpectedSalary = document.getElementById("applicantExpectedSalary");
    const applicantResume = document.getElementById("applicantResume");
    const applicantCoverLetter = document.getElementById("applicantCoverLetter");

    const resumeFileName = document.getElementById("resumeFileName");

    const applicationPositionTitle = document.getElementById("applicationPositionTitle");
    const applicationPositionMeta = document.getElementById("applicationPositionMeta");
    const successPositionTitle = document.getElementById("successPositionTitle");

    /* =========================================
       APPLICATION STATE
    ========================================= */

    let careers = [];
    let activeCareer = null;
    let realtimeChannel = null;
    let previousFocus = null;
    let isSubmittingApplication = false;

    /* =========================================
       SAFE TEXT HANDLING
    ========================================= */

    function escapeHTML(value) {

        return String(value ?? "").replace(/[&<>"']/g, character => {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];

        });

    }

    /* =========================================
       DATE FORMATTING
    ========================================= */

    function formatDate(value) {

        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(date);

    }

    function formatUpdatedTime() {

        return new Intl.DateTimeFormat("en-PH", {
            hour: "numeric",
            minute: "2-digit"
        }).format(new Date());

    }

    /* =========================================
       LOADING STATE
    ========================================= */

    function showLoading() {

        careerGrid.innerHTML = `
            <div class="career-loading-state">
                <span class="career-loader"></span>
                <p>Loading available opportunities...</p>
            </div>
        `;

        noResults.hidden = true;

    }

    /* =========================================
       ERROR STATE
    ========================================= */

    function showLoadError(message) {

        careerGrid.innerHTML = `
            <div class="career-loading-state">
                <p>${escapeHTML(message)}</p>
            </div>
        `;

        noResults.hidden = true;

        if (careerCount) {
            careerCount.textContent = "—";
        }

    }

    /* =========================================
       FETCH PUBLISHED CAREERS
    ========================================= */

    async function loadCareers(showLoader = true) {

        if (showLoader) {
            showLoading();
        }

        try {

            const { data, error } = await supabaseClient
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
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            careers = data || [];

            populateDepartments();
            renderCareers();

            if (lastUpdated) {
                lastUpdated.textContent = `Updated ${formatUpdatedTime()}`;
            }

        } catch (error) {

            console.error("HSN Careers loading error:", error);

            showLoadError(
                "We are unable to load career opportunities right now. Please try again later."
            );

        }

    }

    /* =========================================
       DEPARTMENT FILTER
    ========================================= */

    function populateDepartments() {

        if (!departmentFilter) return;

        const currentValue = departmentFilter.value;

        const departments = [
            ...new Set(
                careers
                    .map(career => career.department?.trim())
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));

        departmentFilter.innerHTML = `
            <option value="all">All Departments</option>

            ${departments.map(department => `
                <option value="${escapeHTML(department)}">
                    ${escapeHTML(department)}
                </option>
            `).join("")}
        `;

        departmentFilter.value = departments.includes(currentValue)
            ? currentValue
            : "all";

    }

    /* =========================================
       SEARCH AND FILTER LOGIC
    ========================================= */

    function getFilteredCareers() {

        const searchTerm = careerSearch.value.trim().toLowerCase();
        const selectedDepartment = departmentFilter.value;

        return careers.filter(career => {

            const searchableText = [
                career.title,
                career.department,
                career.location,
                career.employment_type,
                career.description,
                career.requirements
            ].join(" ").toLowerCase();

            const matchesSearch =
                !searchTerm || searchableText.includes(searchTerm);

            const matchesDepartment =
                selectedDepartment === "all" ||
                career.department === selectedDepartment;

            return matchesSearch && matchesDepartment;

        });

    }

    /* =========================================
       RENDER CAREER CARDS
    ========================================= */

    function renderCareers() {

        const filteredCareers = getFilteredCareers();

        careerCount.textContent = careers.length;

        if (resultsLabel) {

            resultsLabel.textContent =
                filteredCareers.length === careers.length
                    ? "AVAILABLE POSITIONS"
                    : `SHOWING ${filteredCareers.length} OF ${careers.length} POSITIONS`;

        }

        if (filteredCareers.length === 0) {

            careerGrid.innerHTML = "";
            noResults.hidden = false;

            return;

        }

        noResults.hidden = true;

        careerGrid.innerHTML = filteredCareers.map(career => {

            const jobDate = formatDate(career.created_at);

            return `
                <article class="career-card">

                    <div class="career-card-top">

                        <span class="career-card-department">
                            ${escapeHTML(career.department)}
                        </span>

                        <span class="career-card-type">
                            ${escapeHTML(career.employment_type)}
                        </span>

                    </div>

                    <h3>${escapeHTML(career.title)}</h3>

                    <div class="career-card-meta">

                        <span>
                            <b>⌖</b>
                            ${escapeHTML(career.location)}
                        </span>

                        <span>
                            <b>◷</b>
                            ${escapeHTML(career.employment_type)}
                        </span>

                    </div>

                    <p class="career-card-description">
                        ${escapeHTML(career.description)}
                    </p>

                    <div class="career-card-footer">

                        <span class="career-card-date">
                            ${jobDate ? `Posted ${escapeHTML(jobDate)}` : "Career Opportunity"}
                        </span>

                        <button
                            type="button"
                            class="career-view-button"
                            data-career-id="${escapeHTML(career.id)}"
                        >
                            View Details
                            <span>→</span>
                        </button>

                    </div>

                </article>
            `;

        }).join("");

    }

    /* =========================================
       OPEN CAREER DETAILS
    ========================================= */

    function openCareerDetails(careerId) {

        const career = careers.find(item =>
            String(item.id) === String(careerId)
        );

        if (!career) return;

        activeCareer = career;
        previousFocus = document.activeElement;

        detailTitle.textContent = career.title || "Position Details";

        detailMeta.innerHTML = `
            <span>Department: ${escapeHTML(career.department)}</span>
            <span>Location: ${escapeHTML(career.location)}</span>
            <span>Employment: ${escapeHTML(career.employment_type)}</span>
        `;

        detailDescription.textContent =
            career.description || "No job description provided.";

        if (career.requirements && career.requirements.trim()) {

            detailRequirements.textContent = career.requirements;
            detailRequirements.style.whiteSpace = "pre-line";
            requirementsSection.hidden = false;

        } else {

            detailRequirements.textContent = "";
            requirementsSection.hidden = true;

        }

        applicationPositionTitle.textContent = career.title || "Position";
        applicationPositionMeta.textContent = [
            career.department,
            career.location,
            career.employment_type
        ].filter(Boolean).join(" • ");

        successPositionTitle.textContent = career.title || "Position";

        showDetailsView();

        detailModal.classList.add("active");
        detailModal.setAttribute("aria-hidden", "false");

        document.body.style.overflow = "hidden";

        closeDetailsButton.focus();

    }

    /* =========================================
       MODAL VIEW MANAGEMENT
    ========================================= */

    function showDetailsView() {

        careerDetailsContent.hidden = false;
        applicationPanel.hidden = true;
        applicationSuccess.hidden = true;

    }

    function showApplicationView() {

        if (!activeCareer) return;

        careerDetailsContent.hidden = true;
        applicationPanel.hidden = false;
        applicationSuccess.hidden = true;

        clearApplicationMessage();

        applicantFullName.focus();

    }

    function showApplicationSuccess() {

        careerDetailsContent.hidden = true;
        applicationPanel.hidden = true;
        applicationSuccess.hidden = false;

        successPositionTitle.textContent =
            activeCareer?.title || "Position";

        closeApplicationSuccessButton.focus();

    }

    /* =========================================
       CLOSE CAREER DETAILS
    ========================================= */

    function closeCareerDetails() {

        if (!detailModal.classList.contains("active")) return;

        if (isSubmittingApplication) return;

        detailModal.classList.remove("active");
        detailModal.setAttribute("aria-hidden", "true");

        document.body.style.overflow = "";

        activeCareer = null;

        resetApplicationForm();

        if (previousFocus && typeof previousFocus.focus === "function") {
            previousFocus.focus();
        }

    }

    /* =========================================
       APPLICATION MESSAGE
    ========================================= */

    function showApplicationMessage(message, type = "error") {

        applicationMessage.textContent = message;

        applicationMessage.className =
            `career-application-message show ${type}`;

    }

    function clearApplicationMessage() {

        applicationMessage.textContent = "";
        applicationMessage.className = "career-application-message";

    }

    /* =========================================
       RESUME FILE VALIDATION
    ========================================= */

    function validateResume(file) {

        if (!file) {
            return "Please upload your resume in PDF format.";
        }

        const fileName = file.name || "";
        const fileExtension = fileName.split(".").pop().toLowerCase();

        if (
            file.type !== "application/pdf" &&
            fileExtension !== "pdf"
        ) {
            return "Invalid file format. Please upload a PDF file only.";
        }

        if (file.size > MAX_RESUME_SIZE) {
            return "Your resume exceeds the 5 MB file size limit.";
        }

        if (file.size === 0) {
            return "The uploaded file is empty. Please choose another PDF.";
        }

        return null;

    }

    /* =========================================
       RESUME FILE NAME DISPLAY
    ========================================= */

    applicantResume.addEventListener("change", () => {

        const file = applicantResume.files[0];

        if (!file) {

            resumeFileName.textContent =
                "Choose your resume (PDF only)";

            return;

        }

        const validationError = validateResume(file);

        if (validationError) {

            applicantResume.value = "";

            resumeFileName.textContent =
                "Choose your resume (PDF only)";

            showApplicationMessage(validationError);

            return;

        }

        resumeFileName.textContent = file.name;

        clearApplicationMessage();

    });

    /* =========================================
       GENERATE SAFE RESUME FILE PATH
    ========================================= */

    function generateResumePath(careerId, file) {

        const extension = file.name.split(".").pop().toLowerCase();

        const uniqueId = crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        return `applications/${careerId}/${uniqueId}.${extension}`;

    }

    /* =========================================
       UPLOAD RESUME TO SUPABASE STORAGE
    ========================================= */

    async function uploadResume(file, careerId) {

        const filePath = generateResumePath(careerId, file);

        const { data, error } = await supabaseClient
            .storage
            .from(RESUME_BUCKET)
            .upload(filePath, file, {
                cacheControl: "3600",
                contentType: "application/pdf",
                upsert: false
            });

        if (error) {
            throw error;
        }

        return data.path || filePath;

    }

    /* =========================================
       SUBMIT APPLICATION
    ========================================= */

    async function submitApplication(event) {

        event.preventDefault();

        if (isSubmittingApplication) return;

        if (!activeCareer) {

            showApplicationMessage(
                "Please select a career position before submitting your application."
            );

            return;

        }

        const fullName = applicantFullName.value.trim();
        const email = applicantEmail.value.trim();
        const contactNumber = applicantContact.value.trim();
        const address = applicantAddress.value.trim();
        const expectedSalaryValue = applicantExpectedSalary.value.trim();
        const coverLetter = applicantCoverLetter.value.trim();
        const resumeFile = applicantResume.files[0];

        if (!fullName || !email || !contactNumber || !address) {

            showApplicationMessage(
                "Please complete all required fields before submitting."
            );

            return;

        }

        if (fullName.length < 2) {

            showApplicationMessage(
                "Please enter your complete name."
            );

            applicantFullName.focus();

            return;

        }

        if (!applicantEmail.checkValidity()) {

            showApplicationMessage(
                "Please enter a valid email address."
            );

            applicantEmail.focus();

            return;

        }

        if (!/^[0-9+\-\s()]{7,30}$/.test(contactNumber)) {

            showApplicationMessage(
                "Please enter a valid contact number."
            );

            applicantContact.focus();

            return;

        }

        if (address.length < 5) {

            showApplicationMessage(
                "Please provide your complete address."
            );

            applicantAddress.focus();

            return;

        }

        let expectedSalary = null;

        if (expectedSalaryValue !== "") {

            expectedSalary = Number(expectedSalaryValue);

            if (
                !Number.isFinite(expectedSalary) ||
                expectedSalary < 0 ||
                expectedSalary > 999999999
            ) {

                showApplicationMessage(
                    "Please enter a valid expected salary."
                );

                applicantExpectedSalary.focus();

                return;

            }

        }

        const resumeError = validateResume(resumeFile);

        if (resumeError) {

            showApplicationMessage(resumeError);

            applicantResume.focus();

            return;

        }

        isSubmittingApplication = true;

        submitApplicationButton.disabled = true;

        submitApplicationButton.querySelector(".career-submit-label").textContent =
            "Submitting Application...";

        clearApplicationMessage();

        try {

            /*
             * Recheck that the selected job is still published.
             */

            const { data: currentCareer, error: careerCheckError } =
                await supabaseClient
                    .from(CAREERS_TABLE)
                    .select("id, title, is_published")
                    .eq("id", activeCareer.id)
                    .eq("is_published", true)
                    .maybeSingle();

            if (careerCheckError) {
                throw careerCheckError;
            }

            if (!currentCareer) {

                throw new Error(
                    "This position is no longer accepting applications."
                );

            }

            /*
             * Upload the applicant's PDF resume.
             */

            const resumePath = await uploadResume(
                resumeFile,
                activeCareer.id
            );

            /*
             * Save applicant information in Supabase.
             */

            const applicationData = {

                career_id: activeCareer.id,

                full_name: fullName,

                email: email,

                contact_number: contactNumber,

                address: address,

                expected_salary: expectedSalary,

                resume_path: resumePath,

                cover_letter: coverLetter || null

            };

            const { error: applicationError } = await supabaseClient
                .from(APPLICATIONS_TABLE)
                .insert(applicationData);

            if (applicationError) {
                throw applicationError;
            }

            /*
             * Show successful submission.
             */

            showApplicationSuccess();

            console.info(
                "HSN Careers: Application successfully submitted."
            );

        } catch (error) {

            console.error(
                "HSN Careers application submission error:",
                error
            );

            showApplicationMessage(
                error.message ||
                "We could not submit your application. Please try again later."
            );

        } finally {

            isSubmittingApplication = false;

            submitApplicationButton.disabled = false;

            submitApplicationButton.querySelector(".career-submit-label").textContent =
                "Submit Application";

        }

    }

    /* =========================================
       RESET APPLICATION FORM
    ========================================= */

    function resetApplicationForm() {

        applicationForm.reset();

        resumeFileName.textContent =
            "Choose your resume (PDF only)";

        clearApplicationMessage();

        showDetailsView();

    }

    /* =========================================
       APPLICATION FORM EVENTS
    ========================================= */

    openApplicationButton.addEventListener("click", () => {

        showApplicationView();

    });

    backToDetailsButton.addEventListener("click", () => {

        showDetailsView();

        openApplicationButton.focus();

    });

    cancelApplicationButton.addEventListener("click", () => {

        if (isSubmittingApplication) return;

        showDetailsView();

        openApplicationButton.focus();

    });

    applicationForm.addEventListener(
        "submit",
        submitApplication
    );

    closeApplicationSuccessButton.addEventListener("click", () => {

        closeCareerDetails();

    });

    /* =========================================
       EVENT LISTENERS
    ========================================= */

    careerSearch.addEventListener("input", renderCareers);

    departmentFilter.addEventListener("change", renderCareers);

    careerGrid.addEventListener("click", event => {

        const button = event.target.closest("[data-career-id]");

        if (!button) return;

        openCareerDetails(button.dataset.careerId);

    });

    clearFiltersButton.addEventListener("click", () => {

        careerSearch.value = "";
        departmentFilter.value = "all";

        renderCareers();

    });

    closeDetailsButton.addEventListener(
        "click",
        closeCareerDetails
    );

    closeDetailsBottom.addEventListener(
        "click",
        closeCareerDetails
    );

    detailModal.addEventListener("click", event => {

        if (event.target === detailModal) {
            closeCareerDetails();
        }

    });

    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            detailModal.classList.contains("active")
        ) {
            closeCareerDetails();
        }

    });

    /* =========================================
       SUPABASE REALTIME UPDATES
    ========================================= */

    function subscribeToCareerChanges() {

        realtimeChannel = supabaseClient
            .channel("hsn-public-careers")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: CAREERS_TABLE
                },
                () => {

                    loadCareers(false);

                }
            )
            .subscribe(status => {

                console.info(
                    "HSN Careers Realtime:",
                    status
                );

            });

    }

    /* =========================================
       INITIALIZE CAREER PAGE
    ========================================= */

    async function initializeCareerPage() {

        await loadCareers();

        subscribeToCareerChanges();

    }

    initializeCareerPage();

});
