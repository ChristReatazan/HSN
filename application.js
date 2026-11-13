
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    const ADMIN_PAGE = "applicant.html";

    const profile = document.querySelector(".admin-profile");
    const avatar = document.getElementById("adminAvatar");

    if (!profile || !avatar) return;

    const style = document.createElement("style");

    style.textContent = `
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
            min-width: 17px;
            height: 17px;
            padding: 0 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #fff;
            border-radius: 20px;
            background: #e53935;
            color: #fff;
            font-size: 9px;
            font-weight: 800;
            line-height: 1;
        }

        .applicant-notification-dropdown {
            position: absolute;
            top: calc(100% + 14px);
            right: 0;
            z-index: 9999;
            width: 310px;
            padding: 0;
            overflow: hidden;
            border: 1px solid #e7edf2;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 15px 45px rgba(0, 0, 0, .14);
            opacity: 0;
            visibility: hidden;
            transform: translateY(8px);
            transition: .2s ease;
        }

        .applicant-notification-dropdown.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .applicant-notification-header {
            padding: 17px 18px;
            border-bottom: 1px solid #edf1f4;
        }

        .applicant-notification-header strong {
            display: block;
            color: #183246;
            font-size: 13px;
        }

        .applicant-notification-header span {
            display: block;
            margin-top: 4px;
            color: #8996a1;
            font-size: 11px;
        }

        .applicant-notification-link {
            display: flex;
            align-items: center;
            gap: 13px;
            padding: 17px 18px;
            color: #20384a;
            text-decoration: none;
            transition: .2s ease;
        }

        .applicant-notification-link:hover {
            background: #f4f8fb;
        }

        .applicant-notification-icon {
            width: 40px;
            height: 40px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: #edf6fc;
            color: #087dc1;
            font-size: 19px;
        }

        .applicant-notification-text {
            flex: 1;
            min-width: 0;
        }

        .applicant-notification-text strong {
            display: block;
            color: #20384a;
            font-size: 12px;
        }

        .applicant-notification-text span {
            display: block;
            margin-top: 4px;
            color: #8996a1;
            font-size: 10px;
        }

        .applicant-notification-count {
            min-width: 22px;
            height: 22px;
            padding: 0 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            background: #e53935;
            color: #fff;
            font-size: 10px;
            font-weight: 800;
        }

        .applicant-notification-footer {
            padding: 11px 18px;
            border-top: 1px solid #edf1f4;
            color: #9aa5ad;
            font-size: 10px;
        }

        @media (max-width: 600px) {
            .applicant-notification-dropdown {
                right: -50px;
                width: min(310px, calc(100vw - 30px));
            }
        }
    `;

    document.head.appendChild(style);

    /* =========================================
       NOTIFICATION ELEMENTS
    ========================================= */

    const badge = document.createElement("span");
    badge.className = "applicant-notification-badge";
    badge.id = "applicantNotificationBadge";
    badge.hidden = true;

    avatar.appendChild(badge);

    const dropdown = document.createElement("div");
    dropdown.className = "applicant-notification-dropdown";
    dropdown.id = "applicantNotificationDropdown";

    dropdown.innerHTML = `
        <div class="applicant-notification-header">
            <strong>Notifications</strong>
            <span>Applicant application updates</span>
        </div>

        <a
            href="${ADMIN_PAGE}"
            class="applicant-notification-link"
            id="applicantNotificationLink"
        >
            <div class="applicant-notification-icon">▤</div>

            <div class="applicant-notification-text">
                <strong>Applicant Management</strong>
                <span>View and manage submitted applications</span>
            </div>

            <span
                class="applicant-notification-count"
                id="applicantNotificationCount"
            >0</span>
        </a>

        <div class="applicant-notification-footer">
            HSN Philippines Admin Portal
        </div>
    `;

    profile.appendChild(dropdown);

    const notificationCount = document.getElementById(
        "applicantNotificationCount"
    );

    /* =========================================
       AUTHENTICATION CHECK
    ========================================= */

    const {
        data: { session },
        error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) return;

    const { data: adminProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .maybeSingle();

    if (profileError || !adminProfile || adminProfile.role !== "admin") {
        return;
    }

    /* =========================================
       LOAD UNREAD NOTIFICATION COUNT
    ========================================= */

    async function loadNotificationCount() {
        const { count, error } = await supabase
            .from("career_applications")
            .select("id", { count: "exact", head: true })
            .eq("is_read", false);

        if (error) {
            console.error("Applicant notification error:", error);
            return;
        }

        const unreadCount = count || 0;

        notificationCount.textContent =
            unreadCount > 99 ? "99+" : unreadCount;

        badge.textContent =
            unreadCount > 99 ? "99+" : unreadCount;

        badge.hidden = unreadCount === 0;
        notificationCount.hidden = unreadCount === 0;
    }

    /* =========================================
       DROPDOWN TOGGLE
    ========================================= */

    avatar.setAttribute("role", "button");
    avatar.setAttribute("tabindex", "0");
    avatar.setAttribute("aria-label", "Open notifications");
    avatar.setAttribute("aria-expanded", "false");

    function toggleDropdown() {
        const isOpen = dropdown.classList.toggle("active");

        avatar.setAttribute("aria-expanded", String(isOpen));
    }

    avatar.addEventListener("click", event => {
        event.stopPropagation();
        toggleDropdown();
    });

    avatar.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleDropdown();
        }
    });

    dropdown.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", event => {
        if (!profile.contains(event.target)) {
            dropdown.classList.remove("active");
            avatar.setAttribute("aria-expanded", "false");
        }
    });

    /* =========================================
       REALTIME NEW APPLICATION NOTIFICATIONS
    ========================================= */

    const applicationChannel = supabase
        .channel("admin-applicant-notifications")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "career_applications"
            },
            () => {
                loadNotificationCount();
            }
        )
        .subscribe();

    /* =========================================
       INITIALIZE
    ========================================= */

    await loadNotificationCount();

    window.addEventListener("focus", loadNotificationCount);
});
