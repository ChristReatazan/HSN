
"use strict";

/* =========================================
   HSN PHILIPPINES - ADMIN DASHBOARD
   SUPABASE CONNECTION
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
   DOM ELEMENTS
========================================= */

const adminLoginPage = document.getElementById("adminLoginPage");
const adminDashboard = document.getElementById("adminDashboard");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminLoginMessage = document.getElementById("adminLoginMessage");

const adminLogoutButton = document.getElementById("adminLogoutButton");
const adminUserEmail = document.getElementById("adminUserEmail");

const careerAdminTableBody = document.getElementById("careerAdminTableBody");
const careerAdminSearch = document.getElementById("careerAdminSearch");
const careerAdminFilter = document.getElementById("careerAdminFilter");

const careerAdminModal = document.getElementById("careerAdminModal");
const careerAdminForm = document.getElementById("careerAdminForm");
const careerModalTitle = document.getElementById("careerModalTitle");

const addCareerButton = document.getElementById("addCareerButton");
const closeCareerAdminModal = document.getElementById("closeCareerAdminModal");
const cancelCareerForm = document.getElementById("cancelCareerForm");
const saveCareerButton = document.getElementById("saveCareerButton");

const careerRecordId = document.getElementById("careerRecordId");
const careerTitle = document.getElementById("careerTitle");
const careerDepartment = document.getElementById("careerDepartment");
const careerLocation = document.getElementById("careerLocation");
const careerEmploymentType = document.getElementById("careerEmploymentType");
const careerDescription = document.getElementById("careerDescription");
const careerRequirements = document.getElementById("careerRequirements");
const careerIsPublished = document.getElementById("careerIsPublished");
const careerAdminMessage = document.getElementById("careerAdminMessage");

const applicantsTableBody = document.getElementById("applicantsTableBody");
const applicantSearch = document.getElementById("applicantSearch");
const applicantStatusFilter = document.getElementById("applicantStatusFilter");
const refreshApplicantsButton = document.getElementById("refreshApplicants");

const toggleAdminSidebar = document.getElementById("toggleAdminSidebar");
const adminSidebar = document.getElementById("adminSidebar");


/* =========================================
   APPLICATION STATE
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
   GENERAL HELPERS
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
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
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


function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
        delete button.dataset.originalText;
    }
}


function getErrorMessage(error) {
    return error?.message || "Something went wrong. Please try again.";
}


/* =========================================
   AUTHENTICATION
========================================= */

async function checkAdminAccess() {
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

        const user = session.user;

        const { data: profile, error: profileError } = await supabaseClient
            .from(PROFILES_TABLE)
            .select("id, role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!profile || profile.role !== "admin") {
            await supabaseClient.auth.signOut();

            showLoginPage(
                "Access denied. This account does not have administrator permissions."
            );

            return;
        }

        currentAdmin = user;

        showDashboard(user);

    } catch (error) {
        console.error("Admin access verification failed:", error);

        showLoginPage(
            "Unable to verify administrator access. Please try again."
        );
    }
}


function showLoginPage(message = "") {
    if (adminLoginPage) {
        adminLoginPage.hidden = false;
    }

    if (adminDashboard) {
        adminDashboard.hidden = true;
    }

    if (message) {
        showMessage(adminLoginMessage, message);
    }
}


async function showDashboard(user) {
    currentAdmin = user;

    if (adminLoginPage) {
        adminLoginPage.hidden = true;
    }

    if (adminDashboard) {
        adminDashboard.hidden = false;
    }

    if (adminUserEmail) {
        adminUserEmail.textContent = user.email || "Administrator";
    }

    await Promise.all([
        loadCareers(),
        loadApplicants()
    ]);

    updateDashboardStatistics();
}


if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async event => {
        event.preventDefault();

        clearMessage(adminLoginMessage);

        const email = document.getElementById("adminEmail")?.value.trim();
        const password = document.getElementById("adminPassword")?.value;

        if (!email || !password) {
            showMessage(adminLoginMessage, "Please enter your email and password.");
            return;
        }

        setButtonLoading(adminLoginButton, true, "Signing in...");

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (!data.user) {
                throw new Error("Unable to retrieve your account information.");
            }

            const { data: profile, error: profileError } = await supabaseClient
                .from(PROFILES_TABLE)
                .select("id, role")
                .eq("id", data.user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            if (!profile || profile.role !== "admin") {
                await supabaseClient.auth.signOut();

                throw new Error(
                    "Access denied. Your account is not registered as an administrator."
                );
            }

            adminLoginForm.reset();

            await showDashboard(data.user);

        } catch (error) {
            console.error("Login error:", error);
            showMessage(adminLoginMessage, getErrorMessage(error));
        } finally {
            setButtonLoading(adminLoginButton, false);
        }
    });
}


if (adminLogoutButton) {
    adminLogoutButton.addEventListener("click", async () => {
        const confirmed = window.confirm("Are you sure you want to sign out?");

        if (!confirmed) return;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert(getErrorMessage(error));
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
                Loading career listings...
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
                    ${escapeHTML(getErrorMessage(error))}
                </td>
            </tr>
        `;
    }
}


function renderCareers() {
    if (!careerAdminTableBody) return;

    const searchTerm = careerAdminSearch?.value.trim().toLowerCase() || "";
    const selectedFilter = careerAdminFilter?.value || "all";

    const filteredCareers = careersCache.filter(career => {
        const searchableText = [
            career.title,
            career.department,
            career.location,
            career.employment_type
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        const matchesFilter =
            selectedFilter === "all" ||
            (selectedFilter === "published" && career.is_published === true) ||
            (selectedFilter === "unpublished" && career.is_published !== true);

        return matchesSearch && matchesFilter;
    });

    if (!filteredCareers.length) {
        careerAdminTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-message">
                    No career listings found.
                </td>
            </tr>
        `;

        return;
    }

    careerAdminTableBody.innerHTML = filteredCareers.map(career => {
        const published = career.is_published === true;

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(career.title)}</strong>
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


function openCareerModal(career = null) {
    if (!careerAdminModal || !careerAdminForm) return;

    careerAdminForm.reset();
    clearMessage(careerAdminMessage);

    if (career) {
        careerModalTitle.textContent = "Edit Career Position";

        careerRecordId.value = career.id || "";
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
            showMessage(careerAdminMessage, "Please complete all required fields.");
            return;
        }

        setButtonLoading(saveCareerButton, true, "Saving...");

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

            alert(id
                ? "Career position updated successfully."
                : "Career position created successfully."
            );

        } catch (error) {
            console.error("Career save error:", error);

            showMessage(
                careerAdminMessage,
                getErrorMessage(error)
            );

        } finally {
            setButtonLoading(saveCareerButton, false);
        }
    });
}


if (careerAdminTableBody) {
    careerAdminTableBody.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        const career = careersCache.find(item => String(item.id) === String(id));

        if (!career) return;

        if (action === "edit-career") {
            openCareerModal(career);
            return;
        }

        if (action === "toggle-career") {
            await toggleCareerPublication(career);
            return;
        }

        if (action === "delete-career") {
            await deleteCareer(career);
        }
    });
}


async function toggleCareerPublication(career) {
    const newStatus = career.is_published !== true;

    const confirmed = window.confirm(
        newStatus
            ? `Publish "${career.title}"?`
            : `Unpublish "${career.title}"?`
    );

    if (!confirmed) return;

    try {
        const { error } = await supabaseClient
            .from(CAREERS_TABLE)
            .update({ is_published: newStatus })
            .eq("id", career.id);

        if (error) throw error;

        await loadCareers();

    } catch (error) {
        console.error("Career publication error:", error);
        alert(getErrorMessage(error));
    }
}


async function deleteCareer(career) {
    const confirmed = window.confirm(
        `Are you sure you want to delete "${career.title}"?`
    );

    if (!confirmed) return;

    try {
        const { error } = await supabaseClient
            .from(CAREERS_TABLE)
            .delete()
            .eq("id", career.id);

        if (error) throw error;

        await loadCareers();

        alert("Career position deleted successfully.");

    } catch (error) {
        console.error("Career deletion error:", error);
        alert(getErrorMessage(error));
    }
}


if (careerAdminSearch) {
    careerAdminSearch.addEventListener("input", renderCareers);
}


if (careerAdminFilter) {
    careerAdminFilter.addEventListener("change", renderCareers);
}


/* =========================================
   APPLICANT MANAGEMENT
========================================= */

async function loadApplicants() {
    if (!applicantsTableBody) return;

    applicantsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="table-message">
                Loading applicant records...
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

    } catch (error) {
        console.error("Applicant loading error:", error);

        applicantsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-message error">
                    ${escapeHTML(getErrorMessage(error))}
                </td>
            </tr>
        `;
    }
}


function renderApplicants() {
    if (!applicantsTableBody) return;

    const searchTerm = applicantSearch?.value.trim().toLowerCase() || "";
    const selectedStatus = applicantStatusFilter?.value || "all";

    const filteredApplicants = applicantsCache.filter(applicant => {
        const searchableText = [
            applicant.full_name,
            applicant.contact_no,
            applicant.address,
            applicant.position_title
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        const matchesStatus =
            selectedStatus === "all" ||
            applicant.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    if (!filteredApplicants.length) {
        applicantsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-message">
                    No applications found.
                </td>
            </tr>
        `;

        return;
    }

    applicantsTableBody.innerHTML = filteredApplicants.map(applicant => {
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

                <td>
                    ${escapeHTML(applicant.position_title)}
                </td>

                <td>
                    ${escapeHTML(applicant.contact_no)}
                </td>

                <td>
                    ${formatCurrency(applicant.expected_salary)}
                </td>

                <td>
                    ${formatDate(applicant.created_at)}
                </td>

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
                        aria-label="Application status"
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


if (applicantsTableBody) {
    applicantsTableBody.addEventListener("click", async event => {
        const button = event.target.closest('button[data-action="view-resume"]');

        if (!button) return;

        const applicant = applicantsCache.find(
            item => String(item.id) === String(button.dataset.id)
        );

        if (!applicant) return;

        await openApplicantResume(applicant, button);
    });

    applicantsTableBody.addEventListener("change", async event => {
        const select = event.target.closest('select[data-action="change-status"]');

        if (!select) return;

        const applicant = applicantsCache.find(
            item => String(item.id) === String(select.dataset.id)
        );

        if (!applicant) return;

        await updateApplicantStatus(applicant, select.value, select);
    });
}


async function openApplicantResume(applicant, button) {
    if (!applicant.resume_path) {
        alert("No resume file was found for this application.");
        return;
    }

    setButtonLoading(button, true, "Opening...");

    try {
        const { data, error } = await supabaseClient
            .storage
            .from(RESUME_BUCKET)
            .createSignedUrl(applicant.resume_path, 300);

        if (error) throw error;

        if (!data?.signedUrl) {
            throw new Error("Unable to generate a secure resume link.");
        }

        const newWindow = window.open(
            data.signedUrl,
            "_blank",
            "noopener,noreferrer"
        );

        if (!newWindow) {
            alert("Your browser blocked the resume window. Please allow pop-ups and try again.");
        }

    } catch (error) {
        console.error("Resume access error:", error);
        alert(`Unable to open resume: ${getErrorMessage(error)}`);

    } finally {
        setButtonLoading(button, false);
    }
}


async function updateApplicantStatus(applicant, newStatus, selectElement) {
    if (!APPLICATION_STATUSES.includes(newStatus)) {
        alert("Invalid application status.");
        renderApplicants();
        return;
    }

    const previousStatus = applicant.status;

    selectElement.disabled = true;

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
        console.error("Applicant status update error:", error);

        applicant.status = previousStatus;

        alert(`Unable to update application status: ${getErrorMessage(error)}`);

        renderApplicants();

    } finally {
        selectElement.disabled = false;
    }
}


if (applicantSearch) {
    applicantSearch.addEventListener("input", renderApplicants);
}


if (applicantStatusFilter) {
    applicantStatusFilter.addEventListener("change", renderApplicants);
}


if (refreshApplicantsButton) {
    refreshApplicantsButton.addEventListener("click", async () => {
        setButtonLoading(refreshApplicantsButton, true, "Refreshing...");

        await loadApplicants();

        setButtonLoading(refreshApplicantsButton, false);
    });
}


/* =========================================
   DASHBOARD STATISTICS
========================================= */

function updateDashboardStatistics() {
    const totalCareers = careersCache.length;

    const publishedCount = careersCache.filter(
        career => career.is_published === true
    ).length;

    const totalApplications = applicantsCache.length;

    const pendingCount = applicantsCache.filter(
        applicant => applicant.status === "Pending"
    ).length;

    const totalCareersElement = document.getElementById("totalCareers");
    const publishedCareersElement = document.getElementById("publishedCareers");
    const totalApplicantsElement = document.getElementById("totalApplicants");
    const pendingApplicantsElement = document.getElementById("pendingApplicants");

    if (totalCareersElement) {
        totalCareersElement.textContent = totalCareers;
    }

    if (publishedCareersElement) {
        publishedCareersElement.textContent = publishedCount;
    }

    if (totalApplicantsElement) {
        totalApplicantsElement.textContent = totalApplications;
    }

    if (pendingApplicantsElement) {
        pendingApplicantsElement.textContent = pendingCount;
    }
}


function updateApplicantStatistics() {
    const counts = {
        total: applicantsCache.length,
        pending: 0,
        review: 0,
        shortlisted: 0,
        hired: 0
    };

    applicantsCache.forEach(applicant => {
        switch (applicant.status) {
            case "Pending":
                counts.pending++;
                break;

            case "Under Review":
                counts.review++;
                break;

            case "Shortlisted":
                counts.shortlisted++;
                break;

            case "Hired":
                counts.hired++;
                break;
        }
    });

    const elements = {
        applicantTotalCount: counts.total,
        applicantPendingCount: counts.pending,
        applicantReviewCount: counts.review,
        applicantShortlistedCount: counts.shortlisted,
        applicantHiredCount: counts.hired
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    });
}


/* =========================================
   SIDEBAR NAVIGATION
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
   AUTH STATE LISTENER
========================================= */

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
        currentAdmin = null;
        showLoginPage();
    }
});


/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAccess();
});
