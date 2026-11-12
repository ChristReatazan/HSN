
const clients = [
    {
        name: "Acer",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/1639708880OPEYn/acer.jpg",
        products: ["Full range"],
        services: [
            "Repair & maintenance",
            "Carry-in & Onsite Support",
            "Pickup Service",
            "Technical Support",
            "Customer Support",
            "Back Office Support",
            "Social Media Management"
        ],
        coverage: [
            "Service Centres – Nationwide",
            "Collection Centres – Nationwide"
        ]
    },
    {
        name: "GIGABYTE",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/1639708153QpfjL/Gigabyte.png",
        products: ["Laptops"],
        services: ["Repair Services (Carry-in)"]
    },
    {
        name: "Altos",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/1639708935pQQkR/altos.jpg",
        products: ["Servers and Storage"],
        services: [
            "Repair Services",
            "Onsite Services",
            "Maintenance Services"
        ]
    },
    {
        name: "Brother",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/1639708968DChqo/brother.jpg",
        products: ["Printers"],
        services: ["Repair Services (Carry-in)"]
    },
    {
        name: "Zebra",
        logo: "https://hsnservice-dev.s3.ap-southeast-1.amazonaws.com/pocket_image/1638710857WxLkJ/Zebra.png",
        products: [
            "Barcode Scanners",
            "Printers",
            "Mobile Devices"
        ],
        services: ["Repair Services (Carry-in)"]
    },
    {
        name: "Canon",
        logo: "https://hsnservice-dev.s3.ap-southeast-1.amazonaws.com/pocket_image/1633672009corMr/Canon.png",
        products: ["Printers", "Camera"],
        services: ["Repair Services (Carry-in)"]
    },
    {
        name: "Huawei",
        logo: "https://hsnservice-dev.s3.ap-southeast-1.amazonaws.com/pocket_image/1633674357AAYLq/Huawei.png",
        products: [
            "Laptops",
            "Smart Vision (TV)",
            "Printers"
        ],
        services: [
            "Repair Services (Carry-in)",
            "Onsite Installation Services",
            "Onsite Repair Services"
        ]
    },
    {
        name: "Panasonic",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/1639740422nwrEn/Panasonic_logo_PNG1.png",
        products: ["TV"],
        services: [
            "Repair Services (Carry-in)",
            "Onsite Services"
        ]
    },
    {
        name: "PLDT",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/1639740445Oyrg8/pldt-logo-ver2.jpg",
        services: [
            "Service Desk Management",
            "Level 2 and 3 Support",
            "Managed Services"
        ]
    },
    {
        name: "SMART",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/16397404585mUyX/smart_logo_2016.jpg",
        services: [
            "Service Desk Management",
            "Level 2 and 3 Support",
            "Managed Services"
        ]
    },
    {
        name: "Eyesurf",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/16397404788V9X5/eyesurf-logo-ottawa-on-381.jpg",
        services: [
            "Customer Support",
            "Technical Support"
        ]
    },
    {
        name: "Segway",
        logo: "https://hsnservice-prd.s3.ap-southeast-1.amazonaws.com/pocket_image/1650350271L5dEA/segway.jpg",
        services: [
            "Level 1 and Level 2 Technical Support",
            "Customer Support",
            "Back Office Support",
            "Social Media Management"
        ]
    },
    {
        name: "Sharp Cocoro Life",
        logo: "https://hsnservice-dev.s3.ap-southeast-1.amazonaws.com/pocket_image/1638712270KmLgn/Sharp%20Cocoro.png",
        services: [
            "Technical Support",
            "Back Office Support"
        ]
    }
];

/* INITIALIZATION */

function initializeClientsPage() {

    const clientsGrid = document.getElementById("clientsGrid");
    const clientSearch = document.getElementById("clientSearch");
    const noResults = document.getElementById("noResults");
    const partnerCount = document.getElementById("partnerCount");

    const modal = document.getElementById("clientModal");
    const modalClose = document.getElementById("modalClose");
    const modalLogo = document.getElementById("modalLogo");
    const modalBrandName = document.getElementById("modalBrandName");
    const modalProfile = document.getElementById("modalProfile");

    const modalProducts = document.getElementById("modalProducts");
    const modalServices = document.getElementById("modalServices");
    const modalCoverage = document.getElementById("modalCoverage");

    const productsSection = document.getElementById("productsSection");
    const coverageSection = document.getElementById("coverageSection");

    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");
    const currentYear = document.getElementById("currentYear");

    let previousFocus = null;

    /* CHECK REQUIRED GRID */

    if (!clientsGrid) {
        console.error(
            'HSN Clients: Cannot find element with id="clientsGrid". Check your clients.html.'
        );
        return;
    }

    /* CREATE PARTNER CARD */

    function createCard(client, index) {

        const card = document.createElement("button");
        card.type = "button";
        card.className = "partner-card";
        card.setAttribute("aria-label", `View ${client.name} profile`);

        const top = document.createElement("span");
        top.className = "card-topline";

        const number = document.createElement("span");
        number.className = "card-index";
        number.textContent = String(index + 1).padStart(2, "0");

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.textContent = "↗";

        top.append(number, arrow);

        const logoContainer = document.createElement("span");
        logoContainer.className = "card-logo";

        const image = document.createElement("img");
        image.src = client.logo;
        image.alt = `${client.name} logo`;
        image.loading = "lazy";

        image.addEventListener("error", function () {
            image.style.display = "none";

            const fallback = document.createElement("span");
            fallback.className = "logo-fallback";
            fallback.textContent = client.name;

            logoContainer.appendChild(fallback);
        }, { once: true });

        logoContainer.appendChild(image);

        const bottom = document.createElement("span");
        bottom.className = "card-bottom";

        const name = document.createElement("span");
        name.className = "card-name";
        name.textContent = client.name;

        const action = document.createElement("span");
        action.className = "card-action";
        action.textContent = "VIEW PROFILE";

        bottom.append(name, action);
        card.append(top, logoContainer, bottom);

        card.addEventListener("click", function () {
            openModal(client, card);
        });

        return card;
    }

    /* RENDER PARTNERS */

    function renderClients(search = "") {

        const query = search.trim().toLowerCase();

        const filtered = clients.filter(client => {

            const searchableContent = [
                client.name,
                ...(client.products || []),
                ...(client.services || []),
                ...(client.coverage || [])
            ].join(" ").toLowerCase();

            return searchableContent.includes(query);
        });

        clientsGrid.replaceChildren();

        filtered.forEach((client, index) => {
            clientsGrid.appendChild(createCard(client, index));
        });

        if (noResults) {
            noResults.hidden = filtered.length > 0;
        }

        if (partnerCount) {
            partnerCount.textContent = String(filtered.length).padStart(2, "0");
        }

        clientsGrid.setAttribute("aria-live", "polite");
    }

    /* POPULATE MODAL LISTS */

    function fillList(element, items) {

        if (!element) {
            return false;
        }

        element.replaceChildren();

        if (!Array.isArray(items) || items.length === 0) {
            return false;
        }

        items.forEach(item => {

            const li = document.createElement("li");
            li.textContent = item;

            element.appendChild(li);
        });

        return true;
    }

    /* OPEN PARTNER MODAL */

    function openModal(client, trigger) {

        if (!modal) {
            return;
        }

        previousFocus = trigger;

        if (modalLogo) {
            modalLogo.src = client.logo;
            modalLogo.alt = `${client.name} logo`;
        }

        if (modalBrandName) {
            modalBrandName.textContent = client.name;
        }

        if (modalProfile) {
            modalProfile.textContent =
                "Products and service capabilities";
        }

        const hasProducts = fillList(
            modalProducts,
            client.products
        );

        const hasServices = fillList(
            modalServices,
            client.services
        );

        const hasCoverage = fillList(
            modalCoverage,
            client.coverage
        );

        if (productsSection) {
            productsSection.hidden = !hasProducts;
        }

        if (coverageSection) {
            coverageSection.hidden = !hasCoverage;
        }

        if (modalServices) {
            modalServices.parentElement.hidden = !hasServices;
        }

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");

        if (modalClose) {
            modalClose.focus();
        }
    }

    /* CLOSE MODAL */

    function closeModal() {

        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal-open");

        if (previousFocus) {
            previousFocus.focus();
            previousFocus = null;
        }
    }

    /* SEARCH */

    if (clientSearch) {

        clientSearch.addEventListener("input", function (event) {
            renderClients(event.target.value);
        });
    }

    /* MODAL EVENTS */

    if (modalClose) {
        modalClose.addEventListener("click", closeModal);
    }

    if (modal) {

        modal.addEventListener("click", function (event) {

            if (event.target === modal) {
                closeModal();
            }
        });
    }

    document.addEventListener("keydown", function (event) {

        if (
            event.key === "Escape" &&
            modal &&
            modal.classList.contains("show")
        ) {
            closeModal();
        }
    });

    /* MOBILE NAVIGATION */

    if (menuToggle && mainNav) {

        menuToggle.setAttribute("aria-expanded", "false");

        menuToggle.addEventListener("click", function () {

            const isOpen = mainNav.classList.toggle("open");

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });

        mainNav.querySelectorAll("a").forEach(link => {

            link.addEventListener("click", function () {

                mainNav.classList.remove("open");

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );
            });
        });
    }

    /* FOOTER YEAR */

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    /* INITIAL RENDER */

    renderClients();

    console.log(
        `HSN Clients: Successfully loaded ${clients.length} brand partners.`
    );
}

/* RUN AFTER HTML IS READY */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeClientsPage
    );

} else {

    initializeClientsPage();
}
