
/* =========================================
   HSN PHILIPPINES - ADMIN DASHBOARD
   CAREER + APPLICANT MANAGEMENT
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_KEY = "sb_publishable_oiJHNFvDHWa-aATe_HWJoQ_RLB2m8BZ";

    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    const CAREERS_TABLE = "careers";
    const APPLICATIONS_TABLE = "career_applications";
    const RESUME_BUCKET = "career-resumes";

    const loginPage = document.getElementById("adminLoginPage");
    const dashboard = document.getElementById("adminDashboard");
    const loginForm = document.getElementById("adminLoginForm");
    const loginMessage = document.getElementById("adminLoginMessage");
    const loginButton = document.getElementById("adminLoginButton");

    const careerTableBody = document.getElementById("careerAdminTableBody");
    const applicantsTableBody = document.getElementById("applicantsTableBody");

    const careerModal = document.getElementById("careerAdminModal");
    const careerForm = document.getElementById("careerAdminForm");

    let careers = [];
    let applicants = [];
    let selectedCareerId = "all";

    const $ = id => document.getElementById(id);

    /* =========================================
       UTILITIES
    ========================================= */

    function showMessage(element, message, isError = true) {
        if (!element) return;

        element.textContent = message;
        element.style.color = isError ? "#c0392b" : "#16804a";
    }

    function escapeText(value) {
        return String(value ?? "");
    }

    function formatDate(value) {
        if (!value) return "N/A";

        return new Date(value).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatCurrency(value) {
        return Number(value || 0).toLocaleString("en-PH", {
            style: "currency",
            currency: "PHP"
        });
    }

    function addCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = escapeText(value);
        row.appendChild(cell);
        return cell;
    }

    function addActionButton(parent, label, callback) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", callback);
        parent.appendChild(button);
        return button;
    }

    /* =========================================
       AUTHENTICATION
    ========================================= */

    async function verifyAdmin(user) {
        if (!user) return false;

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
            console.error("Admin profile verification error:", error);
            return false;
        }

        return data?.role === "admin";
    }

    async function showDashboard(user) {
        const isAdmin = await verifyAdmin(user);

        if (!isAdmin) {
            await supabaseClient.auth.signOut();

            loginPage.hidden = false;
            dashboard.hidden = true;

            showMessage(
                loginMessage,
                "Access denied. An administrator account is required."
            );

            return;
        }

        loginPage.hidden = true;
        dashboard.hidden = false;

        $("adminUserEmail").textContent = user.email || "";

        await Promise.all([
            loadCareers(),
            loadApplicants()
        ]);
    }

    async function initializeAdmin() {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("Session error:", error);
            return;
        }

        if (data.session?.user) {
            await showDashboard(data.session.user);
        } else {
            loginPage.hidden = false;
            dashboard.hidden = true;
        }
    }

    loginForm?.addEventListener("submit", async event => {
        event.preventDefault();

        loginButton.disabled = true;
        loginButton.textContent = "Signing in...";

        showMessage(loginMessage, "");

        const email = $("adminEmail").value.trim();
        const password = $("adminPassword").value;

        const { data, error } = await supabaseClient.auth
            .signInWithPassword({ email, password });

        if (error) {
            showMessage(loginMessage, error.message);
            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
            return;
        }

        await showDashboard(data.user);

        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    });

    $("adminLogoutButton")?.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert(error.message);
            return;
        }

        dashboard.hidden = true;
        loginPage.hidden = false;
        loginForm.reset();
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
            dashboard.hidden = true;
            loginPage.hidden = false;
        }
    });

    /* =========================================
       CAREER MANAGEMENT
    ========================================= */

    async function loadCareers() {
        careerTableBody.innerHTML =
            '<tr><td colspan="6">Loading positions...</td></tr>';

        const { data, error } = await supabaseClient
            .from(CAREERS_TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Career query error:", error);
            careerTableBody.innerHTML =
                '<tr><td colspan="6">Unable to load positions.</td></tr>';
            return;
        }

        careers = data || [];

        renderCareers();
        populateCareerFilter();
        updateDashboardStats();
    }

    function renderCareers() {
        careerTableBody.innerHTML = "";

        const search =
            ($("careerAdminSearch")?.value || "").toLowerCase().trim();

        const filter = $("careerAdminFilter")?.value || "all";

        const filtered = careers.filter(career => {
            const matchesSearch =
                (career.title || "").toLowerCase().includes(search) ||
                (career.department || "").toLowerCase().includes(search) ||
                (career.location || "").toLowerCase().includes(search);

            const matchesStatus =
                filter === "all" ||
                (filter === "published" && career.is_published) ||
                (filter === "draft" && !career.is_published);

            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            careerTableBody.innerHTML =
                '<tr><td colspan="6">No career positions found.</td></tr>';
            return;
        }

        filtered.forEach(career => {
            const row = document.createElement("tr");

            addCell(row, career.title);
            addCell(row, career.department);
            addCell(row, career.location);
            addCell(row, career.employment_type);

            const statusCell = document.createElement("td");
            statusCell.textContent =
                career.is_published ? "Published" : "Draft";

            row.appendChild(statusCell);

            const actions = document.createElement("td");

            addActionButton(actions, "Edit", () => openCareerModal(career));

            addActionButton(actions, "Applicants", () => {
                filterApplicantsByCareer(career.id);
            });

            addActionButton(actions,
                career.is_published ? "Unpublish" : "Publish",
                () => toggleCareerPublication(career)
            );

            addActionButton(actions, "Delete", () => deleteCareer(career));

            row.appendChild(actions);
            careerTableBody.appendChild(row);
        });
    }

    function openCareerModal(career = null) {
        careerForm.reset();
        showMessage($("careerAdminMessage"), "");

        $("careerRecordId").value = career?.id || "";
        $("careerModalTitle").textContent =
            career ? "Edit Position" : "Add Position";

        $("careerTitle").value = career?.title || "";
        $("careerDepartment").value = career?.department || "";
        $("careerLocation").value = career?.location || "";
        $("careerEmploymentType").value =
            career?.employment_type || "Full-time";

        $("careerDescription").value = career?.description || "";

        $("careerRequirements").value = Array.isArray(career?.requirements)
            ? career.requirements.join("\n")
            : career?.requirements || "";

        $("careerIsPublished").checked =
            career?.is_published || false;

        careerModal.classList.add("active");
        careerModal.setAttribute("aria-hidden", "false");
    }

    function closeCareerModal() {
        careerModal.classList.remove("active");
        careerModal.setAttribute("aria-hidden", "true");
        careerForm.reset();
    }

    $("addCareerButton")?.addEventListener("click", () => {
        openCareerModal();
    });

    $("closeCareerAdminModal")?.addEventListener("click", closeCareerModal);
    $("cancelCareerForm")?.addEventListener("click", closeCareerModal);

    careerModal?.addEventListener("click", event => {
        if (event.target === careerModal) {
            closeCareerModal();
        }
    });

    careerForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const recordId = $("careerRecordId").value;

        const payload = {
            title: $("careerTitle").value.trim(),
            department: $("careerDepartment").value.trim(),
            location: $("careerLocation").value.trim(),
            employment_type: $("careerEmploymentType").value,
            description: $("careerDescription").value.trim(),
            requirements: $("careerRequirements").value.trim(),
            is_published: $("careerIsPublished").checked
        };

        if (!payload.title) {
            showMessage($("careerAdminMessage"), "Position title is required.");
            return;
        }

        $("saveCareerButton").disabled = true;
        $("saveCareerButton").textContent = "Saving...";

        let result;

        if (recordId) {
            result = await supabaseClient
                .from(CAREERS_TABLE)
                .update(payload)
                .eq("id", recordId);
        } else {
            result = await supabaseClient
                .from(CAREERS_TABLE)
                .insert(payload);
        }

        $("saveCareerButton").disabled = false;
        $("saveCareerButton").textContent = "Save Position";

        if (result.error) {
            console.error("Career save error:", result.error);
            showMessage(
                $("careerAdminMessage"),
                result.error.message
            );
            return;
        }

        closeCareerModal();
        await loadCareers();
    });

    async function toggleCareerPublication(career) {
        const { error } = await supabaseClient
            .from(CAREERS_TABLE)
            .update({ is_published: !career.is_published })
            .eq("id", career.id);

        if (error) {
            alert("Unable to update publication status: " + error.message);
            return;
        }

        await loadCareers();
    }

    async function deleteCareer(career) {
        const confirmed = confirm(
            `Are you sure you want to delete "${career.title}"?`
        );

        if (!confirmed) return;

        const { error } = await supabaseClient
            .from(CAREERS_TABLE)
            .delete()
            .eq("id", career.id);

        if (error) {
            alert("Unable to delete position: " + error.message);
            return;
        }

        await loadCareers();
        await loadApplicants();
    }

    $("careerAdminSearch")?.addEventListener("input", renderCareers);
    $("careerAdminFilter")?.addEventListener("change", renderCareers);

    /* =========================================
       APPLICANT MANAGEMENT
    ========================================= */

    async function loadApplicants() {
        applicantsTableBody.innerHTML =
            '<tr><td colspan="8">Loading applicants...</td></tr>';

        const { data, error } = await supabaseClient
            .from(APPLICATIONS_TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Applicant query error:", error);
            applicantsTableBody.innerHTML =
                '<tr><td colspan="8">Unable to load applicants.</td></tr>';
            return;
        }

        applicants = data || [];

        renderApplicants();
        updateApplicantStats();
        updateDashboardStats();
    }

    function populateCareerFilter() {
        const filter = $("applicantPositionFilter");
        if (!filter) return;

        const currentValue = filter.value || "all";

        filter.innerHTML = "";

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Positions";
        filter.appendChild(allOption);

        careers.forEach(career => {
            const option = document.createElement("option");
            option.value = career.id;
            option.textContent = career.title;
            filter.appendChild(option);
        });

        if (
            currentValue === "all" ||
            careers.some(career => career.id === currentValue)
        ) {
            filter.value = currentValue;
        } else {
            filter.value = "all";
        }

        selectedCareerId = filter.value;
    }

    function filterApplicantsByCareer(careerId) {
        selectedCareerId = careerId;

        const filter = $("applicantPositionFilter");

        if (filter) {
            filter.value = careerId;
        }

        renderApplicants();

        $("applicantManagement")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function renderApplicants() {
        applicantsTableBody.innerHTML = "";

        const search =
            ($("applicantSearch")?.value || "").toLowerCase().trim();

        const statusFilter =
            $("applicantStatusFilter")?.value || "all";

        const positionFilter =
            $("applicantPositionFilter")?.value || selectedCareerId;

        selectedCareerId = positionFilter;

        const filtered = applicants.filter(applicant => {
            const matchesSearch =
                (applicant.full_name || "").toLowerCase().includes(search) ||
                (applicant.contact_no || "").toLowerCase().includes(search) ||
                (applicant.position_title || "").toLowerCase().includes(search) ||
                (applicant.address || "").toLowerCase().includes(search);

            const matchesStatus =
                statusFilter === "all" ||
                applicant.status === statusFilter;

            const matchesPosition =
                positionFilter === "all" ||
                applicant.career_id === positionFilter;

            return matchesSearch && matchesStatus && matchesPosition;
        });

        if (!filtered.length) {
            applicantsTableBody.innerHTML =
                '<tr><td colspan="8">No applicants found.</td></tr>';
            return;
        }

        filtered.forEach(applicant => {
            const row = document.createElement("tr");

            addCell(row, applicant.full_name);
            addCell(row, applicant.contact_no);
            addCell(row, applicant.position_title);
            addCell(row, applicant.address);
            addCell(row, formatCurrency(applicant.expected_salary));
            addCell(row, formatDate(applicant.created_at));

            const statusCell = document.createElement("td");
            const statusSelect = document.createElement("select");

            [
                "Pending",
                "Under Review",
                "Shortlisted",
                "Rejected",
                "Hired"
            ].forEach(status => {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;
                option.selected = applicant.status === status;
                statusSelect.appendChild(option);
            });

            statusSelect.addEventListener("change", () => {
                updateApplicantStatus(applicant.id, statusSelect.value);
            });

            statusCell.appendChild(statusSelect);
            row.appendChild(statusCell);

            const resumeCell = document.createElement("td");

            addActionButton(resumeCell, "View Resume", () => {
                viewApplicantResume(applicant.resume_path);
            });

            row.appendChild(resumeCell);
            applicantsTableBody.appendChild(row);
        });
    }

    async function viewApplicantResume(resumePath) {
        if (!resumePath) {
            alert("Resume file not found.");
            return;
        }

        const { data, error } = await supabaseClient.storage
            .from(RESUME_BUCKET)
            .createSignedUrl(resumePath, 300);

        if (error) {
            console.error("Resume access error:", error);
            alert("Unable to open resume: " + error.message);
            return;
        }

        window.open(
            data.signedUrl,
            "_blank",
            "noopener,noreferrer"
        );
    }

    async function updateApplicantStatus(applicantId, status) {
        const allowedStatuses = [
            "Pending",
            "Under Review",
            "Shortlisted",
            "Rejected",
            "Hired"
        ];

        if (!allowedStatuses.includes(status)) return;

        const { error } = await supabaseClient
            .from(APPLICATIONS_TABLE)
            .update({ status })
            .eq("id", applicantId);

        if (error) {
            alert("Unable to update applicant status: " + error.message);
            await loadApplicants();
            return;
        }

        await loadApplicants();
    }

    $("applicantSearch")?.addEventListener("input", renderApplicants);

    $("applicantStatusFilter")?.addEventListener(
        "change",
        renderApplicants
    );

    $("applicantPositionFilter")?.addEventListener(
        "change",
        renderApplicants
    );

    $("refreshApplicants")?.addEventListener("click", async () => {
        await loadApplicants();
    });

    /* =========================================
       DASHBOARD STATISTICS
    ========================================= */

    function updateDashboardStats() {
        $("totalCareers").textContent = careers.length;

        $("publishedCareers").textContent =
            careers.filter(career => career.is_published).length;

        $("totalApplicants").textContent = applicants.length;

        $("pendingApplicants").textContent =
            applicants.filter(applicant =>
                applicant.status === "Pending"
            ).length;
    }

    function updateApplicantStats() {
        $("applicantTotalCount").textContent = applicants.length;

        $("applicantPendingCount").textContent =
            applicants.filter(a => a.status === "Pending").length;

        $("applicantReviewCount").textContent =
            applicants.filter(a => a.status === "Under Review").length;

        $("applicantShortlistedCount").textContent =
            applicants.filter(a => a.status === "Shortlisted").length;

        $("applicantHiredCount").textContent =
            applicants.filter(a => a.status === "Hired").length;
    }

    /* =========================================
       SIDEBAR
    ========================================= */

    $("toggleAdminSidebar")?.addEventListener("click", () => {
        $("adminSidebar")?.classList.toggle("active");
    });

    document.querySelectorAll(".sidebar-navigation a").forEach(link => {
        link.addEventListener("click", () => {
            $("adminSidebar")?.classList.remove("active");
        });
    });

    /* =========================================
       INITIALIZATION
    ========================================= */

    initializeAdmin();
});
