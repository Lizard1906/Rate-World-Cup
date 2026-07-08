const RATE_STORAGE_KEY = "rate-wc-rates";

function getAllRatings() {
    try {
        return JSON.parse(localStorage.getItem(RATE_STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

function saveAllRatings(ratings) {
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(ratings));
}

function getRating(id) {
    const ratings = getAllRatings();
  return ratings[id];
}

function setRating(id, value) {
    const ratings = getAllRatings();
    ratings[id] = value; // number 1-5 ou null
    saveAllRatings(ratings);
}

function renderRating(matchId, options = {}) {
    const current = getRating(matchId);
    const size = options.size === "lg" ? "lg" : "sm";

    return `
      <section class="rating-card rating-card--${size}" data-id="${matchId}">
        <div class="rating-card__header">
          <div>
            <p class="rating-card__eyebrow">Rating</p>
          </div>
        </div>

        <div class="rating" aria-label="Avaliação do jogo">
          ${[1, 2, 3, 4, 5].map((star) => `
            <button type="button" class="star ${current >= star ? "active" : ""}" data-value="${star}" aria-label="Dar ${star} estrelas">
              ★
            </button>
          `).join("")}
        </div>

        <button
          type="button"
          class="no-view ${current === undefined ? "idle" : current === null ? "active" : "reviewed"}"
          title = "${current === undefined ? "" : current === null ? "Não visto" : "Visto"}"
        >
        </button>
      </section>
    `;
}

function notifyRatingsChange(id) {
    window.dispatchEvent(new CustomEvent("ratingschange", {
        detail: { id },
    }));
}

window.addEventListener("storage", (event) => {
    if (event.key === RATE_STORAGE_KEY) {
        notifyRatingsChange();
    }
});



document.addEventListener("click", (e) => {
    const star = e.target.closest(".star");
    const noView = e.target.closest(".no-view");

    if (star) {
        const id = star.closest(".rating-card").dataset.id;
        const value = Number(star.dataset.value);

        setRating(id, value);
        notifyRatingsChange(id);
    }

    if (noView) {
        const id = noView.closest(".rating-card").dataset.id;

        setRating(id, null);
        notifyRatingsChange(id);
    }
});