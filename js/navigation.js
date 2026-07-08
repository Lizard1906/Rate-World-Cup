const YEAR_STORAGE_KEY = "rate-wc-year";

function getYear() {
    const year = localStorage.getItem(YEAR_STORAGE_KEY);
    return year ? Number(year) : 2026;
}

function setYear(year) {
    localStorage.setItem(YEAR_STORAGE_KEY, String(year));
}

function renderNavbar() {
    const currentYear = getYear();

    return `
        <header class="site-nav">
            <div class="site-nav__inner">
                <a class="site-nav__brand" href="index.html">Rate World Cup</a>

                <nav class="site-nav__links" aria-label="Primary">
                    <a class="site-nav__link" href="stats.html">Stats</a>

                    <label class="site-nav__year" for="year-select">
                        <span>Year</span>
                        <select id="year-select" data-year-select>
                            <option value="2026" ${currentYear === 2026 ? "selected" : ""}>2026</option>
                        </select>
                    </label>
                </nav>
            </div>
        </header>
    `;
}

function initNavbar() {
    const yearSelect = document.querySelector("[data-year-select]");

    if (!yearSelect) {
        return;
    }

    yearSelect.value = String(getYear());
    yearSelect.addEventListener("change", () => {
        setYear(Number(yearSelect.value));
        window.location.reload();
    });
}

window.SiteNav = {
    getYear,
    setYear,
    renderNavbar,
    initNavbar,
};

document.addEventListener("DOMContentLoaded", () => {
    const navMount = document.getElementById("site-nav");

    if (!navMount) {
        return;
    }

    navMount.innerHTML = renderNavbar();
    initNavbar();
});