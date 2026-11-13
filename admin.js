
"use strict";

/* =========================================
   HSN PHILIPPINES
   ADMIN DASHBOARD
   CAREER + APPLICANT MANAGEMENT
========================================= */


/* =========================================
   SUPABASE CONFIGURATION
========================================= */

const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oiJHNFvDHWa-aATe_HWJoQ_RLB2m8BZ";

const CAREERS_TABLE = "careers";
const APPLICATIONS_TABLE = "career_applications";
const PROFILES_TABLE = "profiles";
const RESUME_BUCKET = "career-resumes";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================
   GLOBAL VARIABLES
========================================= */

let currentAdmin = null;
let careersCache = [];
let applicantsCache = [];

const APPLICATION_STATUSES = [
    "Pending",
    "Under Review",
    "Shortlisted",
    "Rejected",
    "Hired"
];


/* =========================================
   DOM ELEMENTS
========================================= */

const $ = id => document.getElementById(id);

const adminLoginPage = $("adminLoginPage");
const adminDashboard = $("adminDashboard");

const adminLoginForm = $("adminLoginForm");
const adminLoginButton = $("adminLoginButton");
const adminLoginMessage = $("adminLoginMessage");

const adminLogoutButton = $("adminLogoutButton");
const adminUserEmail = $("adminUserEmail");

const careerAdminTableBody = $("careerAdminTableBody");
const careerAdminSearch = $("careerAdminSearch");
const careerAdminFilter = $("careerAdminFilter");

const careerAdminModal = $("careerAdminModal");
const careerAdminForm = $("careerAdminForm");
const careerModalTitle = $("careerModalTitle");

const addCareerButton = $("addCareerButton");
const closeCareerAdminModal = $("closeCareerAdminModal");
const cancelCareerForm = $("cancelCareerForm");
const saveCareerButton = $("saveCareerButton");

const careerRecordId = $("careerRecordId");
const careerTitle = $("careerTitle");
const careerDepartment = $("careerDepartment");
const careerLocation = $("careerLocation");
const careerEmploymentType = $("careerEmploymentType");
const careerDescription = $("careerDescription");
const careerRequirements = $("careerRequirements");
const careerIsPublished = $("careerIsPublished");
const careerAdminMessage = $("careerAdminMessage");

const applicantsTableBody = $("applicantsTableBody");
const applicantSearch = $("applicantSearch");
const applicantStatusFilter = $("applicantStatusFilter");
const refreshApplicantsButton = $("refreshApplicants");

const adminSidebar = $("adminSidebar");
const toggleAdminSidebar = $("toggleAdminSidebar");


/* =========================================
   HELPERS
========================================= */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


function formatCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "Not specified";
    }

    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2
    }).format(amount);
}


function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function showMessage(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.className = `admin-message ${type}`;
}


function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.className = "";
}


function setLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent =
            button.dataset.originalText || button.textContent;

        delete button.dataset.originalText;
    }
}


function displayError(error) {
    console.error(error);
    return error?.message || "An unexpected error occurred.";
}


/* =========================================
   AUTHENTICATION
========================================= */

function showLoginPage(message = "") {
    if (adminLoginPage) adminLoginPage.hidden = false;
    if (adminDashboard) adminDashboard.hidden = true;

    if (message) {
        showMessage(adminLoginMessage, message);
    }
}


async function verifyAdmin(user) {
    if (!user) return false;

    const { data: profile, error } = await supabaseClient
        .from(PROFILES_TABLE)
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return profile?.role === "admin";
}


async function openAdminDashboard(user) {
    const isAdmin = await verifyAdmin(user);

    if (!isAdmin) {
        await supabaseClient.auth.signOut();

        showLoginPage(
            "Access denied. Your account does not have administrator access."
        );

        return;
    }

    currentAdmin = user;

    if (adminLoginPage) adminLoginPage.hidden = true;
    if (adminDashboard) adminDashboard.hidden = false;

    if (adminUserEmail) {
        adminUserEmail.textContent = user.email || "Administrator";
    }

    await loadCareers();
    await loadApplicants();

    updateDashboardStatistics();
}


async function initializeAdmin() {
    try {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (!session?.user) {
            showLoginPage();
            return;
        }

        await openAdminDashboard(session.user);

    } catch (error) {
        console.error("Authentication error:", error);
        showLoginPage(displayError(error));
    }
}


/* =========================================
   LOGIN
========================================= */

if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async event => {
        event.preventDefault();

        clearMessage(adminLoginMessage);

        const email = $("adminEmail")?.value.trim();
        const password = $("adminPassword")?.value;

        if (!email || !password) {
            showMessage(
                adminLoginMessage,
                "Please enter your email and password."
            );
            return;
        }

        setLoading(adminLoginButton, true, "Signing in...");

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            await openAdminDashboard(data.user);

        } catch (error) {
            console.error("Login failed:", error);

            showMessage(
                adminLoginMessage,
                displayError(error)
            );

        } finally {
            setLoading(adminLoginButton, false);
        }
    });
}


/* =========================================
   LOGOUT
========================================= */

if (adminLogoutButton) {
    adminLogoutButton.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to sign out?")) return;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert(displayError(error));
            return;
        }

        currentAdmin = null;
        careersCache = [];
        applicantsCache = [];

        showLoginPage();
    });
}


/* =========================================
   CAREER MANAGEMENT
========================================= */

async function loadCareers() {
    if (!careerAdminTableBody) return;

    careerAdminTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="table-message">
                Loading positions...
            </td>
        </tr>
    `;

    try {
        const { data, error } = await supabaseClient
            .from(CAREERS_TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        careersCache = data || [];

        renderCareers();
        updateDashboardStatistics();

    } catch (error) {
        console.error("Career loading error:", error);

        careerAdminTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-message error">
                    ${escapeHTML(displayError(error))}
                </td>
            </tr>
        `;
    }
}


function renderCareers() {
    if (!careerAdminTableBody) return;

    const search = careerAdminSearch?.value.trim().toLowerCase() || "";
    const filter = careerAdminFilter?.value || "all";

    const filtered = careersCache.filter(career => {
        const content = [
            career.title,
            career.department,
            career.location,
            career.employment_type
        ].join(" ").toLowerCase();

        const matchesSearch = content.includes(search);

        const matchesFilter =
            filter === "all" ||
            (filter === "published" && career.is_published === true) ||
            (filter === "unpublished" && career.is_published !== true);

        return matchesSearch && matchesFilter;
    });

    if (!filtered.length) {
        careerAdminTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-message">
                    No positions found.
                </td>
            </tr>
        `;
        return;
    }

    careerAdminTableBody.innerHTML = filtered.map(career => {
        const published = career.is_published === true;

        const applicantCount = applicantsCache.filter(
            applicant => String(applicant.career_id) === String(career.id)
        ).length;

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(career.title)}</strong>
                    <small class="career-applicant-count">
                        ${applicantCount} applicant(s)
                    </small>
                </td>

                <td>${escapeHTML(career.department)}</td>
                <td>${escapeHTML(career.location)}</td>
                <td>${escapeHTML(career.employment_type)}</td>

                <td>
                    <span class="status-badge ${published ? "published" : "unpublished"}">
                        ${published ? "Published" : "Unpublished"}
                    </span>
                </td>

                <td>
                    <div class="table-actions">

                        <button
                            type="button"
                            class="table-action applicants"
                            data-action="view-career-applicants"
                            data-id="${escapeHTML(career.id)}"
                        >
                            Applicants
                        </button>

                        <button
                            type="button"
                            class="table-action edit"
                            data-action="edit-career"
                            data-id="${escapeHTML(career.id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="table-action toggle"
                            data-action="toggle-career"
                            data-id="${escapeHTML(career.id)}"
                        >
                            ${published ? "Unpublish" : "Publish"}
                        </button>

                        <button
                            type="button"
                            class="table-action delete"
                            data-action="delete-career"
                            data-id="${escapeHTML(career.id)}"
                        >
                            Delete
                        </button>

                    </div>
                </td>
            </tr>
        `;
    }).join("");
}


/* =========================================
   CAREER MODAL
========================================= */

function openCareerModal(career = null) {
    if (!careerAdminModal || !careerAdminForm) return;

    careerAdminForm.reset();
    clearMessage(careerAdminMessage);

    if (career) {
        careerModalTitle.textContent = "Edit Career Position";

        careerRecordId.value = career.id;
        careerTitle.value = career.title || "";
        careerDepartment.value = career.department || "";
        careerLocation.value = career.location || "";
        careerEmploymentType.value = career.employment_type || "";
        careerDescription.value = career.description || "";

        careerRequirements.value = Array.isArray(career.requirements)
            ? career.requirements.join("\n")
            : career.requirements || "";

        careerIsPublished.checked = career.is_published === true;

    } else {
        careerModalTitle.textContent = "Add New Position";
        careerRecordId.value = "";
        careerIsPublished.checked = false;
    }

    careerAdminModal.classList.add("active");
    document.body.classList.add("modal-open");
}


function closeCareerModal() {
    careerAdminModal?.classList.remove("active");
    document.body.classList.remove("modal-open");
}


if (addCareerButton) {
    addCareerButton.addEventListener("click", () => {
        openCareerModal();
    });
}


if (closeCareerAdminModal) {
    closeCareerAdminModal.addEventListener("click", closeCareerModal);
}


if (cancelCareerForm) {
    cancelCareerForm.addEventListener("click", closeCareerModal);
}


if (careerAdminModal) {
    careerAdminModal.addEventListener("click", event => {
        if (event.target === careerAdminModal) {
            closeCareerModal();
        }
    });
}


/* =========================================
   SAVE CAREER
========================================= */

if (careerAdminForm) {
    careerAdminForm.addEventListener("submit", async event => {
        event.preventDefault();

        clearMessage(careerAdminMessage);

        const id = careerRecordId.value.trim();

        const requirements = careerRequirements.value
            .split("\n")
            .map(item => item.trim())
            .filter(Boolean);

        const careerData = {
            title: careerTitle.value.trim(),
            department: careerDepartment.value.trim(),
            location: careerLocation.value.trim(),
            employment_type: careerEmploymentType.value,
            description: careerDescription.value.trim(),
            requirements,
            is_published: careerIsPublished.checked
        };

        if (
            !careerData.title ||
            !careerData.department ||
            !careerData.location ||
            !careerData.employment_type ||
            !careerData.description
        ) {
            showMessage(
                careerAdminMessage,
                "Please complete all required fields."
            );
            return;
        }

        setLoading(saveCareerButton, true, "Saving...");

        try {
            let result;

            if (id) {
                result = await supabaseClient
                    .from(CAREERS_TABLE)
                    .update(careerData)
                    .eq("id", id);
            } else {
                result = await supabaseClient
                    .from(CAREERS_TABLE)
                    .insert([careerData]);
            }

            if (result.error) throw result.error;

            closeCareerModal();

            await loadCareers();

            alert(
                id
                    ? "Position updated successfully."
                    : "New position added successfully."
            );

        } catch (error) {
            showMessage(careerAdminMessage, displayError(error));

        } finally {
            setLoading(saveCareerButton, false);
        }
    });
}


/* =========================================
   CAREER TABLE ACTIONS
========================================= */

if (careerAdminTableBody) {
    careerAdminTableBody.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const { action, id } = button.dataset;

        const career = careersCache.find(
            item => String(item.id) === String(id)
        );

        if (!career) return;

        switch (action) {
            case "edit-career":
                openCareerModal(career);
                break;

            case "toggle-career":
                await toggleCareerPublication(career);
                break;

            case "delete-career":
                await deleteCareer(career);
                break;

            case "view-career-applicants":
                showCareerApplicants(career);
                break;
        }
    });
}


async function toggleCareerPublication(career) {
    const newStatus = career.is_published !== true;

    if (!confirm(
        newStatus
            ? `Publish "${career.title}"?`
            : `Unpublish "${career.title}"?`
    )) return;

    try {
        const { error } = await supabaseClient
            .from(CAREERS_TABLE)
            .update({ is_published: newStatus })
            .eq("id", career.id);

        if (error) throw error;

        await loadCareers();

    } catch (error) {
        alert(displayError(error));
    }
}


async function deleteCareer(career) {
    if (!confirm(
        `Delete "${career.title}"? Existing applications will remain in the application table if your foreign key uses ON DELETE SET NULL.`
    )) return;

    try {
        const { error } = await supabaseClient
            .from(CAREERS_TABLE)
            .delete()
            .eq("id", career.id);

        if (error) throw error;

        await loadCareers();
        await loadApplicants();

        alert("Position deleted successfully.");

    } catch (error) {
        alert(displayError(error));
    }
}


/* =========================================
   APPLICANT MANAGEMENT
========================================= */

async function loadApplicants() {
    if (!applicantsTableBody) return;

    applicantsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="table-message">
                Loading applicants...
            </td>
        </tr>
    `;

    try {
        const { data, error } = await supabaseClient
            .from(APPLICATIONS_TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        applicantsCache = data || [];

        renderApplicants();
        updateApplicantStatistics();
        updateDashboardStatistics();
        renderCareers();

    } catch (error) {
        console.error("Applicant loading error:", error);

        applicantsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-message error">
                    ${escapeHTML(displayError(error))}
                </td>
            </tr>
        `;
    }
}


function renderApplicants() {
    if (!applicantsTableBody) return;

    const search = applicantSearch?.value.trim().toLowerCase() || "";
    const statusFilter = applicantStatusFilter?.value || "all";

    const filtered = applicantsCache.filter(applicant => {
        const searchableText = [
            applicant.full_name,
            applicant.contact_no,
            applicant.address,
            applicant.position_title
        ].join(" ").toLowerCase();

        return searchableText.includes(search) &&
            (statusFilter === "all" || applicant.status === statusFilter);
    });

    if (!filtered.length) {
        applicantsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-message">
                    No applications found.
                </td>
            </tr>
        `;
        return;
    }

    applicantsTableBody.innerHTML = filtered.map(applicant => {
        const status = APPLICATION_STATUSES.includes(applicant.status)
            ? applicant.status
            : "Pending";

        return `
            <tr>
                <td>
                    <div class="applicant-name-cell">
                        <strong>${escapeHTML(applicant.full_name)}</strong>
                        <small>${escapeHTML(applicant.address)}</small>
                    </div>
                </td>

                <td>${escapeHTML(applicant.position_title)}</td>

                <td>${escapeHTML(applicant.contact_no)}</td>

                <td>${formatCurrency(applicant.expected_salary)}</td>

                <td>${formatDate(applicant.created_at)}</td>

                <td>
                    <button
                        type="button"
                        class="table-action resume"
                        data-action="view-resume"
                        data-id="${escapeHTML(applicant.id)}"
                    >
                        View Resume
                    </button>
                </td>

                <td>
                    <select
                        class="applicant-status-select status-${status.toLowerCase().replace(/\s+/g, "-")}"
                        data-action="change-status"
                        data-id="${escapeHTML(applicant.id)}"
                    >
                        ${APPLICATION_STATUSES.map(option => `
                            <option
                                value="${escapeHTML(option)}"
                                ${option === status ? "selected" : ""}
                            >
                                ${escapeHTML(option)}
                            </option>
                        `).join("")}
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}


/* =========================================
   VIEW APPLICANTS FOR A POSITION
========================================= */

function showCareerApplicants(career) {
    if (applicantSearch) {
        applicantSearch.value = career.title;
    }

    if (applicantStatusFilter) {
        applicantStatusFilter.value = "all";
    }

    renderApplicants();

    const applicantSection = $("applicantManagement");

    applicantSection?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================
   RESUME VIEWER
========================================= */

if (applicantsTableBody) {
    applicantsTableBody.addEventListener("click", async event => {
        const button = event.target.closest(
            'button[data-action="view-resume"]'
        );

        if (!button) return;

        const applicant = applicantsCache.find(
            item => String(item.id) === String(button.dataset.id)
        );

        if (!applicant?.resume_path) {
            alert("Resume file is not available.");
            return;
        }

        setLoading(button, true, "Opening...");

        try {
            const { data, error } = await supabaseClient
                .storage
                .from(RESUME_BUCKET)
                .createSignedUrl(applicant.resume_path, 300);

            if (error) throw error;

            if (!data?.signedUrl) {
                throw new Error("Could not generate resume link.");
            }

            const newWindow = window.open(
                data.signedUrl,
                "_blank",
                "noopener,noreferrer"
            );

            if (!newWindow) {
                alert("Please allow pop-ups to view the resume.");
            }

        } catch (error) {
            alert(`Resume error: ${displayError(error)}`);

        } finally {
            setLoading(button, false);
        }
    });


    applicantsTableBody.addEventListener("change", async event => {
        const select = event.target.closest(
            'select[data-action="change-status"]'
        );

        if (!select) return;

        const applicant = applicantsCache.find(
            item => String(item.id) === String(select.dataset.id)
        );

        if (!applicant) return;

        await updateApplicantStatus(
            applicant,
            select.value,
            select
        );
    });
}


/* =========================================
   UPDATE APPLICANT STATUS
========================================= */

async function updateApplicantStatus(applicant, newStatus, select) {
    if (!APPLICATION_STATUSES.includes(newStatus)) {
        alert("Invalid application status.");
        renderApplicants();
        return;
    }

    const previousStatus = applicant.status;

    select.disabled = true;

    try {
        const { error } = await supabaseClient
            .from(APPLICATIONS_TABLE)
            .update({ status: newStatus })
            .eq("id", applicant.id);

        if (error) throw error;

        applicant.status = newStatus;

        renderApplicants();
        updateApplicantStatistics();
        updateDashboardStatistics();

    } catch (error) {
        applicant.status = previousStatus;

        alert(displayError(error));
        renderApplicants();

    } finally {
        select.disabled = false;
    }
}


/* =========================================
   APPLICANT SEARCH AND FILTER
========================================= */

if (applicantSearch) {
    applicantSearch.addEventListener("input", renderApplicants);
}


if (applicantStatusFilter) {
    applicantStatusFilter.addEventListener("change", renderApplicants);
}


if (refreshApplicantsButton) {
    refreshApplicantsButton.addEventListener("click", async () => {
        setLoading(refreshApplicantsButton, true, "Refreshing...");

        await loadApplicants();

        setLoading(refreshApplicantsButton, false);
    });
}


/* =========================================
   CAREER SEARCH AND FILTER
========================================= */

if (careerAdminSearch) {
    careerAdminSearch.addEventListener("input", renderCareers);
}


if (careerAdminFilter) {
    careerAdminFilter.addEventListener("change", renderCareers);
}


/* =========================================
   STATISTICS
========================================= */

function updateDashboardStatistics() {
    const values = {
        totalCareers: careersCache.length,

        publishedCareers: careersCache.filter(
            career => career.is_published === true
        ).length,

        totalApplicants: applicantsCache.length,

        pendingApplicants: applicantsCache.filter(
            applicant => applicant.status === "Pending"
        ).length
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    });
}


function updateApplicantStatistics() {
    const counts = {
        applicantTotalCount: applicantsCache.length,

        applicantPendingCount: applicantsCache.filter(
            applicant => applicant.status === "Pending"
        ).length,

        applicantReviewCount: applicantsCache.filter(
            applicant => applicant.status === "Under Review"
        ).length,

        applicantShortlistedCount: applicantsCache.filter(
            applicant => applicant.status === "Shortlisted"
        ).length,

        applicantHiredCount: applicantsCache.filter(
            applicant => applicant.status === "Hired"
        ).length
    };

    Object.entries(counts).forEach(([id, value]) => {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    });
}


/* =========================================
   SIDEBAR
========================================= */

if (toggleAdminSidebar && adminSidebar) {
    toggleAdminSidebar.addEventListener("click", () => {
        adminSidebar.classList.toggle("active");
    });
}


document.querySelectorAll(".sidebar-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".sidebar-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        adminSidebar?.classList.remove("active");
    });
});


/* =========================================
   AUTH STATE CHANGE
   Avoid duplicate login redirects.
========================================= */

supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
        currentAdmin = null;

        if (adminLoginPage) adminLoginPage.hidden = false;
        if (adminDashboard) adminDashboard.hidden = true;
    }
});


/* =========================================
   INITIALIZE
========================================= */

initializeAdmin();
