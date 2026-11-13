
/* =========================================
   HSN PHILIPPINES
   APPLICANT MANAGEMENT
   SUPABASE INTEGRATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================
       SUPABASE CONFIGURATION
    ========================================= */

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    const APPLICATIONS_TABLE = "career_applications";
    const CAREERS_TABLE = "careers";
    const STORAGE_BUCKET = "career-resumes";

    const VALID_STATUSES = [
        "Pending",
        "Shortlisted",
        "Accepted",
        "Rejected"
    ];

    let applicants = [];
    let careersMap = {};
    let activeApplicant = null;
    let currentAdmin = null;

    /* =========================================
       DOM ELEMENTS
    ========================================= */

    const tableBody = document.getElementById("applicantTableBody");
    const searchInput = document.getElementById("searchApplicants");
    const statusFilter = document.getElementById("statusFilter");
    const sortFilter = document.getElementById("sortFilter");

    const applicantModal = document.getElementById("applicantModal");
    const applicantDetails = document.getElementById("applicantDetails");

    const refreshButton = document.getElementById("refreshButton");
    const logoutButton = document.getElementById("logoutButton");

    /* =========================================
       HELPERS
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

    function showToast(message, type = "success") {
        const container = document.getElementById("toastContainer");

        if (!container) {
            console[type === "error" ? "error" : "log"](message);
            return;
        }

        const toast = document.createElement("div");

        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    function formatDate(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Not available";
        }

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatCurrency(value) {
        if (value === null || value === undefined || value === "") {
            return "Not provided";
        }

        const amount = Number(value);

        if (Number.isNaN(amount)) {
            return String(value);
        }

        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: 2
        }).format(amount);
    }

    function getInitials(name) {
        if (!name) return "NA";

        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0))
            .join("")
            .toUpperCase();
    }

    function getApplicantCode(applicant, index) {
        if (applicant.applicant_code) {
            return applicant.applicant_code;
        }

        return `APPLICANT-${String(index + 1).padStart(2, "0")}`;
    }

    function getStatusClass(status) {
        const classes = {
            Pending: "status-pending",
            Shortlisted: "status-shortlisted",
            Accepted: "status-accepted",
            Rejected: "status-rejected"
        };

        return classes[status] || "status-pending";
    }

    function getCareerTitle(careerId) {
        if (!careerId) return "Position not specified";

        return careersMap[careerId] || "Position not available";
    }

    /* =========================================
       AUTHENTICATION
    ========================================= */

    async function verifyAdmin() {
        try {
            const {
                data: { session },
                error: sessionError
            } = await supabase.auth.getSession();

            if (sessionError) {
                console.error("Session error:", sessionError);
                showToast("Unable to verify your session. Please refresh the page.", "error");
                return false;
            }

            if (!session) {
                window.location.replace("login.html");
                return false;
            }

            const {
                data: profile,
                error: profileError
            } = await supabase
                .from("profiles")
                .select("id, full_name, role")
                .eq("id", session.user.id)
                .maybeSingle();

            if (profileError) {
                console.error("Admin profile verification error:", profileError);

                showToast(
                    "Unable to verify admin access. Please check your Supabase profiles SELECT policy.",
                    "error"
                );

                return false;
            }

            if (!profile) {
                console.error("No admin profile found for:", session.user.id);

                await supabase.auth.signOut();
                window.location.replace("login.html");

                return false;
            }

            if (String(profile.role || "").toLowerCase() !== "admin") {
                console.warn("Access denied. User role:", profile.role);

                await supabase.auth.signOut();
                window.location.replace("login.html");

                return false;
            }

            currentAdmin = profile;

            const adminName = profile.full_name || "Administrator";

            const sidebarName = document.getElementById("sidebarAdminName");
            const sidebarAvatar = document.getElementById("sidebarAvatar");

            if (sidebarName) {
                sidebarName.textContent = adminName;
            }

            if (sidebarAvatar) {
                sidebarAvatar.textContent = getInitials(adminName);
            }

            console.log("Admin authentication successful.");

            return true;

        } catch (error) {
            console.error("Authentication error:", error);

            showToast(
                "An unexpected authentication error occurred. Please refresh the page.",
                "error"
            );

            return false;
        }
    }

    /* =========================================
       LOGOUT
    ========================================= */

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;

            const { error } = await supabase.auth.signOut();

            if (error) {
                showToast("Unable to sign out. Please try again.", "error");
                logoutButton.disabled = false;
                return;
            }

            window.location.replace("login.html");
        });
    }

    /* =========================================
       LOAD CAREER TITLES
    ========================================= */

    async function loadCareers() {
        const { data, error } = await supabase
            .from(CAREERS_TABLE)
            .select("id, title");

        if (error) {
            console.error("Career loading error:", error.message);
            return;
        }

        careersMap = {};

        (data || []).forEach(career => {
            careersMap[career.id] = career.title || "Untitled Position";
        });
    }

    /* =========================================
       LOAD APPLICATIONS
    ========================================= */

    async function loadApplicants() {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-message">
                    Loading applications...
                </td>
            </tr>
        `;

        const { data, error } = await supabase
            .from(APPLICATIONS_TABLE)
            .select(`
                id,
                applicant_code,
                career_id,
                full_name,
                email,
                contact_number,
                address,
                expected_salary,
                resume_path,
                cover_letter,
                status,
                is_read,
                created_at
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Applicant loading error:", error);

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-message">
                        Unable to load applications. Please check your access policies.
                    </td>
                </tr>
            `;

            showToast("Unable to load applicant records.", "error");
            return;
        }

        applicants = data || [];

        updateStatistics();
        renderApplicants();
    }

    /* =========================================
       STATISTICS
    ========================================= */

    function updateStatistics() {
        const total = applicants.length;

        const pending = applicants.filter(
            applicant => (applicant.status || "Pending") === "Pending"
        ).length;

        const shortlisted = applicants.filter(
            applicant => applicant.status === "Shortlisted"
        ).length;

        const unread = applicants.filter(
            applicant => applicant.is_read === false
        ).length;

        document.getElementById("totalApplicants").textContent = total;
        document.getElementById("pendingApplicants").textContent = pending;
        document.getElementById("shortlistedApplicants").textContent = shortlisted;
        document.getElementById("unreadApplicants").textContent = unread;
    }

    /* =========================================
       FILTER & SORT
    ========================================= */

    function getFilteredApplicants() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedSort = sortFilter.value;

        let filtered = [...applicants];

        if (searchTerm) {
            filtered = filtered.filter((applicant, index) => {
                const applicantCode = getApplicantCode(applicant, index);

                const searchable = [
                    applicant.full_name,
                    applicant.email,
                    applicant.contact_number,
                    applicant.address,
                    applicantCode,
                    getCareerTitle(applicant.career_id)
                ]
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(searchTerm);
            });
        }

        if (selectedStatus !== "all") {
            filtered = filtered.filter(applicant => {
                return (applicant.status || "Pending") === selectedStatus;
            });
        }

        if (selectedSort === "newest") {
            filtered.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });
        }

        if (selectedSort === "oldest") {
            filtered.sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
            });
        }

        if (selectedSort === "name") {
            filtered.sort((a, b) => {
                return (a.full_name || "").localeCompare(b.full_name || "");
            });
        }

        return filtered;
    }

    /* =========================================
       RENDER APPLICANTS
    ========================================= */

    function renderApplicants() {
        const filtered = getFilteredApplicants();

        document.getElementById("recordCount").textContent =
            `${filtered.length} applicant${filtered.length === 1 ? "" : "s"}`;

        document.getElementById("tableSummary").textContent =
            `Showing ${filtered.length} of ${applicants.length} applicants`;

        if (!filtered.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-message">
                        No applicant records found.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map(applicant => {
            const originalIndex = applicants.findIndex(
                item => item.id === applicant.id
            );

            const applicantCode = getApplicantCode(applicant, originalIndex);
            const name = applicant.full_name || "Unnamed Applicant";
            const status = applicant.status || "Pending";

            const reviewStatus = applicant.is_read
                ? `
                    <span class="review-label">
                        <span class="review-dot"></span>
                        Reviewed
                    </span>
                `
                : `
                    <span class="review-label unread">
                        <span class="review-dot"></span>
                        New
                    </span>
                `;

            return `
                <tr>
                    <td>
                        <div class="applicant-name">
                            <div class="applicant-avatar">
                                ${escapeHTML(getInitials(name))}
                            </div>

                            <div>
                                <strong>${escapeHTML(name)}</strong>
                                <span>${escapeHTML(applicantCode)}</span>
                            </div>
                        </div>
                    </td>

                    <td>
                        <div class="applicant-position">
                            ${escapeHTML(getCareerTitle(applicant.career_id))}
                        </div>
                    </td>

                    <td>
                        <span class="applicant-date">
                            ${escapeHTML(formatDate(applicant.created_at))}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge ${getStatusClass(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>${reviewStatus}</td>

                    <td>
                        <button
                            type="button"
                            class="view-button"
                            data-applicant-id="${escapeHTML(applicant.id)}">
                            View Details
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* =========================================
       OPEN APPLICANT DETAILS
    ========================================= */

    async function openApplicantDetails(applicantId) {
        const applicant = applicants.find(item => item.id === applicantId);

        if (!applicant) {
            showToast("Applicant record not found.", "error");
            return;
        }

        activeApplicant = applicant;

        applicantModal.classList.add("show");

        applicantDetails.innerHTML = `
            <div class="modal-loading">
                Loading applicant details...
            </div>
        `;

        if (!applicant.is_read) {
            const { error } = await supabase
                .from(APPLICATIONS_TABLE)
                .update({ is_read: true })
                .eq("id", applicant.id);

            if (error) {
                console.error("Unable to mark applicant as read:", error.message);
            } else {
                applicant.is_read = true;
                updateStatistics();
                renderApplicants();
            }
        }

        await renderApplicantDetails(applicant);
    }

    /* =========================================
       RESUME SIGNED URL
    ========================================= */

    async function getResumeUrl(resumePath) {
        if (!resumePath) return null;

        const { data, error } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(resumePath, 300);

        if (error) {
            console.error("Resume URL error:", error.message);
            return null;
        }

        return data?.signedUrl || null;
    }

    /* =========================================
       RENDER APPLICANT DETAILS
    ========================================= */

    async function renderApplicantDetails(applicant) {
        const index = applicants.findIndex(
            item => item.id === applicant.id
        );

        const applicantCode = getApplicantCode(applicant, index);
        const name = applicant.full_name || "Unnamed Applicant";
        const status = applicant.status || "Pending";

        const resumeUrl = await getResumeUrl(applicant.resume_path);

        if (!activeApplicant || activeApplicant.id !== applicant.id) {
            return;
        }

        const resumeSection = resumeUrl
            ? `
                <div class="resume-actions">
                    <a
                        href="${escapeHTML(resumeUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="resume-button">
                        ↗ View Resume
                    </a>

                    <a
                        href="${escapeHTML(resumeUrl)}"
                        download
                        class="resume-button">
                        ↓ Download Resume
                    </a>
                </div>
            `
            : `
                <p class="detail-cover-letter">
                    Resume is unavailable or has not been uploaded.
                </p>
            `;

        const statusOptions = VALID_STATUSES.map(option => `
            <option value="${option}" ${option === status ? "selected" : ""}>
                ${option}
            </option>
        `).join("");

        applicantDetails.innerHTML = `
            <div class="detail-profile">
                <div class="detail-avatar">
                    ${escapeHTML(getInitials(name))}
                </div>

                <div>
                    <h3>${escapeHTML(name)}</h3>
                    <p>${escapeHTML(applicantCode)} · Submitted ${escapeHTML(formatDate(applicant.created_at))}</p>
                </div>
            </div>

            <section class="detail-section">
                <h4 class="detail-section-title">PERSONAL INFORMATION</h4>

                <div class="detail-grid">
                    <div class="detail-field">
                        <label>Full Name</label>
                        <p>${escapeHTML(name)}</p>
                    </div>

                    <div class="detail-field">
                        <label>Email Address</label>
                        <p>${escapeHTML(applicant.email || "Not provided")}</p>
                    </div>

                    <div class="detail-field">
                        <label>Contact Number</label>
                        <p>${escapeHTML(applicant.contact_number || "Not provided")}</p>
                    </div>

                    <div class="detail-field">
                        <label>Expected Salary</label>
                        <p>${escapeHTML(formatCurrency(applicant.expected_salary))}</p>
                    </div>

                    <div class="detail-field">
                        <label>Applied Position</label>
                        <p>${escapeHTML(getCareerTitle(applicant.career_id))}</p>
                    </div>

                    <div class="detail-field">
                        <label>Date Submitted</label>
                        <p>${escapeHTML(formatDate(applicant.created_at))}</p>
                    </div>

                    <div class="detail-field">
                        <label>Applicant ID</label>
                        <p>${escapeHTML(applicantCode)}</p>
                    </div>

                    <div class="detail-field">
                        <label>Application Status</label>
                        <p>
                            <span class="status-badge ${getStatusClass(status)}">
                                ${escapeHTML(status)}
                            </span>
                        </p>
                    </div>

                    <div class="detail-field">
                        <label>Address</label>
                        <p>${escapeHTML(applicant.address || "Not provided")}</p>
                    </div>
                </div>
            </section>

            <section class="detail-section">
                <h4 class="detail-section-title">RESUME / CURRICULUM VITAE</h4>
                ${resumeSection}
            </section>

            <section class="detail-section">
                <h4 class="detail-section-title">COVER LETTER</h4>

                <div class="detail-cover-letter">
                    ${escapeHTML(applicant.cover_letter || "No cover letter provided.")}
                </div>
            </section>

            <section class="detail-section">
                <h4 class="detail-section-title">APPLICATION STATUS MANAGEMENT</h4>

                <div class="status-management">
                    <label for="applicantStatusSelect">
                        Update Status
                    </label>

                    <select id="applicantStatusSelect">
                        ${statusOptions}
                    </select>
                </div>
            </section>
        `;

        document
            .getElementById("applicantStatusSelect")
            .addEventListener("change", event => {
                updateApplicantStatus(applicant.id, event.target.value);
            });
    }

    /* =========================================
       UPDATE APPLICANT STATUS
    ========================================= */

    async function updateApplicantStatus(applicantId, newStatus) {
        if (!VALID_STATUSES.includes(newStatus)) {
            showToast("Invalid application status.", "error");
            return;
        }

        const applicant = applicants.find(
            item => item.id === applicantId
        );

        if (!applicant) return;

        const previousStatus = applicant.status || "Pending";

        if (previousStatus === newStatus) return;

        const statusSelect = document.getElementById("applicantStatusSelect");

        if (statusSelect) {
            statusSelect.disabled = true;
        }

        const { error } = await supabase
            .from(APPLICATIONS_TABLE)
            .update({ status: newStatus })
            .eq("id", applicantId);

        if (error) {
            console.error("Status update error:", error.message);

            showToast(
                "Unable to update status. Check your database permissions.",
                "error"
            );

            if (statusSelect) {
                statusSelect.value = previousStatus;
                statusSelect.disabled = false;
            }

            return;
        }

        applicant.status = newStatus;
        activeApplicant = applicant;

        updateStatistics();
        renderApplicants();

        showToast("Applicant status updated successfully.");

        await renderApplicantDetails(applicant);
    }

    /* =========================================
       MODAL EVENTS
    ========================================= */

    function closeApplicantModal() {
        applicantModal.classList.remove("show");
        activeApplicant = null;
    }

    document
        .getElementById("closeApplicantModal")
        .addEventListener("click", closeApplicantModal);

    document
        .getElementById("closeApplicantButton")
        .addEventListener("click", closeApplicantModal);

    applicantModal.addEventListener("click", event => {
        if (event.target === applicantModal) {
            closeApplicantModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeApplicantModal();
        }
    });

    /* =========================================
       TABLE ACTION EVENTS
    ========================================= */

    tableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-applicant-id]");

        if (!button) return;

        openApplicantDetails(button.dataset.applicantId);
    });

    /* =========================================
       SEARCH & FILTER EVENTS
    ========================================= */

    searchInput.addEventListener("input", renderApplicants);
    statusFilter.addEventListener("change", renderApplicants);
    sortFilter.addEventListener("change", renderApplicants);

    document
        .getElementById("clearFiltersButton")
        .addEventListener("click", () => {
            searchInput.value = "";
            statusFilter.value = "all";
            sortFilter.value = "newest";

            renderApplicants();
        });

    /* =========================================
       REFRESH
    ========================================= */

    refreshButton.addEventListener("click", async () => {
        refreshButton.disabled = true;
        refreshButton.innerHTML = "<span>↻</span> Refreshing...";

        await loadCareers();
        await loadApplicants();

        refreshButton.disabled = false;
        refreshButton.innerHTML = "<span>↻</span> Refresh Data";

        showToast("Applicant records refreshed.");
    });

    /* =========================================
       REALTIME UPDATES
    ========================================= */

    function setupRealtime() {
        supabase
            .channel("applicant-management-updates")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: APPLICATIONS_TABLE
                },
                async () => {
                    await loadApplicants();

                    if (activeApplicant) {
                        const updatedApplicant = applicants.find(
                            item => item.id === activeApplicant.id
                        );

                        if (updatedApplicant) {
                            activeApplicant = updatedApplicant;
                            await renderApplicantDetails(updatedApplicant);
                        } else {
                            closeApplicantModal();
                        }
                    }
                }
            )
            .subscribe();
    }

    /* =========================================
       INITIALIZATION
    ========================================= */

    async function initialize() {
        const isAdmin = await verifyAdmin();

        if (!isAdmin) return;

        await loadCareers();
        await loadApplicants();

        setupRealtime();
    }

    initialize();

});
