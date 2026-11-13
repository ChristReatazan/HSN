
/* =========================================
   REALTIME UPDATES
========================================= */

function setupRealtime() {
    console.log("Initializing applicant realtime updates...");

    supabase
        .channel("applicant-management-updates")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: APPLICATIONS_TABLE
            },
            async payload => {
                console.log("NEW APPLICANT RECEIVED:", payload.new);

                await loadApplicants();

                showToast("New applicant application received.");

                if (activeApplicant) {
                    const updatedApplicant = applicants.find(
                        item => item.id === activeApplicant.id
                    );

                    if (updatedApplicant) {
                        activeApplicant = updatedApplicant;
                        await renderApplicantDetails(updatedApplicant);
                    }
                }
            }
        )
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: APPLICATIONS_TABLE
            },
            async () => {
                await loadApplicants();

                if (activeApplicant) {
                    const updatedApplicant = applicants.find(
                        item => item.id === activeApplicant.id
                    );

                    if (updatedApplicant) {
                        activeApplicant = updatedApplicant;
                        await renderApplicantDetails(updatedApplicant);
                    } else {
                        closeApplicantModal();
                    }
                }
            }
        )
        .on(
            "postgres_changes",
            {
                event: "DELETE",
                schema: "public",
                table: APPLICATIONS_TABLE
            },
            async () => {
                await loadApplicants();

                if (activeApplicant) {
                    const updatedApplicant = applicants.find(
                        item => item.id === activeApplicant.id
                    );

                    if (!updatedApplicant) {
                        closeApplicantModal();
                    }
                }
            }
        )
        .subscribe(status => {
            console.log("Applicant realtime status:", status);

            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                console.error("Realtime connection failed.");
            }
        });
}
