
document.addEventListener("DOMContentLoaded", async function () {
    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const { createClient } = window.supabase;

    const supabase = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    const menuToggle = document.getElementById("adminMenuToggle");
    const navigation = document.getElementById("adminNavigation");
    const currentDate = document.getElementById("adminCurrentDate");
    const adminYear = document.getElementById("adminYear");

    const profileButton = document.getElementById("adminProfileButton");
    const profileDropdown = document.getElementById("adminProfileDropdown");
    const profileAvatar = document.getElementById("profileAvatar");
    const profileFullName = document.getElementById("profileFullName");
    const profileEmail = document.getElementById("profileEmail");

    const addAdminModal = document.getElementById("addAdminModal");
    const editPasswordModal = document.getElementById("editPasswordModal");

    const addAdminForm = document.getElementById("addAdminForm");
    const editPasswordForm = document.getElementById("editPasswordForm");

    const addAdminMessage = document.getElementById("addAdminMessage");
    const editPasswordMessage = document.getElementById("editPasswordMessage");

    const createAdminButton = document.getElementById("createAdminButton");
    const updatePasswordButton = document.getElementById("updatePasswordButton");

    let currentUser = null;
    let currentProfile = null;

    function showMessage(element, message, type = "error") {
        if (!element) return;

        element.textContent = message;
        element.style.display = "block";
        element.style.color = type === "success" ? "#15803d" : "#dc2626";
    }

    function clearMessage(element) {
        if (!element) return;

        element.textContent = "";
        element.style.display = "none";
    }

    function openModal(modal) {
        if (!modal) return;

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal(modal) {
        if (!modal) return;

        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
    }

    function closeProfileDropdown() {
        if (!profileDropdown || !profileButton) return;

        profileDropdown.classList.remove("show");
        profileButton.setAttribute("aria-expanded", "false");
    }

    function toggleProfileDropdown() {
        if (!profileDropdown || !profileButton) return;

        const isOpen = profileDropdown.classList.toggle("show");

        profileButton.setAttribute("aria-expanded", String(isOpen));
    }

    function setButtonLoading(button, loading, originalText) {
        if (!button) return;

        button.disabled = loading;
        button.textContent = loading ? "PLEASE WAIT..." : originalText;
    }

    function redirectToLogin() {
        window.location.href = "index.html";
    }

    // DATE AND FOOTER
    if (currentDate) {
        currentDate.textContent = new Intl.DateTimeFormat("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(new Date()).toUpperCase();
    }

    if (adminYear) {
        adminYear.textContent = new Date().getFullYear();
    }

    // MOBILE NAVIGATION
    if (menuToggle && navigation) {
        menuToggle.addEventListener("click", function () {
            const isOpen = navigation.classList.toggle("open");

            menuToggle.setAttribute("aria-expanded", String(isOpen));
        });

        navigation.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navigation.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    // VERIFY CURRENT SESSION AND ADMIN ROLE
    try {
        const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
            redirectToLogin();
            return;
        }

        currentUser = sessionData.session.user;

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", currentUser.id)
            .single();

        if (profileError || !profile || profile.role !== "admin") {
            await supabase.auth.signOut();
            redirectToLogin();
            return;
        }

        currentProfile = profile;

        // PROFILE INFORMATION
        const fullName =
            profile.full_name ||
            currentUser.user_metadata?.full_name ||
            "Administrator";

        if (profileFullName) {
            profileFullName.textContent = fullName;
        }

        if (profileEmail) {
            profileEmail.textContent = currentUser.email || "";
        }

        if (profileAvatar) {
            profileAvatar.textContent = fullName.charAt(0).toUpperCase();
        }

    } catch (error) {
        console.error("Admin authentication error:", error);
        redirectToLogin();
        return;
    }

    // PROFILE DROPDOWN
    if (profileButton) {
        profileButton.addEventListener("click", function (event) {
            event.stopPropagation();
            toggleProfileDropdown();
        });
    }

    document.addEventListener("click", function (event) {
        if (
            profileDropdown &&
            profileButton &&
            !profileDropdown.contains(event.target) &&
            !profileButton.contains(event.target)
        ) {
            closeProfileDropdown();
        }
    });

    // ADD ADMIN BUTTON
    const openAddAdmin = document.getElementById("openAddAdmin");

    if (openAddAdmin) {
        openAddAdmin.addEventListener("click", function () {
            closeProfileDropdown();

            if (addAdminForm) {
                addAdminForm.reset();
            }

            clearMessage(addAdminMessage);
            openModal(addAdminModal);
        });
    }

    // ADD ADMIN SUBMISSION
    if (addAdminForm) {
        addAdminForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            clearMessage(addAdminMessage);

            const fullName = document.getElementById("newAdminName")?.value.trim();
            const email = document.getElementById("newAdminEmail")?.value.trim();
            const password = document.getElementById("newAdminPassword")?.value;
            const confirmPassword =
                document.getElementById("confirmNewAdminPassword")?.value;

            if (!fullName || !email || !password || !confirmPassword) {
                showMessage(addAdminMessage, "Please complete all fields.");
                return;
            }

            if (password.length < 8) {
                showMessage(
                    addAdminMessage,
                    "Password must contain at least 8 characters."
                );
                return;
            }

            if (password !== confirmPassword) {
                showMessage(addAdminMessage, "Passwords do not match.");
                return;
            }

            setButtonLoading(createAdminButton, true, "CREATE ADMIN");

            try {
                const { data, error } = await supabase.functions.invoke(
                    "create-admin",
                    {
                        body: {
                            fullName: fullName,
                            email: email,
                            password: password
                        }
                    }
                );

                if (error) {
                    let message = error.message || "Unable to create admin.";

                    if (error.context && typeof error.context.json === "function") {
                        try {
                            const response = await error.context.json();
                            message = response.error || response.message || message;
                        } catch (_) {
                            // Use the original error message.
                        }
                    }

                    throw new Error(message);
                }

                if (data?.error) {
                    throw new Error(data.error);
                }

                showMessage(
                    addAdminMessage,
                    "New administrator created successfully.",
                    "success"
                );

                addAdminForm.reset();

                setTimeout(function () {
                    closeModal(addAdminModal);
                    clearMessage(addAdminMessage);
                }, 1600);

            } catch (error) {
                console.error("Create admin error:", error);

                showMessage(
                    addAdminMessage,
                    error.message || "An unexpected error occurred."
                );

            } finally {
                setButtonLoading(createAdminButton, false, "CREATE ADMIN");
            }
        });
    }

    // EDIT PASSWORD BUTTON
    const openEditPassword = document.getElementById("openEditPassword");

    if (openEditPassword) {
        openEditPassword.addEventListener("click", function () {
            closeProfileDropdown();

            if (editPasswordForm) {
                editPasswordForm.reset();
            }

            clearMessage(editPasswordMessage);
            openModal(editPasswordModal);
        });
    }

    // EDIT PASSWORD SUBMISSION
    if (editPasswordForm) {
        editPasswordForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            clearMessage(editPasswordMessage);

            const currentPassword =
                document.getElementById("currentPassword")?.value;

            const newPassword =
                document.getElementById("newPassword")?.value;

            const confirmPassword =
                document.getElementById("confirmNewPassword")?.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showMessage(editPasswordMessage, "Please complete all fields.");
                return;
            }

            if (newPassword.length < 8) {
                showMessage(
                    editPasswordMessage,
                    "New password must contain at least 8 characters."
                );
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage(editPasswordMessage, "New passwords do not match.");
                return;
            }

            if (currentPassword === newPassword) {
                showMessage(
                    editPasswordMessage,
                    "Your new password must be different from your current password."
                );
                return;
            }

            setButtonLoading(updatePasswordButton, true, "UPDATE PASSWORD");

            let verificationClient = null;

            try {
                // Verify the current password using a separate temporary client.
                // This avoids replacing the active administrator session.
                verificationClient = createClient(
                    SUPABASE_URL,
                    SUPABASE_ANON_KEY,
                    {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    }
                );

                const { error: verificationError } =
                    await verificationClient.auth.signInWithPassword({
                        email: currentUser.email,
                        password: currentPassword
                    });

                if (verificationError) {
                    throw new Error("Your current password is incorrect.");
                }

                const { error: updateError } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (updateError) {
                    throw updateError;
                }

                showMessage(
                    editPasswordMessage,
                    "Your password has been updated successfully.",
                    "success"
                );

                editPasswordForm.reset();

                setTimeout(function () {
                    closeModal(editPasswordModal);
                    clearMessage(editPasswordMessage);
                }, 1600);

            } catch (error) {
                console.error("Password update error:", error);

                showMessage(
                    editPasswordMessage,
                    error.message || "Unable to update password."
                );

            } finally {
                if (verificationClient) {
                    await verificationClient.auth.signOut();
                }

                setButtonLoading(
                    updatePasswordButton,
                    false,
                    "UPDATE PASSWORD"
                );
            }
        });
    }

    // LOG OUT
    const logoutButton = document.getElementById("adminLogout");

    if (logoutButton) {
        logoutButton.addEventListener("click", async function () {
            logoutButton.disabled = true;

            try {
                const { error } = await supabase.auth.signOut();

                if (error) {
                    throw error;
                }

                redirectToLogin();

            } catch (error) {
                console.error("Logout error:", error);

                logoutButton.disabled = false;

                alert("Unable to log out. Please try again.");
            }
        });
    }

    // MODAL CLOSE BUTTONS
    document.querySelectorAll("[data-close-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            const modal = button.closest(".admin-modal-overlay");

            if (modal) {
                closeModal(modal);
            }
        });
    });

    // CLOSE MODAL WHEN CLICKING OUTSIDE
    [addAdminModal, editPasswordModal].forEach(function (modal) {
        if (!modal) return;

        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });

    // PASSWORD VISIBILITY
    document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
        button.addEventListener("click", function () {
            const targetId = button.getAttribute("data-toggle-password");
            const passwordInput = document.getElementById(targetId);

            if (!passwordInput) return;

            const isPassword = passwordInput.type === "password";

            passwordInput.type = isPassword ? "text" : "password";

            button.setAttribute(
                "aria-label",
                isPassword ? "Hide password" : "Show password"
            );
        });
    });

});
