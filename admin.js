
/* =========================================
   APPLICANT MANAGEMENT QUERIES
========================================= */

let allApplicants = [];
let selectedCareerFilter = "all";

async function loadApplicants() {
    const { data, error } = await supabaseClient
        .from("career_applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Applicant query error:", error);
        alert("Unable to load applicants: " + error.message);
        return;
    }

    allApplicants = data || [];
    renderApplicants();
}

function renderApplicants() {
    const tableBody = document.getElementById("applicantsTableBody");

    if (!tableBody) return;

    const searchValue =
        (document.getElementById("applicantSearch")?.value || "")
        .toLowerCase()
        .trim();

    const statusFilter =
        document.getElementById("applicantStatusFilter")?.value || "all";

    const filteredApplicants = allApplicants.filter(applicant => {
        const matchesSearch =
            (applicant.full_name || "").toLowerCase().includes(searchValue) ||
            (applicant.contact_no || "").toLowerCase().includes(searchValue) ||
            (applicant.position_title || "").toLowerCase().includes(searchValue);

        const matchesStatus =
            statusFilter === "all" || applicant.status === statusFilter;

        const matchesCareer =
            selectedCareerFilter === "all" ||
            applicant.career_id === selectedCareerFilter;

        return matchesSearch && matchesStatus && matchesCareer;
    });

    tableBody.innerHTML = "";

    if (filteredApplicants.length === 0) {
        tableBody.innerHTML =
            '<tr><td colspan="7">No applicants found.</td></tr>';
        return;
    }

    filteredApplicants.forEach(applicant => {
        const row = document.createElement("tr");

        const date = new Date(applicant.created_at).toLocaleDateString();

        const values = [
            applicant.full_name,
            applicant.contact_no,
            applicant.position_title,
            applicant.address,
            "₱" + Number(applicant.expected_salary).toLocaleString(),
            date
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value || "N/A";
            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const resumeButton = document.createElement("button");
        resumeButton.type = "button";
        resumeButton.textContent = "View Resume";
        resumeButton.addEventListener("click", () => {
            viewApplicantResume(applicant.resume_path);
        });

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

        actions.append(resumeButton, statusSelect);
        row.appendChild(actions);

        tableBody.appendChild(row);
    });
}

/* =========================================
   FILTER BY CAREER ID
========================================= */

function filterApplicantsByCareer(careerId) {
    selectedCareerFilter = careerId || "all";

    const applicantSection =
        document.getElementById("applicantManagement");

    applicantSection?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    renderApplicants();
}

/* =========================================
   VIEW PRIVATE RESUME
========================================= */

async function viewApplicantResume(resumePath) {
    if (!resumePath) {
        alert("No resume file is available.");
        return;
    }

    const { data, error } = await supabaseClient.storage
        .from("career-resumes")
        .createSignedUrl(resumePath, 300);

    if (error) {
        console.error("Resume access error:", error);
        alert("Unable to open resume: " + error.message);
        return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

/* =========================================
   UPDATE APPLICANT STATUS
========================================= */

async function updateApplicantStatus(applicantId, newStatus) {
    const allowedStatuses = [
        "Pending",
        "Under Review",
        "Shortlisted",
        "Rejected",
        "Hired"
    ];

    if (!allowedStatuses.includes(newStatus)) return;

    const { error } = await supabaseClient
        .from("career_applications")
        .update({ status: newStatus })
        .eq("id", applicantId);

    if (error) {
        console.error("Status update error:", error);
        alert("Unable to update applicant status.");
        await loadApplicants();
        return;
    }

    await loadApplicants();
}

/* =========================================
   APPLICANT EVENT LISTENERS
========================================= */

document.getElementById("applicantSearch")
    ?.addEventListener("input", renderApplicants);

document.getElementById("applicantStatusFilter")
    ?.addEventListener("change", renderApplicants);

document.getElementById("refreshApplicants")
    ?.addEventListener("click", loadApplicants);
