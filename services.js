
/* ==============================
   SERVICE INFORMATION
============================== */

const services = {
    "contact-centre": {
        number: "SERVICE 01",
        category: "CUSTOMER EXPERIENCE",
        title: "Contact Centre",
        image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902",
        imageAlt: "Contact centre team working together",
        description:
            "Our Contact Centre services focus on creating meaningful customer interactions through professional communication and dependable support. We help businesses connect with their customers, address inquiries, and deliver a consistent service experience across communication channels.",
        features: [
            "Inbound customer service and inquiry handling",
            "Outbound customer communication and follow-ups",
            "Technical assistance and basic troubleshooting",
            "Customer feedback and concern management",
            "Multichannel customer engagement",
            "Service quality monitoring and performance support"
        ],
        value:
            "We help businesses build customer trust, strengthen relationships, and deliver consistent support experiences."
    },

    "repair-services": {
        number: "SERVICE 02",
        category: "TECHNICAL SUPPORT",
        title: "Repair Services",
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
        imageAlt: "Technical repair professional working on equipment",
        description:
            "Our Repair Services support the maintenance and restoration of electronic devices and equipment. Through technical assessment, diagnostics, and repair processes, we help address product issues and support reliable after-sales service.",
        features: [
            "Product inspection and initial assessment",
            "Hardware diagnostics and fault identification",
            "Device troubleshooting and repair",
            "Component replacement when applicable",
            "Repair status coordination and documentation",
            "Post-repair testing and quality checks"
        ],
        value:
            "We support product reliability and customer satisfaction through structured technical assessment and repair services."
    },

    "managed-services": {
        number: "SERVICE 03",
        category: "IT OPERATIONS",
        title: "Managed Services",
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
        imageAlt: "Technology infrastructure and server equipment",
        description:
            "Our Managed Services help organizations maintain and support their technology operations. We provide structured assistance for IT environments, helping businesses manage operational requirements and maintain dependable technology services.",
        features: [
            "IT operations and technical support",
            "Technology infrastructure assistance",
            "System and equipment monitoring support",
            "Incident coordination and escalation",
            "Routine maintenance coordination",
            "Operational reporting and service management"
        ],
        value:
            "We help organizations improve operational continuity and manage technology-related responsibilities more efficiently."
    },

    "business-solutions": {
        number: "SERVICE 04",
        category: "BUSINESS SUPPORT",
        title: "Business Solutions",
        image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36",
        imageAlt: "Modern business workspace",
        description:
            "Our Business Solutions are designed to support business operations through flexible service arrangements and process-oriented assistance. We work with organizations to understand their operational requirements and provide support aligned with their business objectives.",
        features: [
            "Business process support",
            "Administrative and operational assistance",
            "Workflow and process coordination",
            "Customer and business support activities",
            "Service documentation and reporting",
            "Flexible support based on business requirements"
        ],
        value:
            "We help businesses focus on their priorities by providing dependable operational support and practical service solutions."
    },

    "onsite-services": {
        number: "SERVICE 05",
        category: "FIELD SUPPORT",
        title: "Onsite Services",
        image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789",
        imageAlt: "Technical professional providing hands-on support",
        description:
            "Our Onsite Services bring technical assistance directly to the customer's location. This service supports businesses and customers who require hands-on technical attention, equipment-related assistance, or on-location service coordination.",
        features: [
            "On-location technical assistance",
            "Equipment installation and setup support",
            "Device inspection and troubleshooting",
            "Maintenance and service coordination",
            "Onsite issue documentation",
            "Technical escalation when required"
        ],
        value:
            "We make technical support more accessible by bringing service assistance closer to where it is needed."
    },

    "board-repair": {
        number: "SERVICE 06",
        category: "SPECIALIZED REPAIR",
        title: "Board Repair Centre",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
        imageAlt: "Electronic circuit board and components",
        description:
            "Our Board Repair Centre focuses on the inspection and repair of electronic circuit boards. This specialized service involves examining electronic components, identifying potential faults, and carrying out appropriate repair procedures based on technical assessment.",
        features: [
            "Circuit board inspection and assessment",
            "Electronic fault identification",
            "Component-level troubleshooting",
            "Board repair and component replacement when applicable",
            "Post-repair testing and verification",
            "Technical documentation and repair reporting"
        ],
        value:
            "We support equipment restoration through specialized electronic board assessment and repair capabilities."
    }
};


/* ==============================
   MOBILE NAVIGATION
============================== */

const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navigation.classList.toggle("show");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );

        menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navigation.classList.remove("show");

            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation menu");
            menuToggle.textContent = "☰";
        });
    });
}


/* ==============================
   SERVICE MODAL
============================== */

const serviceModal = document.getElementById("serviceModal");
const modalClose = document.getElementById("modalClose");
const modalDone = document.getElementById("modalDone");

const modalImage = document.getElementById("modalImage");
const modalCategory = document.getElementById("modalCategory");
const modalNumber = document.getElementById("modalNumber");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalFeatures = document.getElementById("modalFeatures");
const modalValue = document.getElementById("modalValue");

const serviceCards = document.querySelectorAll(".service-card");

let previouslyFocusedElement = null;


/* OPEN MODAL */

function openServiceModal(serviceKey) {
    const service = services[serviceKey];

    if (!service || !serviceModal) {
        return;
    }

    previouslyFocusedElement = document.activeElement;

    modalImage.src = service.image;
    modalImage.alt = service.imageAlt;

    modalCategory.textContent = service.category;
    modalNumber.textContent = service.number;
    modalTitle.textContent = service.title;
    modalDescription.textContent = service.description;
    modalValue.textContent = service.value;

    modalFeatures.replaceChildren();

    service.features.forEach(feature => {
        const listItem = document.createElement("li");
        listItem.textContent = feature;

        modalFeatures.appendChild(listItem);
    });

    serviceModal.classList.add("active");
    serviceModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    modalClose.focus();
}


/* CLOSE MODAL */

function closeServiceModal() {
    if (!serviceModal || !serviceModal.classList.contains("active")) {
        return;
    }

    serviceModal.classList.remove("active");
    serviceModal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
    }
}


/* SERVICE CARD CLICK EVENTS */

serviceCards.forEach(card => {
    card.addEventListener("click", () => {
        const serviceKey = card.dataset.service;

        openServiceModal(serviceKey);
    });
});


/* CLOSE BUTTONS */

if (modalClose) {
    modalClose.addEventListener("click", closeServiceModal);
}

if (modalDone) {
    modalDone.addEventListener("click", closeServiceModal);
}


/* CLOSE WHEN CLICKING OUTSIDE MODAL */

if (serviceModal) {
    serviceModal.addEventListener("click", event => {
        if (event.target === serviceModal) {
            closeServiceModal();
        }
    });
}


/* CLOSE WITH ESCAPE KEY */

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        serviceModal &&
        serviceModal.classList.contains("active")
    ) {
        closeServiceModal();
    }
});


/* ==============================
   FOOTER YEAR
============================== */

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}
