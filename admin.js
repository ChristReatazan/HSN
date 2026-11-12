
document.addEventListener(DOMContentLoaded, function () {

    const menuToggle = document.getElementById(adminMenuToggle);
    const navigation = document.getElementById(adminNavigation);
    const currentDate = document.getElementById(adminCurrentDate);

    if (currentDate) {
        currentDate.textContent = new Intl.DateTimeFormat(en-PH, {
            year numeric,
            month long,
            day numeric
        }).format(new Date()).toUpperCase();
    }

    if (menuToggle && navigation) {

        menuToggle.addEventListener(click, function () {

            const isOpen = navigation.classList.toggle(open);

            menuToggle.setAttribute(
                aria-expanded,
                String(isOpen)
            );
        });

        navigation.querySelectorAll(a).forEach(link = {

            link.addEventListener(click, function () {
                navigation.classList.remove(open);
                menuToggle.setAttribute(aria-expanded, false);
            });

        });
    }

});
