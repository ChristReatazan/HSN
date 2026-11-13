
/* =========================================
   HSN PHILIPPINES
   APPLICANT MANAGEMENT
   SUPABASE INTEGRATION
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    /* =========================================
       SUPABASE CONFIGURATION
    ========================================= */

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const APPLICATIONS_TABLE = "career_applications";
    const CAREERS_TABLE = "careers";
    const PROFILES_TABLE = "profiles";
    const RESUME_BUCKET = "career-resumes";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    /* =========================================
       DOM ELEMENTS
    ========================================= */

    const applicantTableBody = document.getElementById("applicantTableBody");
    const searchInput = document.getElementById("searchApplicants");
    const statusFilter = document.getElementById("statusFilter");
    const sortFilter = document.getElementById("sortFilter");
    const refreshButton = document.getElementById("refreshButton");
    const clearFiltersButton = document.getElementById("clearFiltersButton");

    const totalApplicantsElement = document.getElementById("totalApplicants");
    const pendingApplicantsElement = document.getElementById("pendingApplicants");
    const shortlistedApplicantsElement = document.getElementById("shortlistedApplicants");
    const unreadApplicantsElement = document.getElementById("unreadApplicants");

    const recordCountElement = document.getElementById("recordCount");
    const tableSummaryElement = document.getElementById("tableSummary");

    const applicantModal = document.getElementById("applicantModal");
    const applicantDetails = document.getElementById("applicantDetails");
    const closeApplicantModalButton = document.getElementById("closeApplicantModal");
    const closeApplicantButton = document.getElementById("closeApplicantButton");

    const logoutButton = document.getElementById("logoutButton");

    /* =========================================
       APPLICATION STATE
    ========================================= */

    let applicants = [];
    let activeApplicant = null;
    let realtimeChannel = null;
    let isLoading = false;

    /* =========================================
       HELPER FUNCTIONS
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

    function formatDate(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Not available";
        }

        return date.toLocaleDateString("en-AU", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Not available";
        }

        return date.toLocaleString("en-AU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatCurrency(value) {
        if (value === null || value === undefined || value === "") {
            return "Not specified";
        }

        const numericValue = Number(value);

        if (!Number.isNaN(numericValue)) {
            return new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
                maximumFractionDigits: 2
            }).format(numericValue);
        }

        return String(value);
    }

    function getApplicantName(applicant) {
        return applicant.full_name || "Unnamed Applicant";
    }

    function getApplicantInitials(name) {
        return String(name)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("") || "A";
    }

    function getApplicantStatus(applicant) {
        return applicant.status || "Pending";
    }

    function getPosition(applicant) {
        return applicant.position ||
            applicant.job_title ||
            applicant.career_title ||
            applicant.careers?.title ||
            applicant.careers?.position ||
            applicant.careers?.job_title ||
            "Position not available";
    }

    function showToast(message, type = "success") {
        const container = document.getElementById("toastContainer");

        if (!container) return;

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        setTimeout(() => {
            toast.classList.remove("show");

            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function showTableMessage(message, isError = false) {
        applicantTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-message">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;

        if (isError) {
            console.error(message);
        }
    }

    /* =========================================
       AUTHENTICATION & ADMIN VALIDATION
    ========================================= */

    async function verifyAdmin() {
        console.log("APPLICANT MANAGEMENT AUTH CHECK STARTED");

        const {
            data: { session },
            error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("SESSION ERROR:", sessionError);
            window.location.replace("login.html");
            return false;
        }

        if (!session) {
            console.warn("NO ACTIVE SESSION");
            window.location.replace("login.html");
            return false;
        }

        console.log("SESSION:", session);
        console.log("AUTH USER ID:", session.user.id);

        const { data: profile, error: profileError } = await supabase
            .from(PROFILES_TABLE)
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

        if (profileError) {
            console.error("PROFILE ERROR:", profileError);
            showToast("Unable to verify administrator profile.", "error");
            return false;
        }

        console.log("ADMIN PROFILE:", profile);

        if (!profile || profile.role !== "admin") {
            console.warn("USER IS NOT AN ADMIN");

            await supabase.auth.signOut();
            window.location.replace("login.html");

            return false;
        }

        const adminName =
            profile.full_name ||
            profile.name ||
            session.user.email ||
            "Administrator";

        const nameElement = document.getElementById("sidebarAdminName");
        const avatarElement = document.getElementById("sidebarAvatar");

        if (nameElement) {
            nameElement.textContent = adminName;
        }

        if (avatarElement) {
            avatarElement.textContent = getApplicantInitials(adminName);
        }

        return true;
    }

    /* =========================================
       LOAD CAREER INFORMATION
    ========================================= */

    async function loadCareerInformation(applicationRecords) {
        const careerIds = [
            ...new Set(
                applicationRecords
                    .map(applicant => applicant.career_id)
                    .filter(Boolean)
            )
        ];

        if (!careerIds.length) {
            return applicationRecords;
        }

        const { data: careers, error } = await supabase
            .from(CAREERS_TABLE)
            .select("*")
            .in("id", careerIds);

        if (error) {
            console.error("CAREER INFORMATION ERROR:", error);
            return applicationRecords;
        }

        const careerMap = new Map(
            (careers || []).map(career => [
                String(career.id),
                career
            ])
        );

        return applicationRecords.map(applicant => ({
            ...applicant,
            careers: careerMap.get(String(applicant.career_id)) || null
        }));
    }

    /* =========================================
       LOAD APPLICANTS
    ========================================= */

    async function loadApplicants() {
        if (isLoading) return;

        isLoading = true;

        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.classList.add("loading");
        }

        try {
            const { data, error } = await supabase
                .from(APPLICATIONS_TABLE)
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("LOAD APPLICANTS ERROR:", error);

                showTableMessage(
                    "Unable to load applications. Please check your database permissions.",
                    true
                );

                showToast("Unable to load applications.", "error");
                return;
            }

            const records = data || [];

            applicants = await loadCareerInformation(records);

            console.log("APPLICANTS LOADED:", applicants);

            updateStatistics();
            renderApplicants();

        } catch (error) {
            console.error("Unexpected applicant loading error:", error);

            showTableMessage("An unexpected error occurred.", true);
            showToast("Unable to load applicant records.", "error");

        } finally {
            isLoading = false;

            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.classList.remove("loading");
            }
        }
    }

    /* =========================================
       STATISTICS
    ========================================= */

    function updateStatistics() {
        const total = applicants.length;

        const pending = applicants.filter(
            applicant => getApplicantStatus(applicant) === "Pending"
        ).length;

        const shortlisted = applicants.filter(
            applicant => getApplicantStatus(applicant) === "Shortlisted"
        ).length;

        const unread = applicants.filter(
            applicant => applicant.is_read === false
        ).length;

        totalApplicantsElement.textContent = total;
        pendingApplicantsElement.textContent = pending;
        shortlistedApplicantsElement.textContent = shortlisted;
        unreadApplicantsElement.textContent = unread;
    }

    /* =========================================
       FILTER & SORT APPLICANTS
    ========================================= */

    function getFilteredApplicants() {
        let filtered = [...applicants];

        const searchTerm = searchInput.value
            .trim()
            .toLowerCase();

        const selectedStatus = statusFilter.value;
        const selectedSort = sortFilter.value;

        if (searchTerm) {
            filtered = filtered.filter(applicant => {
                const searchable = [
                    applicant.id,
                    applicant.full_name,
                    applicant.email,
                    applicant.contact_number,
                    getPosition(applicant)
                ].join(" ").toLowerCase();

                return searchable.includes(searchTerm);
            });
        }

        if (selectedStatus !== "all") {
            filtered = filtered.filter(
                applicant => getApplicantStatus(applicant) === selectedStatus
            );
        }

        if (selectedSort === "newest") {
            filtered.sort((a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
        }

        if (selectedSort === "oldest") {
            filtered.sort((a, b) =>
                new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );
        }

        if (selectedSort === "name") {
            filtered.sort((a, b) =>
                getApplicantName(a).localeCompare(getApplicantName(b))
            );
        }

        return filtered;
    }

    /* =========================================
       RENDER APPLICANTS
    ========================================= */

    function renderApplicants() {
        const filtered = getFilteredApplicants();

        recordCountElement.textContent =
            `${filtered.length} ${filtered.length === 1 ? "applicant" : "applicants"}`;

        tableSummaryElement.textContent =
            `Showing ${filtered.length} of ${applicants.length} applicants`;

        if (!filtered.length) {
            showTableMessage(
                applicants.length
                    ? "No applicants match your search or filters."
                    : "No applications have been submitted yet."
            );

            return;
        }

        applicantTableBody.innerHTML = filtered.map(applicant => {
            const name = getApplicantName(applicant);
            const initials = getApplicantInitials(name);
            const status = getApplicantStatus(applicant);
            const isRead = applicant.is_read !== false;

            const statusClass = status
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "");

            return `
                <tr>
                    <td>
                        <div class="applicant-cell">
                            <div class="applicant-avatar">
                                ${escapeHTML(initials)}
                            </div>

                            <div class="applicant-info">
                                <strong>${escapeHTML(name)}</strong>
                                <span>${escapeHTML(applicant.email || "No email")}</span>
                            </div>
                        </div>
                    </td>

                    <td>${escapeHTML(getPosition(applicant))}</td>

                    <td>${escapeHTML(formatDate(applicant.created_at))}</td>

                    <td>
                        <span class="status-badge status-${escapeHTML(statusClass)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        <span class="review-badge ${isRead ? "reviewed" : "unread"}">
                            ${isRead ? "Reviewed" : "Unread"}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="view-applicant-button"
                            data-applicant-id="${escapeHTML(applicant.id)}"
                        >
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

    async function openApplicantModal(applicantId) {
        const applicant = applicants.find(
            item => String(item.id) === String(applicantId)
        );

        if (!applicant) {
            showToast("Applicant record not found.", "error");
            return;
        }

        activeApplicant = applicant;

        applicantModal.classList.add("show");

        applicantDetails.innerHTML = `
            <div class="modal-loading">Loading applicant details...</div>
        `;

        if (applicant.is_read === false) {
            const { error } = await supabase
                .from(APPLICATIONS_TABLE)
                .update({ is_read: true })
                .eq("id", applicant.id);

            if (error) {
                console.error("MARK AS READ ERROR:", error);
            } else {
                applicant.is_read = true;
                updateStatistics();
                renderApplicants();
            }
        }

        await renderApplicantDetails(applicant);
    }

    /* =========================================
       RENDER APPLICANT DETAILS
    ========================================= */

    async function renderApplicantDetails(applicant) {
        if (!applicant) return;

        const name = getApplicantName(applicant);
        const status = getApplicantStatus(applicant);

        let resumeUrl = null;

        if (applicant.resume_path) {
            const { data, error } = await supabase.storage
                .from(RESUME_BUCKET)
                .createSignedUrl(applicant.resume_path, 300);

            if (error) {
                console.error("RESUME URL ERROR:", error);
            } else {
                resumeUrl = data?.signedUrl || null;
            }
        }

        if (
            !activeApplicant ||
            String(activeApplicant.id) !== String(applicant.id)
        ) {
            return;
        }

        applicantDetails.innerHTML = `
            <div class="applicant-profile-heading">
                <div class="applicant-profile-avatar">
                    ${escapeHTML(getApplicantInitials(name))}
                </div>

                <div>
                    <h3>${escapeHTML(name)}</h3>
                    <p>${escapeHTML(getPosition(applicant))}</p>
                    <span class="status-badge status-${escapeHTML(status.toLowerCase())}">
                        ${escapeHTML(status)}
                    </span>
                </div>
            </div>

            <div class="applicant-detail-section">
                <h3>Personal Information</h3>

                <div class="detail-grid">
                    <div class="detail-item">
                        <span>Applicant ID</span>
                        <strong>${escapeHTML(applicant.id)}</strong>
                    </div>

                    <div class="detail-item">
                        <span>Full Name</span>
                        <strong>${escapeHTML(name)}</strong>
                    </div>

                    <div class="detail-item">
                        <span>Email Address</span>
                        <strong>${escapeHTML(applicant.email || "Not provided")}</strong>
                    </div>

                    <div class="detail-item">
                        <span>Contact Number</span>
                        <strong>${escapeHTML(applicant.contact_number || "Not provided")}</strong>
                    </div>

                    <div class="detail-item">
                        <span>Address</span>
                        <strong>${escapeHTML(applicant.address || "Not provided")}</strong>
                    </div>

                    <div class="detail-item">
                        <span>Expected Salary</span>
                        <strong>${escapeHTML(formatCurrency(applicant.expected_salary))}</strong>
                    </div>

                    <div class="detail-item">
                        <span>Date Submitted</span>
                        <strong>${escapeHTML(formatDateTime(applicant.created_at))}</strong>
                    </div>
                </div>
            </div>

            <div class="applicant-detail-section">
                <h3>Cover Letter</h3>

                <div class="cover-letter-content">
                    ${applicant.cover_letter
                        ? escapeHTML(applicant.cover_letter).replace(/\n/g, "<br>")
                        : "No cover letter submitted."}
                </div>
            </div>

            <div class="applicant-detail-section">
                <h3>Resume</h3>

                ${
                    resumeUrl
                        ? `
                            <a
                                href="${escapeHTML(resumeUrl)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="resume-download-button"
                            >
                                View / Download Resume
                            </a>
                        `
                        : `
                            <p class="resume-unavailable">
                                Resume is unavailable or could not be accessed.
                            </p>
                        `
                }
            </div>

            <div class="applicant-detail-section">
                <h3>Application Status</h3>

                <div class="status-update-controls">
                    <select id="applicantStatusSelect">
                        <option value="Pending" ${status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="Shortlisted" ${status === "Shortlisted" ? "selected" : ""}>Shortlisted</option>
                        <option value="Accepted" ${status === "Accepted" ? "selected" : ""}>Accepted</option>
                        <option value="Rejected" ${status === "Rejected" ? "selected" : ""}>Rejected</option>
                    </select>

                    <button
                        type="button"
                        id="updateApplicantStatus"
                        class="update-status-button"
                    >
                        Update Status
                    </button>
                </div>
            </div>
        `;

        document.getElementById("updateApplicantStatus")?.addEventListener(
            "click",
            updateApplicantStatus
        );
    }

    /* =========================================
       UPDATE APPLICANT STATUS
    ========================================= */

    async function updateApplicantStatus() {
        if (!activeApplicant) return;

        const statusSelect = document.getElementById(
            "applicantStatusSelect"
        );

        const updateButton = document.getElementById(
            "updateApplicantStatus"
        );

        if (!statusSelect || !updateButton) return;

        const newStatus = statusSelect.value;

        updateButton.disabled = true;
        updateButton.textContent = "Updating...";

        try {
            const { data, error } = await supabase
                .from(APPLICATIONS_TABLE)
                .update({
                    status: newStatus
                })
                .eq("id", activeApplicant.id)
                .select()
                .single();

            if (error) throw error;

            const index = applicants.findIndex(
                item => String(item.id) === String(activeApplicant.id)
            );

            if (index !== -1) {
                applicants[index] = {
                    ...applicants[index],
                    ...data
                };

                activeApplicant = applicants[index];
            }

            updateStatistics();
            renderApplicants();

            showToast("Applicant status updated successfully.");

            await renderApplicantDetails(activeApplicant);

        } catch (error) {
            console.error("UPDATE STATUS ERROR:", error);

            showToast(
                error.message || "Unable to update applicant status.",
                "error"
            );

            updateButton.disabled = false;
            updateButton.textContent = "Update Status";
        }
    }

    /* =========================================
       CLOSE APPLICANT MODAL
    ========================================= */

    function closeApplicantModal() {
        applicantModal.classList.remove("show");
        activeApplicant = null;

        applicantDetails.innerHTML = `
            <div class="modal-loading">Loading applicant details...</div>
        `;
    }

    /* =========================================
       REALTIME UPDATES
    ========================================= */

    function setupRealtime() {
        console.log("Initializing applicant realtime updates...");

        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }

        realtimeChannel = supabase
            .channel("applicant-management-updates")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: APPLICATIONS_TABLE
                },
                async payload => {
                    console.log("APPLICANT DATABASE UPDATE:", payload);

                    await loadApplicants();

                    if (activeApplicant) {
                        const updatedApplicant = applicants.find(
                            item => String(item.id) === String(activeApplicant.id)
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
            .subscribe(status => {
                console.log("Applicant realtime status:", status);

                if (
                    status === "CHANNEL_ERROR" ||
                    status === "TIMED_OUT"
                ) {
                    console.error("Realtime connection failed.");
                }
            });
    }

    /* =========================================
       EVENT LISTENERS
    ========================================= */

    applicantTableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-applicant-id]");

        if (!button) return;

        openApplicantModal(button.dataset.applicantId);
    });

    searchInput.addEventListener("input", renderApplicants);
    statusFilter.addEventListener("change", renderApplicants);
    sortFilter.addEventListener("change", renderApplicants);

    refreshButton.addEventListener("click", async () => {
        await loadApplicants();
        showToast("Applicant records refreshed.");
    });

    clearFiltersButton.addEventListener("click", () => {
        searchInput.value = "";
        statusFilter.value = "all";
        sortFilter.value = "newest";

        renderApplicants();
    });

    closeApplicantModalButton.addEventListener(
        "click",
        closeApplicantModal
    );

    closeApplicantButton.addEventListener(
        "click",
        closeApplicantModal
    );

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

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
            if (realtimeChannel) {
                await supabase.removeChannel(realtimeChannel);
            }

            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            window.location.replace("login.html");

        } catch (error) {
            console.error("LOGOUT ERROR:", error);

            showToast("Unable to sign out. Please try again.", "error");
            logoutButton.disabled = false;
        }
    });

    /* =========================================
       INITIALIZE APPLICANT MANAGEMENT
    ========================================= */

    const isAdmin = await verifyAdmin();

    if (!isAdmin) return;

    await loadApplicants();

    setupRealtime();

    console.log("APPLICANT MANAGEMENT INITIALIZED");

});
