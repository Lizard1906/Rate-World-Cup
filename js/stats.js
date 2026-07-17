const TEAMS_STORAGE_KEY = "rate-wc-teams";

const teams = JSON.parse(
    localStorage.getItem(TEAMS_STORAGE_KEY) || "[]"
);
buildTeamFlagMap(teams);

const STATS_MATCHES_STORAGE_KEY = "rate-wc-matches";
const STATS_RATE_STORAGE_KEY = "rate-wc-rates";

const state = {
    filter: "watched",
    modalAscending: false,
    matches: [],
    ratings: {},
    modalData: {},
    openModalKey: null,
};

function getStatsDataUrl() {
    const year = window.SiteNav?.getYear?.() ?? 2026;
    return `https://raw.githubusercontent.com/openfootball/worldcup.json/master/${year}/worldcup.json`;
}

function getAllRatingsSafe() {
    if (window.Ratings?.getAllRatings) {
        return window.Ratings.getAllRatings();
    }

    try {
        return JSON.parse(localStorage.getItem(STATS_RATE_STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

function getPlayedMatches(matches) {
    return matches.filter((match) => match?.score?.ft?.every(Number.isFinite));
}

function getWatchedMatchIds(ratings) {
    return new Set(
        Object.entries(ratings)
            .filter(([, value]) => Number.isFinite(value))
            .map(([id]) => id),
    );
}

function getNotWatchedMatchIds(ratings) {
    return new Set(
        Object.entries(ratings)
            .filter(([, value]) => value === null)
            .map(([id]) => id),
    );
}

function getRatedMatchIds(ratings) {
    return new Set(
        Object.entries(ratings)
            .filter(([, value]) => value === null || Number.isFinite(value))
            .map(([id]) => id),
    );
}

function getScopedMatches() {
    const playedMatches = getPlayedMatches(state.matches);

    if (state.filter === "all") {
        return playedMatches;
    }

    const watchedIds = getWatchedMatchIds(state.ratings);
    return playedMatches.filter((match) => watchedIds.has(match.id));
}

function rankEntries(mapObj, valueLabel) {
    return Object.entries(mapObj)
        .map(([name, value]) => ({ name, value, valueLabel }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function withTeamFlag(teamName, label) {
    if (!teamName || typeof window.renderTeamFlag !== "function") {
        return label ?? teamName;
    }

    return `
        <span class="stats-name">
            ${window.renderTeamFlag(teamName)}
            <span>${label ?? teamName}</span>
        </span>
    `;
}

function renderRows(items, formatter) {
    if (!items.length) {
        return `<div class="status">Sem dados suficientes.</div>`;
    }

    return `
        <div class="stats-list">
            ${items.map((item) => `
                <div class="stats-row">
                    <span>${item.nameHtml ?? item.name}</span>
                    <strong>${formatter(item)}</strong>
                </div>
            `).join("")}
        </div>
    `;
}

function getModalItems(items) {
    return state.modalAscending ? [...items].reverse() : items;
}

function renderTopBlock(targetId, key, title, items, formatter) {
    const target = document.getElementById(targetId);

    if (!target) {
        return;
    }

    const top5 = items.slice(0, 5);
    state.modalData[key] = {
        title,
        items,
        formatter,
    };

    const showAllBtn = items.length > 5
        ? `<button class="show-all" data-modal-key="${key}">View all</button>`
        : "";

    target.innerHTML = `
        ${renderRows(top5, formatter)}
        ${showAllBtn}
    `;
}

function renderProgress() {
    const container = document.getElementById("progress-card");
    const watchedSection = document.getElementById("watched-section");

    if (!container || !watchedSection) {
        return;
    }

    if (state.filter !== "watched") {
        watchedSection.style.display = "none";
        return;
    }

    watchedSection.style.display = "grid";

    const watchedIds = getWatchedMatchIds(state.ratings);
    const notWatchedIds = getNotWatchedMatchIds(state.ratings);
    const ratedIds = getRatedMatchIds(state.ratings);

    const existingMatchIds = new Set(state.matches.map((match) => match.id));

    const watchedCount = [...watchedIds].filter((id) => existingMatchIds.has(id)).length;
    const notWatchedCount = [...notWatchedIds].filter((id) => existingMatchIds.has(id)).length;
    const totalCount = [...ratedIds].filter((id) => existingMatchIds.has(id)).length;

    const percent = totalCount > 0
        ? Math.round((watchedCount / totalCount) * 100)
        : 0;

    container.innerHTML = `
        <div class="progress">
            <div class="progress-metrics">
                <div class="progress-metric">
                    <div class="progress-circle watched">${watchedCount}</div>
                    <div class="progress-label">Watched matches</div>
                </div>

                <div class="progress-metric">
                    <div class="progress-circle not-watched">${notWatchedCount}</div>
                    <div class="progress-label">Unwatched matches</div>
                </div>

                <div class="progress-metric">
                    <div class="progress-circle percent">${percent}%</div>
                    <div class="progress-label">Watched rate</div>
                </div>
            </div>
        </div>
    `;
}

function computePersonalStats() {
    const watchedIds = getWatchedMatchIds(state.ratings);
    const watchedMatches = state.matches.filter((match) => watchedIds.has(match.id));

    const teamRatings = {};
    const teamRatingCount = {};
    const watchedTeams = {};

    watchedMatches.forEach((match) => {
        const rating = state.ratings[match.id];

        if (!Number.isFinite(rating)) {
            return;
        }

        [match.team1, match.team2].forEach((team) => {
            teamRatings[team] = (teamRatings[team] ?? 0) + rating;
            teamRatingCount[team] = (teamRatingCount[team] ?? 0) + 1;
            watchedTeams[team] = (watchedTeams[team] ?? 0) + 1;
        });
    });

    const highestRatedTeams = Object.keys(teamRatings)
        .map((team) => ({
            name: team,
            nameHtml: withTeamFlag(team, team),
            value: teamRatings[team] / teamRatingCount[team],
            matches: teamRatingCount[team],
        }))
        .sort((a, b) => b.value - a.value || b.matches - a.matches || a.name.localeCompare(b.name));

    const mostWatchedTeams = rankEntries(watchedTeams, "jogos").map((item) => ({
        ...item,
        nameHtml: withTeamFlag(item.name, item.name),
    }));

    renderTopBlock(
        "best-rated-teams",
        "best-rated-teams",
        "Best Average Rating by Team",
        highestRatedTeams,
        (item) => item.value.toFixed(2),
    );

    renderTopBlock(
        "most-watched-teams",
        "most-watched-teams",
        "Most Watched Teams",
        mostWatchedTeams,
        (item) => item.value,
    );
}

function computeTournamentStats() {
    const scopedMatches = getScopedMatches();

    const scorerGoals = {};
    const scorerTeams = {};
    const ownScorerGoals = {};
    const ownScorerTeams = {};
    const teamGoals = {};
    const teamWins = {};

    scopedMatches.forEach((match) => {
        const homeTeam = match.team1;
        const awayTeam = match.team2;

        const homeGoals = match?.score?.ft?.[0] ?? 0;
        const awayGoals = match?.score?.ft?.[1] ?? 0;

        teamGoals[homeTeam] = (teamGoals[homeTeam] ?? 0) + homeGoals;
        teamGoals[awayTeam] = (teamGoals[awayTeam] ?? 0) + awayGoals;

        if (homeGoals > awayGoals) {
            teamWins[homeTeam] = (teamWins[homeTeam] ?? 0) + 1;
        } else if (awayGoals > homeGoals) {
            teamWins[awayTeam] = (teamWins[awayTeam] ?? 0) + 1;
        }

        (match.goals1 || []).forEach((goal) => {
            if (!goal?.name) {
                return;
            }

            if (goal.owngoal) {
                ownScorerGoals[goal.name] = (ownScorerGoals[goal.name] ?? 0) + 1;
                ownScorerTeams[goal.name] = ownScorerTeams[goal.name] ?? {};
                ownScorerTeams[goal.name][awayTeam] = (ownScorerTeams[goal.name][awayTeam] ?? 0) + 1;
            } else {
                scorerGoals[goal.name] = (scorerGoals[goal.name] ?? 0) + 1;
                scorerTeams[goal.name] = scorerTeams[goal.name] ?? {};
                scorerTeams[goal.name][homeTeam] = (scorerTeams[goal.name][homeTeam] ?? 0) + 1;
            }

        });

        (match.goals2 || []).forEach((goal) => {
            if (!goal?.name) {
                return;
            }

            if (goal.owngoal) {
                ownScorerGoals[goal.name] = (ownScorerGoals[goal.name] ?? 0) + 1;
                ownScorerTeams[goal.name] = ownScorerTeams[goal.name] ?? {};
                ownScorerTeams[goal.name][homeTeam] = (ownScorerTeams[goal.name][homeTeam] ?? 0) + 1;
            } else {
                scorerGoals[goal.name] = (scorerGoals[goal.name] ?? 0) + 1;
                scorerTeams[goal.name] = scorerTeams[goal.name] ?? {};
                scorerTeams[goal.name][awayTeam] = (scorerTeams[goal.name][awayTeam] ?? 0) + 1;
            }
         });
     });
 
    const topScorers = rankEntries(scorerGoals, "golos").map((item) => {
        const teamsForPlayer = scorerTeams[item.name] ?? {};
        const primaryTeam = Object.entries(teamsForPlayer)
            .sort((a, b) => b[1] - a[1])?.[0]?.[0];

        return {
            ...item,
            nameHtml: primaryTeam ? withTeamFlag(primaryTeam, item.name) : item.name,
        };
    });

    const topOwnScorers = rankEntries(ownScorerGoals, "golos").map((item) => {
        const teamsForPlayer = ownScorerTeams[item.name] ?? {};
        const primaryTeam = Object.entries(teamsForPlayer)
            .sort((a, b) => b[1] - a[1])?.[0]?.[0];

        return {
            ...item,
            nameHtml: primaryTeam ? withTeamFlag(primaryTeam, item.name) : item.name,
        };
    });

    const topTeamsGoals = rankEntries(teamGoals, "golos").map((item) => ({
        ...item,
        nameHtml: withTeamFlag(item.name, item.name),
    }));

    const topTeamsWins = rankEntries(teamWins, "vitórias").map((item) => ({
        ...item,
        nameHtml: withTeamFlag(item.name, item.name),
    }));
 
    renderTopBlock(
        "top-scorers",
        "top-scorers",
        "Top Scorers",
        topScorers,
        (item) => item.value,
    );

    renderTopBlock(
        "top-own-scorers",
        "top-own-scorers",
        "Top Own Scorers",
        topOwnScorers,
        (item) => item.value,
    );

    renderTopBlock(
        "top-teams-goals",
        "top-teams-goals",
        "Top Teams by Goals",
        topTeamsGoals,
        (item) => item.value,
    );

    renderTopBlock(
        "top-teams-wins",
        "top-teams-wins",
        "Top Teams by Wins",
        topTeamsWins,
        (item) => item.value,
    );
 }
 
 function renderAll() {
     state.ratings = getAllRatingsSafe();
 
     renderProgress();
     computePersonalStats();
     computeTournamentStats();
 }
 
 function renderModal() {
    if (!state.openModalKey) {
        return;
    }

    const modalBody = document.getElementById("stats-modal-body");
    const entry = state.modalData[state.openModalKey];

    modalBody.innerHTML = renderRows(
        getModalItems(entry.items),
        entry.formatter,
    );
}

function openModal(key) {
    const modal = document.getElementById("stats-modal");
    const modalTitle = document.getElementById("stats-modal-title");
    const entry = state.modalData[key];

    if (!modal || !modalTitle || !entry) {
        return;
    }

    state.openModalKey = key;
    state.modalAscending = false;

    modalTitle.textContent = entry.title;

    renderModal();

    modal.showModal?.();
} 
 function closeModal() {
     const modal = document.getElementById("stats-modal");
 
     if (!modal) {
         return;
     }
 
     if (typeof modal.close === "function") {
         modal.close();
     } else {
         modal.removeAttribute("open");
     }

    state.openModalKey = null;
 }

 
 function initInteractions() {
     const buttons = document.querySelectorAll(".filter-btn");
 
     buttons.forEach((button) => {
         button.addEventListener("click", () => {
             const nextFilter = button.dataset.filter === "watched" ? "watched" : "all";
             state.filter = nextFilter;
 
             buttons.forEach((btn) => {
                 btn.classList.toggle("active", btn === button);
             });
 
             renderAll();
         });
     });
 
     document.addEventListener("click", (event) => {
         const showAllButton = event.target.closest(".show-all");
 
         if (showAllButton) {
             openModal(showAllButton.dataset.modalKey);
             return;
         }
 
         const closeButton = event.target.closest("#stats-modal-close");
         if (closeButton) {
             closeModal();
            return;
        }

const title = event.target.closest("#stats-modal-title");

if (title) {
    state.modalAscending = !state.modalAscending;
    renderModal();
}     });
 
     const modal = document.getElementById("stats-modal");
     if (modal) {
         modal.addEventListener("click", (event) => {
             const rect = modal.getBoundingClientRect();
             const inside = (
                 event.clientX >= rect.left &&
                 event.clientX <= rect.right &&
                 event.clientY >= rect.top &&
                 event.clientY <= rect.bottom
             );
 
             if (!inside) {
                 closeModal();
             }
         });
     }
 }
 
 async function loadMatches() {
     const cachedMatches = JSON.parse(localStorage.getItem(STATS_MATCHES_STORAGE_KEY) || "[]");
 
     if (cachedMatches.length) {
         state.matches = cachedMatches;
         return;
     }
 
     try {
         const response = await fetch(getStatsDataUrl());
 
         if (!response.ok) {
             throw new Error(`Failed to load stats matches: ${response.status}`);
         }
 
         const data = await response.json();
         state.matches = Array.isArray(data.matches) ? data.matches : [];
     } catch (error) {
         console.error(error);
         state.matches = [];
     }
 }
 
 async function bootstrap() {
     await loadMatches();
     initInteractions();
     renderAll();
 }
 
 window.addEventListener("ratingschange", () => {
     renderAll();
 });
 
 bootstrap();
