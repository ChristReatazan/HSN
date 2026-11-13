
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";
    const CAREERS_TABLE = "careers";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    const $ = id => document.getElementById(id);

    const adminName = $("adminName");
    const adminAvatar = $("adminAvatar");
    const logoutButton = $("logoutButton");
    const footerLogout = $("footerLogout");

    const menuToggle = $("menuToggle");
    const mainNavigation = $("mainNavigation");

    const totalCareers = $("totalCareers");
    const publishedCareers = $("publishedCareers");
    const draftCareers = $("draftCareers");

    const careerTableBody = $("careerTableBody");
    const careerMessage = $("careerMessage");
    const careerSearch = $("careerSearch");
    const careerFilter = $("careerFilter");
    const careerResultCount = $("careerResultCount");

    const addCareerButton = $("addCareerButton");
    const refreshCareersButton = $("refreshCareers");

    const careerModal = $("careerModal");
    const careerModalTitle = $("careerModalTitle");
    const closeCareerModal = $("closeCareerModal");
    const cancelCareerButton = $("cancelCareerButton");
    const careerForm = $("careerForm");
    const careerFormMessage = $("careerFormMessage");
    const saveCareerButton = $("saveCareerButton");

    const careerId = $("careerId");
    const careerTitle = $("careerTitle");
    const careerDepartment = $("careerDepartment");
    const careerLocation = $("careerLocation");
    const careerEmploymentType = $("careerEmploymentType");
    const careerDescription = $("careerDescription");
    const careerRequirements = $("careerRequirements");
    const careerPublished = $("careerPublished");

    const deleteModal = $("deleteModal");
    const cancelDeleteButton = $("cancelDeleteButton");
    const confirmDeleteButton = $("confirmDeleteButton");

    const adminCurrentDate = $("adminCurrentDate");

    let careers = [];
    let pendingDeleteId = null;
    let isSaving = false;
    let currentAdmin = null;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function showCareerMessage(message, type = "info") {
        if (!careerMessage) return;

        careerMessage.textContent = message;
        careerMessage.className = `career-message ${type}`;

        if (type !== "error") {
            window.setTimeout(() => {
                careerMessage.className = "career-message";
                careerMessage.textContent = "";
            }, 5000);
        }
    }

    function showFormMessage(message, type = "error") {
        careerFormMessage.textContent = message;
        careerFormMessage.className = `career-form-message ${type}`;
    }

    function clearFormMessage() {
        careerFormMessage.textContent = "";
        careerFormMessage.className = "career-form-message";
    }

    function openModal(modal) {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeModal(modal) {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

        const anotherOpen = [
            careerModal,
            deleteModal,
            $("adminActionModal")
        ].some(item => item?.classList.contains("active"));

        if (!anotherOpen) {
            document.body.style.overflow = "";
        }
    }

    function updateCurrentDate() {
        if (!adminCurrentDate) return;

        adminCurrentDate.textContent =
            new Intl.DateTimeFormat("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric"
            }).format(new Date()).toUpperCase();
    }

    /* =========================================
       AUTHENTICATION
    ========================================= */

    async function verifyAdmin() {
        const {
            data: { session },
            error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            window.location.replace("index.html");
            return false;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", session.user.id)
            .maybeSingle();

        if (profileError || !profile || profile.role !== "admin") {
            await supabase.auth.signOut();
            window.location.replace("index.html");
            return false;
        }

        currentAdmin = session.user;

        const displayName =
            profile.full_name ||
            session.user.user_metadata?.full_name ||
            session.user.email ||
            "Administrator";

        adminName.textContent = displayName;

        const initial = $("adminAvatarInitial");
        if (initial) {
            initial.textContent = displayName.charAt(0).toUpperCase();
        } else {
            const badge = $("applicantNotificationBadge");
            adminAvatar.textContent = displayName.charAt(0).toUpperCase();

            if (badge) adminAvatar.appendChild(badge);
        }

        return true;
    }

    async function logout() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Unable to sign out. Please try again.");
            return;
        }

        window.location.replace("index.html");
    }

    logoutButton?.addEventListener("click", logout);

    footerLogout?.addEventListener("click", event => {
        event.preventDefault();
        logout();
    });

    /* =========================================
       MOBILE NAVIGATION
    ========================================= */

    if (menuToggle && mainNavigation) {
        menuToggle.addEventListener("click", () => {
            const isOpen = mainNavigation.classList.toggle("open");
            menuToggle.setAttribute("aria-expanded", String(isOpen));
        });

        mainNavigation.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mainNavigation.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    /* =========================================
       ADMIN PROFILE MENU
       Adds controls to the existing application.js dropdown.
    ========================================= */

    const adminMenuStyles = document.createElement("style");

    adminMenuStyles.textContent = `
        .admin-avatar {
            cursor: pointer;
        }

        .admin-action-menu {
            padding: 10px 16px;
            border-top: 1px solid #edf1f4;
            display: grid;
            gap: 5px;
        }

        .admin-action-menu button,
        .admin-action-menu a {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 11px 12px;
            border: 0;
            border-radius: 8px;
            background: transparent;
            color: #20384a;
            font-size: 12px;
            font-weight: 700;
            text-align: left;
            text-decoration: none;
            cursor: pointer;
            transition: .2s ease;
        }

        .admin-action-menu button:hover,
        .admin-action-menu a:hover {
            background: #f0f7fc;
            color: #087dc1;
        }

        .admin-action-menu .admin-menu-icon {
            width: 22px;
            text-align: center;
            font-size: 15px;
        }

        .admin-action-overlay {
            position: fixed;
            inset: 0;
            z-index: 100001;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(5, 20, 32, .62);
        }

        .admin-action-overlay.active {
            display: flex;
        }

        .admin-action-modal {
            width: 100%;
            max-width: 440px;
            padding: 28px;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 25px 70px rgba(0,0,0,.2);
        }

        .admin-action-modal h2 {
            margin: 0 0 7px;
            color: #071b2b;
            font-size: 22px;
        }

        .admin-action-modal > p {
            margin: 0 0 23px;
            color: #7b8994;
            font-size: 12px;
            line-height: 1.6;
        }

        .admin-action-field {
            margin-bottom: 16px;
        }

        .admin-action-field label {
            display: block;
            margin-bottom: 7px;
            color: #344b5d;
            font-size: 11px;
            font-weight: 750;
        }

        .admin-action-field input {
            width: 100%;
            min-height: 44px;
            padding: 10px 12px;
            border: 1px solid #dce4ea;
            border-radius: 8px;
            outline: none;
            color: #183246;
            font: inherit;
            font-size: 13px;
        }

        .admin-action-field input:focus {
            border-color: #087dc1;
            box-shadow: 0 0 0 3px rgba(8,125,193,.1);
        }

        .admin-action-message {
            min-height: 18px;
            margin: 5px 0 12px;
            font-size: 12px;
            line-height: 1.5;
        }

        .admin-action-message.error {
            color: #c62828;
        }

        .admin-action-message.success {
            color: #18834a;
        }

        .admin-action-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 22px;
        }

        .admin-action-buttons button {
            min-height: 40px;
            padding: 0 16px;
            border: 0;
            border-radius: 7px;
            font-size: 11px;
            font-weight: 750;
            cursor: pointer;
        }

        .admin-action-cancel {
            background: #edf1f4;
            color: #52616d;
        }

        .admin-action-submit {
            background: #087dc1;
            color: #fff;
        }

        .admin-action-submit:hover {
            background: #06669f;
        }

        .admin-action-submit:disabled {
            opacity: .6;
            cursor: not-allowed;
        }
    `;

    document.head.appendChild(adminMenuStyles);

    function addAdminMenu(dropdown) {
        if (!dropdown || dropdown.querySelector(".admin-action-menu")) return;

        const footer = dropdown.querySelector(".applicant-dropdown-footer");

        const menu = document.createElement("div");
        menu.className = "admin-action-menu";

        menu.innerHTML = `
            <a href="applicant.html">
                <span class="admin-menu-icon">▤</span>
                Applicant Management
            </a>

            <button type="button" data-admin-action="add">
                <span class="admin-menu-icon">＋</span>
                Add Admin
            </button>

            <button type="button" data-admin-action="password">
                <span class="admin-menu-icon">⌑</span>
                Change Password
            </button>
        `;

        if (footer) {
            footer.before(menu);
        } else {
            dropdown.appendChild(menu);
        }
    }

    const dropdownObserver = new MutationObserver(() => {
        const dropdown = document.querySelector(".applicant-dropdown");

        if (dropdown) {
            addAdminMenu(dropdown);
        }
    });

    dropdownObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    /* =========================================
       ADMIN ACTION MODALS
    ========================================= */

    const actionOverlay = document.createElement("div");
    actionOverlay.className = "admin-action-overlay";
    actionOverlay.id = "adminActionModal";

    actionOverlay.innerHTML = `
        <div class="admin-action-modal" role="dialog" aria-modal="true">
            <h2 id="adminActionTitle">Admin Action</h2>
            <p id="adminActionDescription"></p>

            <form id="adminActionForm">
                <div id="adminActionFields"></div>

                <div
                    class="admin-action-message"
                    id="adminActionMessage"
                    role="alert"
                ></div>

                <div class="admin-action-buttons">
                    <button
                        type="button"
                        class="admin-action-cancel"
                        id="adminActionCancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="admin-action-submit"
                        id="adminActionSubmit"
                    >
                        Continue
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(actionOverlay);

    const actionForm = $("adminActionForm");
    const actionFields = $("adminActionFields");
    const actionMessage = $("adminActionMessage");
    const actionSubmit = $("adminActionSubmit");

    let activeAdminAction = "";

    function openAdminAction(type) {
        activeAdminAction = type;
        actionMessage.textContent = "";
        actionMessage.className = "admin-action-message";

        if (type === "add") {
            $("adminActionTitle").textContent = "Add New Admin";
            $("adminActionDescription").textContent =
                "Create a new administrator account for HSN Philippines.";

            actionFields.innerHTML = `
                <div class="admin-action-field">
                    <label for="newAdminName">Full Name</label>
                    <input
                        id="newAdminName"
                        type="text"
                        maxlength="120"
                        autocomplete="name"
                        required
                    >
                </div>

                <div class="admin-action-field">
                    <label for="newAdminEmail">Email Address</label>
                    <input
                        id="newAdminEmail"
                        type="email"
                        maxlength="254"
                        autocomplete="email"
                        required
                    >
                </div>

                <div class="admin-action-field">
                    <label for="newAdminPassword">Temporary Password</label>
                    <input
                        id="newAdminPassword"
                        type="password"
                        minlength="8"
                        autocomplete="new-password"
                        required
                    >
                </div>
            `;

            actionSubmit.textContent = "Create Admin";
        }

        if (type === "password") {
            $("adminActionTitle").textContent = "Change Password";
            $("adminActionDescription").textContent =
                "Update the password of your currently signed-in administrator account.";

            actionFields.innerHTML = `
                <div class="admin-action-field">
                    <label for="newPassword">New Password</label>
                    <input
                        id="newPassword"
                        type="password"
                        minlength="8"
                        autocomplete="new-password"
                        required
                    >
                </div>

                <div class="admin-action-field">
                    <label for="confirmNewPassword">Confirm New Password</label>
                    <input
                        id="confirmNewPassword"
                        type="password"
                        minlength="8"
                        autocomplete="new-password"
                        required
                    >
                </div>
            `;

            actionSubmit.textContent = "Update Password";
        }

        openModal(actionOverlay);
    }

    function showAdminActionMessage(message, type = "error") {
        actionMessage.textContent = message;
        actionMessage.className = `admin-action-message ${type}`;
    }

    function setAdminActionLoading(loading) {
        actionSubmit.disabled = loading;

        if (loading) {
            actionSubmit.textContent = "PLEASE WAIT...";
        } else {
            actionSubmit.textContent =
                activeAdminAction === "add"
                    ? "Create Admin"
                    : "Update Password";
        }
    }

    document.addEventListener("click", event => {
        const button = event.target.closest("[data-admin-action]");

        if (!button) return;

        event.preventDefault();

        const type = button.dataset.adminAction;

        if (type === "add" || type === "password") {
            openAdminAction(type);
        }
    });

    $("adminActionCancel").addEventListener("click", () => {
        closeModal(actionOverlay);
        actionForm.reset();
    });

    actionOverlay.addEventListener("click", event => {
        if (event.target === actionOverlay) {
            closeModal(actionOverlay);
            actionForm.reset();
        }
    });

    actionForm.addEventListener("submit", async event => {
        event.preventDefault();

        setAdminActionLoading(true);
        actionMessage.textContent = "";

        try {
            if (activeAdminAction === "add") {
                const fullName = $("newAdminName").value.trim();
                const email = $("newAdminEmail").value.trim();
                const password = $("newAdminPassword").value;

                if (!fullName || !email || password.length < 8) {
                    showAdminActionMessage(
                        "Please provide a name, valid email, and password with at least 8 characters."
                    );
                    return;
                }

                const { data, error } = await supabase.functions.invoke(
                    "create-admin",
                    {
                        body: {
                            full_name: fullName,
                            email,
                            password
                        }
                    }
                );

                if (error) {
                    let message = error.message || "Unable to create admin.";

                    try {
                        const response = await error.context?.json();
                        if (response?.error) message = response.error;
                    } catch (_) {}

                    throw new Error(message);
                }

                if (data?.error) {
                    throw new Error(data.error);
                }

                showAdminActionMessage(
                    "Administrator account created successfully.",
                    "success"
                );

                actionForm.reset();

                window.setTimeout(() => {
                    closeModal(actionOverlay);
                }, 1400);
            }

            if (activeAdminAction === "password") {
                const password = $("newPassword").value;
                const confirmPassword = $("confirmNewPassword").value;

                if (password.length < 8) {
                    showAdminActionMessage(
                        "Your new password must contain at least 8 characters."
                    );
                    return;
                }

                if (password !== confirmPassword) {
                    showAdminActionMessage(
                        "The passwords do not match."
                    );
                    return;
                }

                const { error } = await supabase.auth.updateUser({
                    password
                });

                if (error) throw error;

                showAdminActionMessage(
                    "Your password has been updated successfully.",
                    "success"
                );

                actionForm.reset();

                window.setTimeout(() => {
                    closeModal(actionOverlay);
                }, 1400);
            }
        } catch (error) {
            console.error("Admin action error:", error);

            showAdminActionMessage(
                error.message || "Something went wrong. Please try again."
            );
        } finally {
            setAdminActionLoading(false);
        }
    });

    /* =========================================
       CAREER STATISTICS
    ========================================= */

    function updateStatistics() {
        const total = careers.length;
        const published = careers.filter(item => item.is_published).length;

        totalCareers.textContent = total;
        publishedCareers.textContent = published;
        draftCareers.textContent = total - published;
    }

    /* =========================================
       CAREER FILTERING
    ========================================= */

    function getFilteredCareers() {
        const searchTerm = careerSearch.value.trim().toLowerCase();
        const filter = careerFilter.value;

        return careers.filter(item => {
            const matchesSearch = [
                item.title,
                item.department,
                item.location,
                item.employment_type
            ].some(value =>
                String(value || "").toLowerCase().includes(searchTerm)
            );

            const matchesFilter =
                filter === "all" ||
                (filter === "published" && item.is_published) ||
                (filter === "draft" && !item.is_published);

            return matchesSearch && matchesFilter;
        });
    }

    /* =========================================
       RENDER CAREERS
    ========================================= */

    function renderCareers() {
        const filteredCareers = getFilteredCareers();

        updateStatistics();

        careerResultCount.textContent =
            `${filteredCareers.length} position${filteredCareers.length === 1 ? "" : "s"}`;

        if (!filteredCareers.length) {
            careerTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="career-empty">
                        No career positions found.
                    </td>
                </tr>
            `;
            return;
        }

        careerTableBody.innerHTML = filteredCareers.map(item => {
            const status = item.is_published ? "published" : "draft";
            const statusLabel = item.is_published ? "Published" : "Draft";

            return `
                <tr>
                    <td>
                        <span class="career-position-title">
                            ${escapeHTML(item.title)}
                        </span>
                        <span class="career-position-subtitle">
                            ${escapeHTML(item.id)}
                        </span>
                    </td>

                    <td>${escapeHTML(item.department)}</td>
                    <td>${escapeHTML(item.location)}</td>
                    <td>${escapeHTML(item.employment_type)}</td>

                    <td>
                        <span class="career-status ${status}">
                            ${statusLabel}
                        </span>
                    </td>

                    <td>
                        <div class="career-row-actions">
                            <button
                                type="button"
                                data-action="edit"
                                data-id="${escapeHTML(item.id)}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                data-action="toggle"
                                data-id="${escapeHTML(item.id)}"
                            >
                                ${item.is_published ? "Unpublish" : "Publish"}
                            </button>

                            <button
                                type="button"
                                class="delete-career-button"
                                data-action="delete"
                                data-id="${escapeHTML(item.id)}"
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
       LOAD CAREERS
    ========================================= */

    async function loadCareers() {
        careerTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="career-empty">
                    Loading career positions...
                </td>
            </tr>
        `;

        const { data, error } = await supabase
            .from(CAREERS_TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Career loading error:", error);

            careerTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="career-empty">
                        Unable to load careers. Check your Supabase table
                        and Row Level Security policies.
                    </td>
                </tr>
            `;

            showCareerMessage(
                "Unable to load career records. Please check your database configuration.",
                "error"
            );

            return;
        }

        careers = data || [];
        renderCareers();
    }

    /* =========================================
       CAREER MODAL
    ========================================= */

    function resetCareerForm() {
        careerForm.reset();
        careerId.value = "";
        careerPublished.checked = false;
        clearFormMessage();
    }

    function openAddCareerModal() {
        resetCareerForm();

        careerModalTitle.textContent = "Add New Position";
        saveCareerButton.textContent = "Save Position";

        openModal(careerModal);
        careerTitle.focus();
    }

    function openEditCareerModal(id) {
        const item = careers.find(career => String(career.id) === String(id));
        if (!item) return;

        resetCareerForm();

        careerId.value = item.id;
        careerTitle.value = item.title || "";
        careerDepartment.value = item.department || "";
        careerLocation.value = item.location || "";
        careerEmploymentType.value = item.employment_type || "";
        careerDescription.value = item.description || "";
        careerRequirements.value = item.requirements || "";
        careerPublished.checked = Boolean(item.is_published);

        careerModalTitle.textContent = "Edit Position";
        saveCareerButton.textContent = "Update Position";

        openModal(careerModal);
    }

    /* =========================================
       SAVE CAREER
    ========================================= */

    async function saveCareer(event) {
        event.preventDefault();

        if (isSaving) return;

        const title = careerTitle.value.trim();
        const department = careerDepartment.value.trim();
        const location = careerLocation.value.trim();
        const employmentType = careerEmploymentType.value;
        const description = careerDescription.value.trim();
        const requirements = careerRequirements.value.trim();

        if (!title || !department || !location || !employmentType || !description) {
            showFormMessage("Please complete all required fields.");
            return;
        }

        const careerData = {
            title,
            department,
            location,
            employment_type: employmentType,
            description,
            requirements,
            is_published: careerPublished.checked
        };

        isSaving = true;
        saveCareerButton.disabled = true;
        saveCareerButton.textContent = "PLEASE WAIT...";

        const existingId = careerId.value;

        const result = existingId
            ? await supabase
                .from(CAREERS_TABLE)
                .update(careerData)
                .eq("id", existingId)
                .select()
                .single()
            : await supabase
                .from(CAREERS_TABLE)
                .insert(careerData)
                .select()
                .single();

        isSaving = false;
        saveCareerButton.disabled = false;
        saveCareerButton.textContent = existingId
            ? "Update Position"
            : "Save Position";

        if (result.error) {
            console.error("Career save error:", result.error);
            showFormMessage(result.error.message || "Unable to save this career position.");
            return;
        }

        closeModal(careerModal);
        resetCareerForm();

        showCareerMessage(
            existingId
                ? "Career position successfully updated."
                : "New career position successfully created.",
            "success"
        );

        await loadCareers();
    }

    /* =========================================
       PUBLISH / UNPUBLISH
    ========================================= */

    async function toggleCareerStatus(id) {
        const item = careers.find(career => String(career.id) === String(id));
        if (!item) return;

        const nextStatus = !item.is_published;

        const confirmed = window.confirm(
            nextStatus
                ? `Publish "${item.title}"? It will become available for public viewing.`
                : `Unpublish "${item.title}"? It will no longer be available publicly.`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from(CAREERS_TABLE)
            .update({ is_published: nextStatus })
            .eq("id", id);

        if (error) {
            console.error("Career status update error:", error);
            showCareerMessage("Unable to update the publication status.", "error");
            return;
        }

        showCareerMessage(
            nextStatus
                ? "Career position published successfully."
                : "Career position unpublished successfully.",
            "success"
        );

        await loadCareers();
    }

    /* =========================================
       DELETE CAREER
    ========================================= */

    function openDeleteModal(id) {
        pendingDeleteId = id;
        openModal(deleteModal);
    }

    async function deleteCareer() {
        if (!pendingDeleteId) return;

        confirmDeleteButton.disabled = true;
        confirmDeleteButton.textContent = "DELETING...";

        const { error } = await supabase
            .from(CAREERS_TABLE)
            .delete()
            .eq("id", pendingDeleteId);

        confirmDeleteButton.disabled = false;
        confirmDeleteButton.textContent = "Delete Position";

        if (error) {
            console.error("Career deletion error:", error);

            closeModal(deleteModal);
            showCareerMessage("Unable to delete this career position.", "error");
            pendingDeleteId = null;
            return;
        }

        pendingDeleteId = null;
        closeModal(deleteModal);

        showCareerMessage("Career position deleted successfully.", "success");
        await loadCareers();
    }

    /* =========================================
       CAREER EVENT LISTENERS
    ========================================= */

    addCareerButton.addEventListener("click", openAddCareerModal);
    refreshCareersButton.addEventListener("click", loadCareers);

    careerSearch.addEventListener("input", renderCareers);
    careerFilter.addEventListener("change", renderCareers);
    careerForm.addEventListener("submit", saveCareer);

    closeCareerModal.addEventListener("click", () => closeModal(careerModal));
    cancelCareerButton.addEventListener("click", () => closeModal(careerModal));

    cancelDeleteButton.addEventListener("click", () => {
        pendingDeleteId = null;
        closeModal(deleteModal);
    });

    confirmDeleteButton.addEventListener("click", deleteCareer);

    careerModal.addEventListener("click", event => {
        if (event.target === careerModal) closeModal(careerModal);
    });

    deleteModal.addEventListener("click", event => {
        if (event.target === deleteModal) {
            pendingDeleteId = null;
            closeModal(deleteModal);
        }
    });

    careerTableBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const { action, id } = button.dataset;

        if (action === "edit") openEditCareerModal(id);
        if (action === "toggle") toggleCareerStatus(id);
        if (action === "delete") openDeleteModal(id);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal(careerModal);
            closeModal(deleteModal);
            closeModal(actionOverlay);
            pendingDeleteId = null;
        }
    });

    /* =========================================
       INITIALIZE
    ========================================= */

    updateCurrentDate();

    const authorized = await verifyAdmin();
    if (!authorized) return;

    await loadCareers();

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
            window.location.replace("index.html");
        }
    });
});
