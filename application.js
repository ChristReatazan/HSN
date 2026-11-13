
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const APPLICATIONS_TABLE = "career_applications";
    const CAREERS_TABLE = "careers";
    const RESUME_BUCKET = "career-resumes";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    let applications = [];
    let careers = [];
    let activeApplication = null;

    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);

    function formatDate(value) {
        if (!value) return "Date unavailable";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Date unavailable";

        return new Intl.DateTimeFormat("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }).format(date);
    }

    function getCareer(application) {
        return careers.find(item =>
            String(item.id) === String(application.career_id)
        );
    }

    function getPositionTitle(application) {
        return getCareer(application)?.title || "Position no longer available";
    }

    function createApplicantSection() {
        if (document.getElementById("applicantManagement")) return;

        const section = document.createElement("section");
        section.id = "applicantManagement";
        section.className = "applicant-management";

        section.innerHTML = `
            <div class="applicant-heading">
                <div>
                    <span class="admin-section-eyebrow">RECRUITMENT MANAGEMENT</span>
                    <h2>Applicant <span>Management</span></h2>
                    <p>Review applications and access submitted applicant documents.</p>
                </div>

                <button type="button" class="applicant-refresh" id="refreshApplications">
                    ↻ Refresh Applications
                </button>
            </div>

            <div class="applicant-stats">
                <div class="applicant-stat-card">
                    <span>Total Applications</span>
                    <strong id="applicationTotal">0</strong>
                    <small>All submitted applications</small>
                </div>

                <div class="applicant-stat-card">
                    <span>Positions Applied</span>
                    <strong id="applicationPositions">0</strong>
                    <small>Unique career positions</small>
                </div>

                <div class="applicant-stat-card">
                    <span>Latest Application</span>
                    <strong id="applicationLatest">—</strong>
                    <small>Most recent submission</small>
                </div>
            </div>

            <div class="applicant-panel">
                <div class="applicant-panel-header">
                    <div>
                        <h3>Submitted Applications</h3>
                        <p id="applicationResultCount">Loading applications...</p>
                    </div>

                    <div class="applicant-toolbar">
                        <div class="applicant-search">
                            <span>⌕</span>
                            <input
                                type="search"
                                id="applicationSearch"
                                placeholder="Search name, email or position..."
                            >
                        </div>

                        <select id="applicationPositionFilter">
                            <option value="all">All Positions</option>
                        </select>
                    </div>
                </div>

                <div class="applicant-message" id="applicationAdminMessage"></div>

                <div class="applicant-table-wrapper">
                    <table class="applicant-table">
                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Position Applied</th>
                                <th>Contact Information</th>
                                <th>Date Submitted</th>
                                <th>Resume</th>
                                <th>Details</th>
                            </tr>
                        </thead>

                        <tbody id="applicantTableBody">
                            <tr>
                                <td colspan="6" class="applicant-empty">
                                    Loading applications...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="applicant-table-footer">
                    <span>HSN PHILIPPINES · RECRUITMENT PORTAL</span>
                    <span id="applicationFooterCount">0 APPLICATIONS</span>
                </div>
            </div>

            <div class="applicant-modal-overlay" id="applicantDetailModal" aria-hidden="true">
                <div class="applicant-detail-modal" role="dialog" aria-modal="true" aria-labelledby="applicantDetailTitle">
                    <div class="applicant-modal-header">
                        <div>
                            <span>APPLICATION RECORD</span>
                            <h2 id="applicantDetailTitle">Applicant Details</h2>
                        </div>

                        <button type="button" id="closeApplicantModal" aria-label="Close">×</button>
                    </div>

                    <div class="applicant-modal-content" id="applicantDetailContent"></div>

                    <div class="applicant-modal-footer">
                        <button type="button" class="applicant-close-button" id="closeApplicantModalBottom">
                            Close Details
                        </button>
                        <button type="button" class="applicant-resume-button" id="applicantResumeButton">
                            View Uploaded Resume ↗
                        </button>
                    </div>
                </div>
            </div>
        `;

        const careerManagement = document.querySelector(".career-management");

        if (careerManagement) {
            careerManagement.parentNode.insertBefore(section, careerManagement);
        } else {
            document.body.appendChild(section);
        }
    }

    function showMessage(message, type = "info") {
        const element = document.getElementById("applicationAdminMessage");

        if (!element) return;

        element.textContent = message;
        element.className = `applicant-message ${type}`;
    }

    async function verifyAdmin() {
        const { data: { session }, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError || !session) {
            window.location.replace("index.html");
            return false;
        }

        const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

        if (error || !profile || profile.role !== "admin") {
            await supabase.auth.signOut();
            window.location.replace("index.html");
            return false;
        }

        return true;
    }

    async function loadApplications() {
        const tbody = document.getElementById("applicantTableBody");

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="applicant-empty">
                    Loading submitted applications...
                </td>
            </tr>
        `;

        const [applicationResult, careerResult] = await Promise.all([
            supabase
                .from(APPLICATIONS_TABLE)
                .select("*")
                .order("created_at", { ascending: false }),

            supabase
                .from(CAREERS_TABLE)
                .select("id, title, department, location, employment_type")
        ]);

        if (applicationResult.error) {
            console.error("Application loading error:", applicationResult.error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="applicant-empty">
                        Unable to load applications. Check your database permissions.
                    </td>
                </tr>
            `;

            showMessage(
                applicationResult.error.message || "Unable to retrieve applications.",
                "error"
            );

            return;
        }

        if (careerResult.error) {
            console.error("Career lookup error:", careerResult.error);
            careers = [];
        } else {
            careers = careerResult.data || [];
        }

        applications = applicationResult.data || [];

        populatePositionFilter();
        renderApplications();
        updateApplicationStats();

        showMessage(
            applications.length
                ? "Application records loaded successfully."
                : "No applications have been submitted yet.",
            "success"
        );
    }

    function populatePositionFilter() {
        const filter = document.getElementById("applicationPositionFilter");
        const currentValue = filter.value;

        const positions = [...new Set(
            applications.map(getPositionTitle).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        filter.innerHTML = `
            <option value="all">All Positions</option>
            ${positions.map(position => `
                <option value="${escapeHTML(position)}">${escapeHTML(position)}</option>
            `).join("")}
        `;

        filter.value = positions.includes(currentValue) ? currentValue : "all";
    }

    function updateApplicationStats() {
        document.getElementById("applicationTotal").textContent =
            applications.length;

        const uniquePositions = new Set(
            applications.map(item => String(item.career_id))
        );

        document.getElementById("applicationPositions").textContent =
            uniquePositions.size;

        document.getElementById("applicationLatest").textContent =
            applications.length
                ? formatDate(applications[0].created_at).split(",")[0]
                : "—";

        document.getElementById("applicationFooterCount").textContent =
            `${applications.length} APPLICATION${applications.length === 1 ? "" : "S"}`;
    }

    function getFilteredApplications() {
        const search = document
            .getElementById("applicationSearch")
            .value.trim()
            .toLowerCase();

        const position = document
            .getElementById("applicationPositionFilter")
            .value;

        return applications.filter(application => {
            const searchable = [
                application.full_name,
                application.email,
                application.contact_number,
                application.address,
                getPositionTitle(application)
            ].join(" ").toLowerCase();

            return (
                (!search || searchable.includes(search)) &&
                (position === "all" || getPositionTitle(application) === position)
            );
        });
    }

    function renderApplications() {
        const tbody = document.getElementById("applicantTableBody");
        const filtered = getFilteredApplications();

        document.getElementById("applicationResultCount").textContent =
            `${filtered.length} applicant${filtered.length === 1 ? "" : "s"} found`;

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="applicant-empty">
                        No matching applications found.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(application => {
            const career = getCareer(application);
            const hasResume = Boolean(application.resume_path);

            return `
                <tr>
                    <td>
                        <div class="applicant-person">
                            <span class="applicant-avatar">
                                ${escapeHTML((application.full_name || "A").charAt(0).toUpperCase())}
                            </span>
                            <div>
                                <strong>${escapeHTML(application.full_name)}</strong>
                                <small>${escapeHTML(application.email)}</small>
                            </div>
                        </div>
                    </td>

                    <td>
                        <strong class="applicant-position">
                            ${escapeHTML(career?.title || "Position unavailable")}
                        </strong>
                        <small class="applicant-department">
                            ${escapeHTML(career?.department || "Department unavailable")}
                        </small>
                    </td>

                    <td>
                        <span class="applicant-contact">${escapeHTML(application.contact_number)}</span>
                        <small class="applicant-address">
                            ${escapeHTML(application.address)}
                        </small>
                    </td>

                    <td>
                        <span class="applicant-date">
                            ${escapeHTML(formatDate(application.created_at))}
                        </span>
                    </td>

                    <td>
                        <span class="applicant-resume-status ${hasResume ? "available" : "missing"}">
                            ${hasResume ? "PDF ATTACHED" : "NO RESUME"}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="applicant-view-button"
                            data-application-id="${escapeHTML(application.id)}"
                        >
                            View Details →
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function detailRow(label, value) {
        return `
            <div class="applicant-detail-item">
                <span>${escapeHTML(label)}</span>
                <strong>${escapeHTML(value || "Not provided")}</strong>
            </div>
        `;
    }

    function openApplicantDetails(id) {
        const application = applications.find(item =>
            String(item.id) === String(id)
        );

        if (!application) return;

        activeApplication = application;

        const career = getCareer(application);
        const content = document.getElementById("applicantDetailContent");

        document.getElementById("applicantDetailTitle").textContent =
            application.full_name || "Applicant Details";

        content.innerHTML = `
            <div class="applicant-detail-banner">
                <div class="applicant-detail-avatar">
                    ${escapeHTML((application.full_name || "A").charAt(0).toUpperCase())}
                </div>

                <div>
                    <span>APPLICANT</span>
                    <h3>${escapeHTML(application.full_name)}</h3>
                    <p>${escapeHTML(application.email)}</p>
                </div>
            </div>

            <section class="applicant-detail-section">
                <h3>Personal Information</h3>
                <div class="applicant-detail-grid">
                    ${detailRow("Full Name", application.full_name)}
                    ${detailRow("Email Address", application.email)}
                    ${detailRow("Contact Number", application.contact_number)}
                    ${detailRow("Complete Address", application.address)}
                </div>
            </section>

            <section class="applicant-detail-section">
                <h3>Position Information</h3>
                <div class="applicant-detail-grid">
                    ${detailRow("Position Applied", career?.title || "Position unavailable")}
                    ${detailRow("Department", career?.department)}
                    ${detailRow("Location", career?.location)}
                    ${detailRow("Employment Type", career?.employment_type)}
                    ${detailRow(
                        "Expected Salary",
                        application.expected_salary === null ||
                        application.expected_salary === undefined ||
                        application.expected_salary === ""
                            ? "Not specified"
                            : `₱${Number(application.expected_salary).toLocaleString("en-PH")}`
                    )}
                    ${detailRow("Date Submitted", formatDate(application.created_at))}
                </div>
            </section>

            <section class="applicant-detail-section">
                <h3>Cover Letter</h3>
                <div class="applicant-cover-letter">
                    ${escapeHTML(application.cover_letter || "No cover letter provided.")}
                </div>
            </section>

            <section class="applicant-detail-section applicant-document-section">
                <div>
                    <span class="applicant-document-icon">PDF</span>
                    <div>
                        <strong>Applicant Resume</strong>
                        <small>${application.resume_path ? "A resume has been uploaded." : "No resume was attached."}</small>
                    </div>
                </div>

                <span class="applicant-document-state ${application.resume_path ? "available" : "missing"}">
                    ${application.resume_path ? "AVAILABLE" : "MISSING"}
                </span>
            </section>
        `;

        const resumeButton = document.getElementById("applicantResumeButton");
        resumeButton.disabled = !application.resume_path;
        resumeButton.textContent = application.resume_path
            ? "View Uploaded Resume ↗"
            : "No Resume Available";

        const modal = document.getElementById("applicantDetailModal");
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeApplicantDetails() {
        const modal = document.getElementById("applicantDetailModal");

        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        activeApplication = null;
    }

    async function viewApplicantResume() {
        if (!activeApplication?.resume_path) return;

        const newWindow = window.open("about:blank", "_blank");

        if (newWindow) {
            newWindow.document.write(
                "<p style='font-family:Arial;padding:30px'>Preparing secure resume preview...</p>"
            );
        }

        const { data, error } = await supabase
            .storage
            .from(RESUME_BUCKET)
            .createSignedUrl(activeApplication.resume_path, 60);

        if (error || !data?.signedUrl) {
            if (newWindow) newWindow.close();

            console.error("Resume access error:", error);

            showMessage(
                "Unable to open the resume. Check the Storage bucket and its permissions.",
                "error"
            );

            return;
        }

        if (newWindow) {
            newWindow.location.href = data.signedUrl;
        } else {
            window.location.href = data.signedUrl;
        }
    }

    async function initialize() {
        createApplicantSection();

        const authorized = await verifyAdmin();

        if (!authorized) return;

        document
            .getElementById("refreshApplications")
            .addEventListener("click", loadApplications);

        document
            .getElementById("applicationSearch")
            .addEventListener("input", renderApplications);

        document
            .getElementById("applicationPositionFilter")
            .addEventListener("change", renderApplications);

        document
            .getElementById("applicantTableBody")
            .addEventListener("click", event => {
                const button = event.target.closest("[data-application-id]");
                if (button) openApplicantDetails(button.dataset.applicationId);
            });

        document
            .getElementById("closeApplicantModal")
            .addEventListener("click", closeApplicantDetails);

        document
            .getElementById("closeApplicantModalBottom")
            .addEventListener("click", closeApplicantDetails);

        document
            .getElementById("applicantResumeButton")
            .addEventListener("click", viewApplicantResume);

        document
            .getElementById("applicantDetailModal")
            .addEventListener("click", event => {
                if (event.target.id === "applicantDetailModal") {
                    closeApplicantDetails();
                }
            });

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape" &&
                document.getElementById("applicantDetailModal").classList.contains("active")
            ) {
                closeApplicantDetails();
            }
        });

        await loadApplications();
    }

    initialize();
});
