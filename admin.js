
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    /* =========================================
       SUPABASE CONFIGURATION
    ========================================= */

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";

    const SUPABASE_ANON_KEY =
        "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    const CAREERS_TABLE = "careers";

    /* =========================================
       ELEMENTS
    ========================================= */

    const adminName = document.getElementById("adminName");
    const adminAvatar = document.getElementById("adminAvatar");

    const logoutButton = document.getElementById("logoutButton");
    const footerLogout = document.getElementById("footerLogout");

    const menuToggle = document.getElementById("menuToggle");
    const mainNavigation = document.getElementById("mainNavigation");

    const totalCareers = document.getElementById("totalCareers");
    const publishedCareers = document.getElementById("publishedCareers");
    const draftCareers = document.getElementById("draftCareers");

    const careerTableBody = document.getElementById("careerTableBody");
    const careerMessage = document.getElementById("careerMessage");

    const careerSearch = document.getElementById("careerSearch");
    const careerFilter = document.getElementById("careerFilter");
    const careerResultCount = document.getElementById("careerResultCount");

    const addCareerButton = document.getElementById("addCareerButton");
    const refreshCareersButton = document.getElementById("refreshCareers");

    const careerModal = document.getElementById("careerModal");
    const careerModalTitle = document.getElementById("careerModalTitle");
    const closeCareerModal = document.getElementById("closeCareerModal");
    const cancelCareerButton = document.getElementById("cancelCareerButton");

    const careerForm = document.getElementById("careerForm");
    const careerFormMessage = document.getElementById("careerFormMessage");
    const saveCareerButton = document.getElementById("saveCareerButton");

    const careerId = document.getElementById("careerId");
    const careerTitle = document.getElementById("careerTitle");
    const careerDepartment = document.getElementById("careerDepartment");
    const careerLocation = document.getElementById("careerLocation");
    const careerEmploymentType = document.getElementById("careerEmploymentType");
    const careerDescription = document.getElementById("careerDescription");
    const careerRequirements = document.getElementById("careerRequirements");
    const careerPublished = document.getElementById("careerPublished");

    const deleteModal = document.getElementById("deleteModal");
    const cancelDeleteButton = document.getElementById("cancelDeleteButton");
    const confirmDeleteButton = document.getElementById("confirmDeleteButton");

    const adminCurrentDate = document.getElementById("adminCurrentDate");

    /* =========================================
       STATE
    ========================================= */

    let careers = [];
    let pendingDeleteId = null;
    let isSaving = false;

    /* =========================================
       HELPERS
    ========================================= */

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

    function setButtonLoading(button, loading, originalText) {
        if (!button) return;

        button.disabled = loading;
        button.textContent = loading ? "PLEASE WAIT..." : originalText;
    }

    function openModal(modal) {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeModal(modal) {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

        if (
            !careerModal.classList.contains("active") &&
            !deleteModal.classList.contains("active")
        ) {
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
       AUTHENTICATION AND ADMIN VERIFICATION
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

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", session.user.id)
            .maybeSingle();

        if (profileError || !profile || profile.role !== "admin") {
            await supabase.auth.signOut();
            window.location.replace("index.html");
            return false;
        }

        const displayName =
            profile.full_name ||
            session.user.user_metadata?.full_name ||
            session.user.email ||
            "Administrator";

        adminName.textContent = displayName;
        adminAvatar.textContent = displayName.charAt(0).toUpperCase();

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

    /* =========================================
       NAVIGATION
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

    logoutButton?.addEventListener("click", logout);
    footerLogout?.addEventListener("click", event => {
        event.preventDefault();
        logout();
    });

    /* =========================================
       CAREER STATISTICS
    ========================================= */

    function updateStatistics() {
        const total = careers.length;
        const published = careers.filter(item => item.is_published).length;
        const drafts = total - published;

        totalCareers.textContent = total;
        publishedCareers.textContent = published;
        draftCareers.textContent = drafts;
    }

    /* =========================================
       CAREER TABLE
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

    function renderCareers() {
        const filteredCareers = getFilteredCareers();

        updateStatistics();

        careerResultCount.textContent =
            `${filteredCareers.length} position${filteredCareers.length === 1 ? "" : "s"}`;

        if (filteredCareers.length === 0) {
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
       OPEN ADD CAREER MODAL
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

    /* =========================================
       OPEN EDIT CAREER MODAL
    ========================================= */

    function openEditCareerModal(id) {
        const item = careers.find(career => career.id === id);

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
        const isPublished = careerPublished.checked;

        if (
            !title ||
            !department ||
            !location ||
            !employmentType ||
            !description
        ) {
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
            is_published: isPublished
        };

        isSaving = true;
        setButtonLoading(saveCareerButton, true, "Save Position");

        const existingId = careerId.value;

        let result;

        if (existingId) {
            result = await supabase
                .from(CAREERS_TABLE)
                .update(careerData)
                .eq("id", existingId)
                .select()
                .single();
        } else {
            result = await supabase
                .from(CAREERS_TABLE)
                .insert(careerData)
                .select()
                .single();
        }

        isSaving = false;
        saveCareerButton.disabled = false;
        saveCareerButton.textContent = existingId
            ? "Update Position"
            : "Save Position";

        if (result.error) {
            console.error("Career save error:", result.error);

            showFormMessage(
                result.error.message || "Unable to save this career position."
            );

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
        const item = careers.find(career => career.id === id);

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

            showCareerMessage(
                "Unable to update the publication status.",
                "error"
            );

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

            showCareerMessage(
                "Unable to delete this career position.",
                "error"
            );

            pendingDeleteId = null;
            return;
        }

        pendingDeleteId = null;
        closeModal(deleteModal);

        showCareerMessage(
            "Career position deleted successfully.",
            "success"
        );

        await loadCareers();
    }

    /* =========================================
       EVENT LISTENERS
    ========================================= */

    addCareerButton.addEventListener("click", openAddCareerModal);

    refreshCareersButton.addEventListener("click", loadCareers);

    careerSearch.addEventListener("input", renderCareers);
    careerFilter.addEventListener("change", renderCareers);

    careerForm.addEventListener("submit", saveCareer);

    closeCareerModal.addEventListener("click", () => {
        closeModal(careerModal);
    });

    cancelCareerButton.addEventListener("click", () => {
        closeModal(careerModal);
    });

    cancelDeleteButton.addEventListener("click", () => {
        pendingDeleteId = null;
        closeModal(deleteModal);
    });

    confirmDeleteButton.addEventListener("click", deleteCareer);

    careerModal.addEventListener("click", event => {
        if (event.target === careerModal) {
            closeModal(careerModal);
        }
    });

    deleteModal.addEventListener("click", event => {
        if (event.target === deleteModal) {
            pendingDeleteId = null;
            closeModal(deleteModal);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal(careerModal);
            pendingDeleteId = null;
            closeModal(deleteModal);
        }
    });

    careerTableBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "edit") {
            openEditCareerModal(id);
        }

        if (action === "toggle") {
            toggleCareerStatus(id);
        }

        if (action === "delete") {
            openDeleteModal(id);
        }
    });

    /* =========================================
       INITIALIZE ADMIN PAGE
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
