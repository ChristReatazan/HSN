/* =========================================
   HSN PHILIPPINES - CAREER PAGE
   SUPABASE CAREER LISTINGS
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    /* =========================================
       SUPABASE CONNECTION
       Uses the existing client from script.js
    ========================================= */

    const CAREERS_TABLE = "careers";

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        console.error("HSN Careers: Supabase client is unavailable.");
        showLoadError(
            "Career opportunities are temporarily unavailable. Please try again later."
        );
        return;
    }

    /* =========================================
       ELEMENT REFERENCES
    ========================================= */

    const careerGrid = document.getElementById("publicCareerGrid");

    const careerCount = document.getElementById("publicCareerCount");

    const careerSearch = document.getElementById("publicCareerSearch");

    const departmentFilter = document.getElementById(
        "publicCareerDepartment"
    );

    const resultsLabel = document.getElementById("careerResultsLabel");

    const lastUpdated = document.getElementById("careerLastUpdated");

    const noResults = document.getElementById("careerNoResults");

    const clearFiltersButton = document.getElementById(
        "clearCareerFilters"
    );

    const detailModal = document.getElementById("careerDetailModal");

    const closeDetailsButton = document.getElementById(
        "closeCareerDetails"
    );

    const closeDetailsBottom = document.getElementById(
        "closeCareerDetailsBottom"
    );

    const detailTitle = document.getElementById("detailTitle");

    const detailMeta = document.getElementById("detailMeta");

    const detailDescription = document.getElementById(
        "detailDescription"
    );

    const detailRequirements = document.getElementById(
        "detailRequirements"
    );

    const requirementsSection = document.getElementById(
        "requirementsSection"
    );

    /* =========================================
       APPLICATION STATE
    ========================================= */

    let careers = [];
    let activeCareer = null;
    let realtimeChannel = null;
    let previousFocus = null;

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

        const now = new Date();

        return new Intl.DateTimeFormat("en-PH", {
            hour: "numeric",
            minute: "2-digit"
        }).format(now);

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
                lastUpdated.textContent =
                    `Updated ${formatUpdatedTime()}`;
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

        const searchTerm = careerSearch.value
            .trim()
            .toLowerCase();

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

                    <p class="career-card-description">${escapeHTML(career.description)}</p>

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

        detailModal.classList.add("active");

        detailModal.setAttribute("aria-hidden", "false");

        document.body.style.overflow = "hidden";

        closeDetailsButton.focus();

    }

    /* =========================================
       CLOSE CAREER DETAILS
    ========================================= */

    function closeCareerDetails() {

        if (!detailModal.classList.contains("active")) return;

        detailModal.classList.remove("active");

        detailModal.setAttribute("aria-hidden", "true");

        document.body.style.overflow = "";

        activeCareer = null;

        if (previousFocus && typeof previousFocus.focus === "function") {
            previousFocus.focus();
        }

    }

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
