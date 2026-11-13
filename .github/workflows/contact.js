/* HSN Philippines - Contact Us form */
(() => {
    "use strict";
    const form = document.getElementById("contactForm");
    if (!form) return;

    document.getElementById("contactYear").textContent = new Date().getFullYear();

    const menuToggle = document.getElementById("menuToggle");
    const navigation = document.getElementById("mainNavigation");
    menuToggle?.addEventListener("click", () => {
        const isOpen = navigation.classList.toggle("show");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navigation?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navigation.classList.remove("show");
            menuToggle?.setAttribute("aria-expanded", "false");
        });
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const name = document.getElementById("contactName").value.trim();
        const email = document.getElementById("contactEmail").value.trim();
        const phone = document.getElementById("contactPhone").value.trim();
        const subject = document.getElementById("contactSubject").value;
        const message = document.getElementById("contactMessage").value.trim();

        const body = [
            "Name: " + name,
            "Email: " + email,
            "Phone: " + (phone || "Not provided"),
            "",
            "Message:",
            message
        ].join("\n");

        const mailto = "mailto:support.ph@hsnservice.com"
            + "?subject=" + encodeURIComponent("[HSN Website] " + subject)
            + "&body=" + encodeURIComponent(body);

        document.getElementById("contactFormStatus").textContent =
            "Your email application is opening with the message details. Please review and send your email.";
        window.location.href = mailto;
    });
})();
