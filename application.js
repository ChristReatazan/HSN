
/* =========================================
   HSN PHILIPPINES
   ADMIN PROFILE & APPLICANT NOTIFICATIONS
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_KEY = "sb_publishable_oiJNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    const avatar = document.getElementById("adminAvatar");
    const profile = document.querySelector(".admin-profile");

    if (!avatar || !profile) return;

    /* =========================================
       STYLES
    ========================================= */

    const styles = document.createElement("style");

    styles.textContent = `
        .admin-profile {
            position: relative;
        }

        .admin-avatar {
            position: relative;
            cursor: pointer;
        }

        .applicant-notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 19px;
            height: 19px;
            padding: 0 5px;
            display: none;
            align-items: center;
            justify-content: center;
            border-radius: 50px;
            background: #dc3545;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            border: 2px solid #fff;
            z-index: 5;
        }

        .admin-profile-dropdown {
            position: absolute;
            top: calc(100% + 15px);
            right: 0;
            width: 280px;
            background: #fff;
            border: 1px solid #e8e8e8;
            border-radius: 12px;
            box-shadow: 0 12px 35px rgba(0,0,0,.12);
            padding: 8px;
            z-index: 9999;
            display: none;
        }

        .admin-profile-dropdown.show {
            display: block;
            animation: profileDropdown .18s ease;
        }

        @keyframes profileDropdown {
            from {
                opacity: 0;
                transform: translateY(-6px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .profile-dropdown-header {
            padding: 12px 12px 14px;
            border-bottom: 1px solid #eee;
            margin-bottom: 6px;
        }

        .profile-dropdown-header strong {
            display: block;
            color: #202020;
            font-size: 14px;
        }

        .profile-dropdown-header span {
            display: block;
            color: #888;
            font-size: 11px;
            margin-top: 4px;
        }

        .profile-dropdown-item {
            width: 100%;
            min-height: 42px;
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 10px 12px;
            border: none;
            border-radius: 7px;
            background: transparent;
            color: #333;
            text-decoration: none;
            text-align: left;
            font-family: inherit;
            font-size: 13px;
            cursor: pointer;
            transition: background .2s, color .2s;
        }

        .profile-dropdown-item:hover {
            background: #f4f6f8;
            color: #111;
        }

        .profile-dropdown-icon {
            width: 20px;
            text-align: center;
            font-size: 16px;
        }

        .notification-item {
            justify-content: space-between;
        }

        .notification-item-left {
            display: flex;
            align-items: center;
            gap: 11px;
        }

        .notification-count {
            min-width: 21px;
            height: 21px;
            padding: 0 6px;
            display: none;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            background: #dc3545;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
        }

        .profile-dropdown-divider {
            height: 1px;
            background: #eee;
            margin: 6px 4px;
        }

        .profile-dropdown-footer {
            padding: 10px 12px 7px;
            color: #999;
            font-size: 10px;
            text-align: center;
        }

        .profile-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.48);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 10000;
        }

        .profile-modal-overlay.show {
            display: flex;
        }

        .profile-modal {
            width: 100%;
            max-width: 430px;
            background: #fff;
            border-radius: 14px;
            padding: 28px;
            box-shadow: 0 20px 60px rgba(0,0,0,.2);
        }

        .profile-modal h2 {
            margin: 0 0 7px;
            color: #202020;
            font-size: 21px;
        }

        .profile-modal-description {
            margin: 0 0 22px;
            color: #777;
            font-size: 13px;
            line-height: 1.6;
        }

        .profile-form-group {
            margin-bottom: 15px;
        }

        .profile-form-group label {
            display: block;
            margin-bottom: 7px;
            color: #333;
            font-size: 12px;
            font-weight: 600;
        }

        .profile-form-group input {
            width: 100%;
            height: 43px;
            padding: 0 12px;
            border: 1px solid #ddd;
            border-radius: 7px;
            outline: none;
            font-family: inherit;
            font-size: 13px;
            box-sizing: border-box;
        }

        .profile-form-group input:focus {
            border-color: #222;
        }

        .profile-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            margin-top: 23px;
        }

        .profile-modal-button {
            min-height: 40px;
            padding: 0 17px;
            border: 1px solid #ddd;
            border-radius: 7px;
            background: #fff;
            color: #333;
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }

        .profile-modal-button.primary {
            background: #171717;
            border-color: #171717;
            color: #fff;
        }

        .profile-modal-button:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .profile-form-message {
            display: none;
            margin-top: 12px;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.5;
        }

        .profile-form-message.error {
            display: block;
            background: #fff0f0;
            color: #bd2525;
        }

        .profile-form-message.success {
            display: block;
            background: #edf9f0;
            color: #24733a;
        }
    `;

    document.head.appendChild(styles);

    /* =========================================
       PROFILE DROPDOWN
    ========================================= */

    const existingDropdown = document.getElementById(
        "adminProfileDropdown"
    );

    existingDropdown?.remove();

    const dropdown = document.createElement("div");

    dropdown.className = "admin-profile-dropdown";
    dropdown.id = "adminProfileDropdown";

    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <strong>Administrator Menu</strong>
            <span>Manage your admin account</span>
        </div>

        <button type="button" class="profile-dropdown-item" id="openAddAdmin">
            <span class="profile-dropdown-icon">＋</span>
            Add Admin
        </button>

        <button type="button" class="profile-dropdown-item" id="openChangePassword">
            <span class="profile-dropdown-icon">⌑</span>
            Change Password
        </button>

        <div class="profile-dropdown-divider"></div>

        <a href="applicant-management.html"
           class="profile-dropdown-item notification-item"
           id="applicantNotificationLink">

            <span class="notification-item-left">
                <span class="profile-dropdown-icon">✉</span>
                Applicant Management
            </span>

            <span class="notification-count" id="applicantNotificationCount">0</span>
        </a>

        <div class="profile-dropdown-footer">
            HSN Philippines Admin Portal
        </div>
    `;

    profile.appendChild(dropdown);

    /* =========================================
       AVATAR NOTIFICATION BADGE
    ========================================= */

    let badge = document.getElementById(
        "applicantNotificationBadge"
    );

    if (!badge) {
        badge = document.createElement("span");
        badge.id = "applicantNotificationBadge";
        badge.className = "applicant-notification-badge";
        avatar.appendChild(badge);
    }

    /* =========================================
       MODALS
    ========================================= */

    function createModal(
        id,
        title,
        description,
        fields,
        submitText
    ) {
        document.getElementById(id)?.remove();

        const overlay = document.createElement("div");

        overlay.className = "profile-modal-overlay";
        overlay.id = id;

        overlay.innerHTML = `
            <div class="profile-modal">
                <h2>${title}</h2>
                <p class="profile-modal-description">${description}</p>

                <form class="profile-modal-form">
                    ${fields}

                    <div class="profile-form-message"></div>

                    <div class="profile-modal-actions">
                        <button type="button"
                                class="profile-modal-button cancel-modal">
                            Cancel
                        </button>

                        <button type="submit"
                                class="profile-modal-button primary">
                            ${submitText}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeModal(overlay);
            }
        });

        overlay.querySelector(".cancel-modal").addEventListener(
            "click",
            () => closeModal(overlay)
        );

        return overlay;
    }

    const addAdminModal = createModal(
        "addAdminModal",
        "Add Administrator",
        "Create a new administrator account for HSN Philippines.",
        `
            <div class="profile-form-group">
                <label for="newAdminName">Full Name</label>
                <input type="text" id="newAdminName" required>
            </div>

            <div class="profile-form-group">
                <label for="newAdminEmail">Email Address</label>
                <input type="email" id="newAdminEmail" required>
            </div>

            <div class="profile-form-group">
                <label for="newAdminPassword">Temporary Password</label>
                <input type="password" id="newAdminPassword"
                       minlength="8" required>
            </div>
        `,
        "Create Admin"
    );

    const passwordModal = createModal(
        "changePasswordModal",
        "Change Password",
        "Enter your new administrator account password.",
        `
            <div class="profile-form-group">
                <label for="newPassword">New Password</label>
                <input type="password" id="newPassword"
                       minlength="8" required>
            </div>

            <div class="profile-form-group">
                <label for="confirmNewPassword">Confirm New Password</label>
                <input type="password" id="confirmNewPassword"
                       minlength="8" required>
            </div>
        `,
        "Update Password"
    );

    function closeModal(modal) {
        modal.classList.remove("show");

        modal.querySelector("form").reset();

        const message = modal.querySelector(
            ".profile-form-message"
        );

        message.className = "profile-form-message";
        message.textContent = "";
    }

    function showMessage(modal, message, type) {
        const element = modal.querySelector(
            ".profile-form-message"
        );

        element.textContent = message;
        element.className = `profile-form-message ${type}`;
    }

    function setLoading(form, loading, text) {
        const button = form.querySelector(
            'button[type="submit"]'
        );

        button.disabled = loading;
        button.textContent = loading ? "Please wait..." : text;
    }

    /* =========================================
       DROPDOWN EVENTS
    ========================================= */

    function closeDropdown() {
        dropdown.classList.remove("show");
        avatar.setAttribute("aria-expanded", "false");
    }

    avatar.setAttribute("role", "button");
    avatar.setAttribute("tabindex", "0");
    avatar.setAttribute("aria-haspopup", "true");
    avatar.setAttribute("aria-expanded", "false");

    avatar.addEventListener("click", event => {
        event.stopPropagation();

        const isOpen = dropdown.classList.toggle("show");

        avatar.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    avatar.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            avatar.click();
        }
    });

    dropdown.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", event => {
        if (!profile.contains(event.target)) {
            closeDropdown();
        }
    });

    document.getElementById("openAddAdmin").addEventListener(
        "click",
        () => {
            closeDropdown();
            addAdminModal.classList.add("show");
        }
    );

    document.getElementById("openChangePassword").addEventListener(
        "click",
        () => {
            closeDropdown();
            passwordModal.classList.add("show");
        }
    );

    /* =========================================
       ADD ADMIN
    ========================================= */

    addAdminModal.querySelector("form").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const form = event.currentTarget;

            const fullName = document.getElementById(
                "newAdminName"
            ).value.trim();

            const email = document.getElementById(
                "newAdminEmail"
            ).value.trim();

            const password = document.getElementById(
                "newAdminPassword"
            ).value;

            if (!fullName || !email || password.length < 8) {
                showMessage(
                    addAdminModal,
                    "Please complete all fields. Password must be at least 8 characters.",
                    "error"
                );

                return;
            }

            setLoading(form, true, "Create Admin");

            try {
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

                if (error) throw error;

                if (data?.error) {
                    throw new Error(data.error);
                }

                showMessage(
                    addAdminModal,
                    "Administrator account created successfully.",
                    "success"
                );

                form.reset();

            } catch (error) {
                console.error("Add admin error:", error);

                showMessage(
                    addAdminModal,
                    error.message || "Unable to create administrator account.",
                    "error"
                );

            } finally {
                setLoading(form, false, "Create Admin");
            }
        }
    );

    /* =========================================
       CHANGE PASSWORD
    ========================================= */

    passwordModal.querySelector("form").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const form = event.currentTarget;

            const password = document.getElementById(
                "newPassword"
            ).value;

            const confirmPassword = document.getElementById(
                "confirmNewPassword"
            ).value;

            if (password.length < 8) {
                showMessage(
                    passwordModal,
                    "Password must contain at least 8 characters.",
                    "error"
                );

                return;
            }

            if (password !== confirmPassword) {
                showMessage(
                    passwordModal,
                    "Passwords do not match.",
                    "error"
                );

                return;
            }

            setLoading(form, true, "Update Password");

            try {
                const { error } = await supabase.auth.updateUser({
                    password
                });

                if (error) throw error;

                showMessage(
                    passwordModal,
                    "Your password has been updated successfully.",
                    "success"
                );

                form.reset();

            } catch (error) {
                console.error("Password update error:", error);

                showMessage(
                    passwordModal,
                    error.message || "Unable to update password.",
                    "error"
                );

            } finally {
                setLoading(form, false, "Update Password");
            }
        }
    );

    /* =========================================
       APPLICANT NOTIFICATION COUNT
    ========================================= */

    async function loadApplicantNotificationCount() {
        const { count, error } = await supabase
            .from("career_applications")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq("is_read", false);

        if (error) {
            console.error(
                "Applicant notification error:",
                error.message
            );

            return;
        }

        const total = count || 0;

        const countElement = document.getElementById(
            "applicantNotificationCount"
        );

        if (total > 0) {
            const displayCount = total > 99 ? "99+" : total;

            badge.textContent = displayCount;
            badge.style.display = "flex";

            countElement.textContent = displayCount;
            countElement.style.display = "flex";

        } else {
            badge.style.display = "none";
            countElement.style.display = "none";
        }
    }

    /* =========================================
       REALTIME APPLICANT UPDATES
    ========================================= */

    const applicantChannel = supabase
        .channel("admin-applicant-notifications")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "career_applications"
            },
            () => {
                loadApplicantNotificationCount();
            }
        )
        .subscribe();

    /* =========================================
       INITIALIZE NOTIFICATIONS
       No admin authentication or redirects here.
    ========================================= */

    loadApplicantNotificationCount();

    window.addEventListener(
        "focus",
        loadApplicantNotificationCount
    );

});
