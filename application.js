
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const SUPABASE_URL = "https://qpcsskiocfeeodunpcxa.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_oiJHNFVdHWa-aATe_HWJoQ_RLB2m8BZ";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    const avatar = document.getElementById("adminAvatar");
    const profile = document.querySelector(".admin-profile");

    if (!avatar || !profile) return;

    let applications = [];
    let careers = [];
    let dropdownOpen = false;

    const escapeHTML = value =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);

    const formatDate = value => {
        if (!value) return "Date unavailable";

        return new Intl.DateTimeFormat("en-PH", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date(value));
    };

    /* =========================================
       INJECT STYLES
    ========================================= */

    const styles = document.createElement("style");

    styles.textContent = `
        .admin-profile {
            position: relative;
        }

        #adminAvatar {
            cursor: pointer;
            border: 0;
            position: relative;
            transition: .2s ease;
        }

        #adminAvatar:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 16px rgba(8,125,193,.25);
        }

        .applicant-notification-badge {
            position: absolute;
            top: -7px;
            right: -8px;
            min-width: 19px;
            height: 19px;
            padding: 0 5px;
            display: none;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            background: #e53945;
            color: #fff;
            border: 2px solid #fff;
            font-size: 10px;
            font-weight: 800;
            z-index: 5;
        }

        .applicant-dropdown {
            position: absolute;
            top: calc(100% + 17px);
            right: 0;
            width: 390px;
            max-width: calc(100vw - 30px);
            background: #fff;
            border: 1px solid #e7edf2;
            border-radius: 15px;
            box-shadow: 0 18px 55px rgba(7,27,43,.18);
            z-index: 9999;
            overflow: hidden;
            display: none;
            color: #172b3a;
            animation: applicantDropIn .2s ease;
        }

        .applicant-dropdown.active {
            display: block;
        }

        @keyframes applicantDropIn {
            from {
                opacity: 0;
                transform: translateY(-7px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .applicant-dropdown-header {
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #edf1f4;
        }

        .applicant-dropdown-header h3 {
            margin: 0;
            font-size: 17px;
            font-weight: 750;
            color: #071b2b;
        }

        .applicant-dropdown-header p {
            margin: 5px 0 0;
            color: #7a8995;
            font-size: 12px;
        }

        .applicant-unread-count {
            background: #eaf5fc;
            color: #087dc1;
            padding: 6px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
        }

        .applicant-dropdown-actions {
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f0f2f4;
        }

        .applicant-dropdown-actions button {
            border: 0;
            background: transparent;
            color: #087dc1;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
        }

        .applicant-list {
            max-height: 390px;
            overflow-y: auto;
        }

        .applicant-item {
            width: 100%;
            display: flex;
            gap: 12px;
            align-items: flex-start;
            text-align: left;
            padding: 15px 18px;
            border: 0;
            border-bottom: 1px solid #f0f2f4;
            background: #fff;
            cursor: pointer;
            transition: background .2s ease;
        }

        .applicant-item:hover {
            background: #f5faff;
        }

        .applicant-item.unread {
            background: #f1f8fd;
        }

        .applicant-item.unread:hover {
            background: #eaf5fc;
        }

        .applicant-item-icon {
            flex: 0 0 38px;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #eaf5fc;
            color: #087dc1;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: 800;
            font-size: 14px;
        }

        .applicant-item-content {
            flex: 1;
            min-width: 0;
        }

        .applicant-item-name {
            display: block;
            font-size: 13px;
            color: #102d42;
            font-weight: 750;
            margin-bottom: 4px;
        }

        .applicant-item-position {
            display: block;
            color: #657684;
            font-size: 12px;
            line-height: 1.5;
        }

        .applicant-item-date {
            display: block;
            color: #9aa5ae;
            font-size: 10px;
            margin-top: 6px;
        }

        .applicant-item-dot {
            width: 8px;
            height: 8px;
            background: #087dc1;
            border-radius: 50%;
            margin-top: 6px;
            flex: 0 0 8px;
        }

        .applicant-empty,
        .applicant-loading,
        .applicant-error {
            padding: 35px 20px;
            text-align: center;
            color: #82909b;
            font-size: 13px;
        }

        .applicant-dropdown-footer {
            padding: 13px 18px;
            border-top: 1px solid #edf1f4;
            text-align: center;
            color: #87939c;
            font-size: 11px;
        }

        .applicant-detail-overlay {
            position: fixed;
            inset: 0;
            z-index: 100000;
            background: rgba(5,20,32,.62);
            display: none;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .applicant-detail-overlay.active {
            display: flex;
        }

        .applicant-detail-modal {
            width: 100%;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 17px;
            box-shadow: 0 25px 70px rgba(0,0,0,.22);
        }

        .applicant-detail-header {
            padding: 23px 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #edf1f4;
        }

        .applicant-detail-header h2 {
            color: #071b2b;
            font-size: 21px;
            margin: 5px 0;
        }

        .applicant-detail-header p {
            font-size: 12px;
            color: #83909a;
            margin: 0;
        }

        .applicant-detail-close {
            width: 34px;
            height: 34px;
            border: 0;
            border-radius: 50%;
            background: #f1f4f6;
            color: #52616d;
            font-size: 22px;
            cursor: pointer;
        }

        .applicant-detail-body {
            padding: 25px;
        }

        .applicant-detail-eyebrow {
            color: #087dc1;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.3px;
        }

        .applicant-detail-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .applicant-detail-field {
            min-width: 0;
        }

        .applicant-detail-field.full {
            grid-column: 1 / -1;
        }

        .applicant-detail-field label {
            display: block;
            color: #8996a0;
            font-size: 10px;
            font-weight: 750;
            text-transform: uppercase;
            letter-spacing: .7px;
            margin-bottom: 6px;
        }

        .applicant-detail-field div {
            color: #1c3446;
            font-size: 13px;
            line-height: 1.7;
            overflow-wrap: anywhere;
            white-space: pre-wrap;
        }

        .applicant-resume-card {
            margin-top: 24px;
            padding: 17px;
            border: 1px solid #dceaf3;
            background: #f5faff;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
        }

        .applicant-resume-info strong {
            display: block;
            color: #17354b;
            font-size: 13px;
        }

        .applicant-resume-info span {
            display: block;
            color: #83909a;
            font-size: 11px;
            margin-top: 4px;
        }

        .applicant-resume-button {
            border: 0;
            background: #087dc1;
            color: #fff;
            padding: 10px 15px;
            border-radius: 7px;
            font-size: 11px;
            font-weight: 750;
            cursor: pointer;
            white-space: nowrap;
        }

        .applicant-resume-button:hover {
            background: #06669f;
        }

        @media(max-width: 600px) {
            .applicant-dropdown {
                position: fixed;
                top: 82px;
                right: 12px;
                width: calc(100vw - 24px);
            }

            .applicant-detail-grid {
                grid-template-columns: 1fr;
            }

            .applicant-detail-field.full {
                grid-column: auto;
            }

            .applicant-resume-card {
                align-items: flex-start;
                flex-direction: column;
            }
        }
    `;

    document.head.appendChild(styles);

    /* =========================================
       CREATE NOTIFICATION INTERFACE
    ========================================= */

    avatar.setAttribute("role", "button");
    avatar.setAttribute("tabindex", "0");
    avatar.setAttribute("aria-label", "Open applicant notifications");
    avatar.setAttribute("aria-expanded", "false");

    const badge = document.createElement("span");
    badge.className = "applicant-notification-badge";
    badge.id = "applicantNotificationBadge";
    avatar.appendChild(badge);

    const dropdown = document.createElement("div");
    dropdown.className = "applicant-dropdown";
    dropdown.innerHTML = `
        <div class="applicant-dropdown-header">
            <div>
                <h3>Applicants</h3>
                <p>Recent career applications</p>
            </div>
            <span class="applicant-unread-count" id="applicantUnreadCount">
                0 NEW
            </span>
        </div>

        <div class="applicant-dropdown-actions">
            <span style="font-size:11px;color:#82909b;">
                Application notifications
            </span>
            <button type="button" id="refreshApplicants">
                ↻ Refresh
            </button>
        </div>

        <div class="applicant-list" id="applicantList">
            <div class="applicant-loading">Loading applicants...</div>
        </div>

        <div class="applicant-dropdown-footer">
            HSN Philippines · Applicant Notifications
        </div>
    `;

    profile.appendChild(dropdown);

    const detailOverlay = document.createElement("div");
    detailOverlay.className = "applicant-detail-overlay";
    detailOverlay.id = "applicantDetailOverlay";

    detailOverlay.innerHTML = `
        <div class="applicant-detail-modal" role="dialog" aria-modal="true">
            <div class="applicant-detail-header">
                <div>
                    <span class="applicant-detail-eyebrow">APPLICATION DETAILS</span>
                    <h2 id="applicantDetailName">Applicant</h2>
                    <p id="applicantDetailPosition">Position</p>
                </div>

                <button type="button"
                    class="applicant-detail-close"
                    id="closeApplicantDetails"
                    aria-label="Close">
                    &times;
                </button>
            </div>

            <div class="applicant-detail-body" id="applicantDetailBody"></div>
        </div>
    `;

    document.body.appendChild(detailOverlay);

    const applicantList = dropdown.querySelector("#applicantList");
    const unreadCount = dropdown.querySelector("#applicantUnreadCount");

    /* =========================================
       DROPDOWN CONTROLS
    ========================================= */

    function toggleDropdown(force) {
        dropdownOpen = typeof force === "boolean" ? force : !dropdownOpen;

        dropdown.classList.toggle("active", dropdownOpen);
        avatar.setAttribute("aria-expanded", String(dropdownOpen));
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
            toggleDropdown(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            toggleDropdown(false);
            closeDetails();
        }
    });

    dropdown.querySelector("#refreshApplicants").addEventListener(
        "click",
        loadApplications
    );

    /* =========================================
       LOAD CAREER TITLES
    ========================================= */

    async function loadCareerTitles() {
        const { data, error } = await supabase
            .from("careers")
            .select("id, title, department");

        if (error) {
            console.error("Unable to load career titles:", error);
            careers = [];
            return;
        }

        careers = data || [];
    }

    function getPosition(application) {
        const career = careers.find(
            item => String(item.id) === String(application.career_id)
        );

        return career?.title || "Position no longer available";
    }

    /* =========================================
       UPDATE NOTIFICATION BADGE
    ========================================= */

    function updateBadge() {
        const unread = applications.filter(item => !item.is_read).length;

        unreadCount.textContent = `${unread} NEW`;

        if (unread > 0) {
            badge.textContent = unread > 99 ? "99+" : unread;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    }

    /* =========================================
       RENDER APPLICANTS
    ========================================= */

    function renderApplications() {
        updateBadge();

        if (!applications.length) {
            applicantList.innerHTML = `
                <div class="applicant-empty">
                    <div style="font-size:28px;margin-bottom:10px;">♧</div>
                    <strong style="display:block;color:#17354b;margin-bottom:5px;">
                        No applications yet
                    </strong>
                    <span>New applicants will appear here.</span>
                </div>
            `;
            return;
        }

        applicantList.innerHTML = applications.map(application => {
            const name = escapeHTML(application.full_name);
            const position = escapeHTML(getPosition(application));
            const date = escapeHTML(formatDate(application.created_at));

            return `
                <button
                    type="button"
                    class="applicant-item ${application.is_read ? "" : "unread"}"
                    data-application-id="${escapeHTML(application.id)}"
                >
                    <span class="applicant-item-icon">
                        ${escapeHTML(
                            String(application.full_name || "A")
                                .trim()
                                .charAt(0)
                                .toUpperCase()
                        )}
                    </span>

                    <span class="applicant-item-content">
                        <span class="applicant-item-name">${name}</span>
                        <span class="applicant-item-position">${position}</span>
                        <span class="applicant-item-date">${date}</span>
                    </span>

                    ${application.is_read ? "" : '<span class="applicant-item-dot"></span>'}
                </button>
            `;
        }).join("");
    }

    /* =========================================
       LOAD APPLICATIONS
    ========================================= */

    async function loadApplications() {
        applicantList.innerHTML = `
            <div class="applicant-loading">Loading applicants...</div>
        `;

        await loadCareerTitles();

        const { data, error } = await supabase
            .from("career_applications")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Application loading error:", error);

            applicantList.innerHTML = `
                <div class="applicant-error">
                    Unable to load applicants.<br>
                    Please check your Supabase permissions and RLS policies.
                </div>
            `;

            return;
        }

        applications = data || [];
        renderApplications();
    }

    /* =========================================
       MARK AS READ
    ========================================= */

    async function markAsRead(id) {
        const application = applications.find(
            item => String(item.id) === String(id)
        );

        if (!application || application.is_read) return;

        const { error } = await supabase
            .from("career_applications")
            .update({ is_read: true })
            .eq("id", id);

        if (error) {
            console.error("Unable to mark application as read:", error);
            return;
        }

        application.is_read = true;
        renderApplications();
    }

    /* =========================================
       APPLICATION DETAILS
    ========================================= */

    function detailField(label, value, full = false) {
        return `
            <div class="applicant-detail-field ${full ? "full" : ""}">
                <label>${escapeHTML(label)}</label>
                <div>${escapeHTML(value || "Not provided")}</div>
            </div>
        `;
    }

    function closeDetails() {
        detailOverlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    async function openDetails(id) {
        const application = applications.find(
            item => String(item.id) === String(id)
        );

        if (!application) return;

        await markAsRead(id);

        document.getElementById("applicantDetailName").textContent =
            application.full_name || "Applicant";

        document.getElementById("applicantDetailPosition").textContent =
            getPosition(application);

        const body = document.getElementById("applicantDetailBody");

        body.innerHTML = `
            <span class="applicant-detail-eyebrow">
                PERSONAL INFORMATION
            </span>

            <div class="applicant-detail-grid">
                ${detailField("Full Name", application.full_name)}
                ${detailField("Email Address", application.email)}
                ${detailField("Contact Number", application.contact_number)}
                ${detailField("Expected Salary", application.expected_salary)}
                ${detailField("Address", application.address, true)}
                ${detailField("Position Applied", getPosition(application))}
                ${detailField("Application Date", formatDate(application.created_at))}
                ${detailField("Application ID", application.id, true)}
                ${detailField("Cover Letter", application.cover_letter, true)}
            </div>

            <div class="applicant-resume-card">
                <div class="applicant-resume-info">
                    <strong>Uploaded Resume</strong>
                    <span>${application.resume_path
                        ? escapeHTML(application.resume_path.split("/").pop())
                        : "No resume uploaded"}</span>
                </div>

                ${
                    application.resume_path
                        ? `<button type="button"
                            class="applicant-resume-button"
                            id="viewApplicantResume">
                            View Resume ↗
                           </button>`
                        : ""
                }
            </div>
        `;

        detailOverlay.classList.add("active");
        document.body.style.overflow = "hidden";

        const resumeButton = document.getElementById("viewApplicantResume");

        resumeButton?.addEventListener("click", async () => {
            const originalText = resumeButton.textContent;

            resumeButton.disabled = true;
            resumeButton.textContent = "Preparing...";

            const { data, error } = await supabase.storage
                .from("career-resumes")
                .createSignedUrl(application.resume_path, 60);

            resumeButton.disabled = false;
            resumeButton.textContent = originalText;

            if (error || !data?.signedUrl) {
                console.error("Resume access error:", error);
                alert("Unable to open the resume. Please check Storage permissions.");
                return;
            }

            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        });
    }

    applicantList.addEventListener("click", event => {
        const item = event.target.closest("[data-application-id]");

        if (!item) return;

        openDetails(item.dataset.applicationId);
    });

    document.getElementById("closeApplicantDetails").addEventListener(
        "click",
        closeDetails
    );

    detailOverlay.addEventListener("click", event => {
        if (event.target === detailOverlay) {
            closeDetails();
        }
    });

    /* =========================================
       REALTIME APPLICATION NOTIFICATIONS
    ========================================= */

    let applicationChannel = null;

    function subscribeToApplications() {
        if (applicationChannel) {
            supabase.removeChannel(applicationChannel);
        }

        applicationChannel = supabase
            .channel("admin-career-applications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "career_applications"
                },
                async payload => {
                    const newApplication = {
                        ...payload.new,
                        is_read: false
                    };

                    const alreadyExists = applications.some(
                        item => String(item.id) === String(newApplication.id)
                    );

                    if (!alreadyExists) {
                        applications.unshift(newApplication);
                    }

                    renderApplications();

                    if (!dropdownOpen) {
                        avatar.animate(
                            [
                                { transform: "scale(1)" },
                                { transform: "scale(1.12)" },
                                { transform: "scale(1)" }
                            ],
                            { duration: 450 }
                        );
                    }

                    await loadCareerTitles();
                    renderApplications();
                }
            )
            .subscribe(status => {
                if (status === "CHANNEL_ERROR") {
                    console.error("Application realtime subscription failed.");
                }
            });
    }

    /* =========================================
       ADMIN AUTHORIZATION
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
        console.error("Applicant notifications require administrator access.");
        return;
    }

    /* =========================================
       INITIALIZE
    ========================================= */

    await loadApplications();
    subscribeToApplications();

});
