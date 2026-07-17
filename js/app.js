const MATCHES_STORAGE_KEY = "rate-wc-matches";
const TEAMS_STORAGE_KEY = "rate-wc-teams";
// const YEAR_STORAGE_KEY = "rate-wc-year";

const app = document.getElementById("app");
const searchEl = document.getElementById("search");

function getYear() {
    const year = localStorage.getItem(YEAR_STORAGE_KEY);
    return year ? Number(year) : 2026;
}

function getDataUrl() {
    const year = getYear();
    return `https://raw.githubusercontent.com/openfootball/worldcup.json/master/${year}/worldcup.json`;
}

function getTeamsUrl() {
    const year = getYear();
    return `https://raw.githubusercontent.com/openfootball/worldcup.json/master/${year}/worldcup.teams.json`;
}

let allMatches = [];
let allTeams = [];

function convertTeamNameToAlias(teamName) {
    const team = allTeams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
    return team ? team.alias : false;
}

function convertRoundLabel(roundValue) {
    const match = typeof roundValue === "string" ? roundValue.match(/^Matchday\s+(\d+)$/i) : null;

    if (!match) {
        return roundValue.replace(/(^|\s|-)(\w)/g, (_, sep, char) => {
            return sep + char.toUpperCase();
        });
    }

    const roundNumber = Number.parseInt(match[1], 10);

    if (roundNumber >= 1 && roundNumber <= 7) {
        return "Round 1";
    }

    if (roundNumber >= 8 && roundNumber <= 13) {
        return "Round 2";
    }

    if (roundNumber >= 14 && roundNumber <= 17) {
        return "Round 3";
    }

    return roundValue;
}

function normalizeMatch(match, teamsDict) {
    const convertedDateTime = convertTimeToUtcPlusOne(match.date, match.time);

    const roundLabel = convertRoundLabel(match.round);
    const round = roundLabel // remover minusculas e espaços, apenas fica letras maiusculas e números
        .replace(/[^A-Z0-9]/g, "");

    return {
        ...match,
        id: `${getYear()}_WC_${round}_${teamsDict[match.team1.toLowerCase()]}_${teamsDict[match.team2.toLowerCase()]}`,
        round: convertRoundLabel(match.round),
        date: convertedDateTime.date,
        time: convertedDateTime.time,
    };
}

function normalizeMatches(matches, allTeams) {
    // allTeams é lista com name, flag_icon, confederation e alias
    // quero criar um dicionário de nomes de times para alias
    const teamsDict = allTeams.reduce((dict, team) => {
        dict[team.name.toLowerCase()] = team.alias;
        return dict;
    }, {});

    return matches.map((match) => normalizeMatch(match, teamsDict));
}

function normalizeTeams(teams) {
    return teams
        .filter((team) => team?.name)
        .map((team) => ({
            name: team.name,
            flag_icon: team.flag_icon ?? "",
            confederation: team.confed ?? null,
            alias: team.fifa_code ?? "UND",
        }));
}

function parseMatchStart(match) {
    if (!match?.date) {
        return Number.POSITIVE_INFINITY;
    }

    const timeValue = typeof match.time === "string" ? match.time.trim() : "";
    const timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2}))?$/i);

    if (!timeMatch) {
        return Date.parse(`${match.date}T12:00:00Z`);
    }

    const hour = timeMatch[1].padStart(2, "0");
    const minute = timeMatch[2];
    const offset = Number.parseInt(timeMatch[3] ?? "0", 10);
    const normalizedOffset = `${offset >= 0 ? "+" : "-"}${String(Math.abs(offset)).padStart(2, "0")}:00`;

    return Date.parse(`${match.date}T${hour}:${minute}:00${normalizedOffset}`);
}

function formatDate(value) {
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeZone: "UTC",
    }).format(date);
}

function formatScore(match) {
    const home = match?.score?.ft?.[0];
    const away = match?.score?.ft?.[1];

    if (Number.isFinite(home) && Number.isFinite(away)) {
        return `${home} - ${away}`;
    }

    return "vs";
}

function getSearchBlob(match) {
    return [
        match.round,
        match.date,
        match.time,
        match.team1,
        match.team2,
        match.group,
        match.ground,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function getRoundLabel(match) {
    if (!match?.round) {
        return "-";
    }

    return match.group ? `${match.round} - ${match.group}` : match.round;
}

function renderMatch(match, variant) {
    const displayScore = formatScore(match);
    const matchLabel = `${match.team1} vs ${match.team2}`;

    return `
        <article class="match ${variant}">
        <a href="match.html?id=${encodeURIComponent(match.id)}" class="match-link" aria-label="Open match details for ${matchLabel}"></a>
        <div class="match-content">
          <div class="meta">
              <span>${formatDate(match.date)} ${match.time ?? ""}</span>
              <span class="match-group">${getRoundLabel(match)}</span>
          </div>
          <div class="match-line">
              ${renderTeamFlag(match.team1)}
              <span class="score">${displayScore}</span>
              ${renderTeamFlag(match.team2)}
          </div>
        </div>
        ${variant === "to-review" || variant === "reviewed" ? renderRating(match.id, { size: "sm" }) : ""}
        </article>
  `;
}

function renderSection(title, matches, variant, openByDefault) {

    if (!matches.length) {
        return "";
    }

    return `
    <details class="section-card" ${openByDefault ? "open" : ""}>
      <summary class="summary">
        <div class="section-header">
          <h2>${title}</h2>
        </div>
      </summary>
      <div class="section-body">
        <div class="match-grid">
          ${matches.map((match) => renderMatch(match, variant)).join("")}
        </div>
      </div>
    </details>
  `;
}

function render(matches) {
    if (!matches.length) {
        app.innerHTML = "<div class='status'>No matches found</div>";
        return;
    }

    const now = Date.now() + 1* 60 * 60 * 1000; // depois remover o +1h, é só pra teste do fuso horário
    console.log("Current time", new Date(now).toISOString());
    const sorted = [...matches].sort((a, b) => parseMatchStart(a) - parseMatchStart(b));
    const pastMatches = sorted.filter((match) => match.score?.ft?.every(Number.isFinite));
    const toReviewMatches = pastMatches.filter((match) => getRating(match.id) === undefined);
    const reviewedMatches = pastMatches.filter((match) => getRating(match.id) !== undefined);
    const onGoingMatches = sorted.filter((match) => parseMatchStart(match) <= now && !pastMatches.includes(match));
    const projectedMatches = sorted.filter((match) => parseMatchStart(match) >= now && (convertTeamNameToAlias(match.team1) === false || convertTeamNameToAlias(match.team2) === false));
    const upcomingMatches = sorted.filter((match) => parseMatchStart(match) >= now && !projectedMatches.includes(match));

    app.innerHTML = `
    ${renderSection("To Review Matches", toReviewMatches, "to-review", true)}
    ${renderSection("Reviewed Matches", reviewedMatches, "reviewed", false)}
    ${renderSection("Ongoing Matches", onGoingMatches, "ongoing", true)}
    ${renderSection("Upcoming Matches", upcomingMatches, "scheduled", true)}
    ${renderSection("Projected Matches", projectedMatches, "projected", false)}
  `;
}

function applyFilter() {
    const query = searchEl.value.trim().toLowerCase();
    if (!query) {
        render(allMatches);
        return;
    }

    render(allMatches.filter((match) => getSearchBlob(match).includes(query)));
}

async function loadData() {
    try {
        const [matchesResponse, teamsResponse] = await Promise.all([
            fetch(getDataUrl()),
            fetch(getTeamsUrl()),
        ]);

        if (!matchesResponse.ok) {
            throw new Error(`Failed to load JSON for matches: ${matchesResponse.status}`);
        }

        const [matchesData, teamsData] = await Promise.all([
            matchesResponse.json(),
            teamsResponse.ok ? teamsResponse.json() : Promise.resolve(null),
        ]);

        allTeams = normalizeTeams(Array.isArray(teamsData) ? teamsData : []);
        allMatches = normalizeMatches(Array.isArray(matchesData.matches) ? matchesData.matches : [], allTeams);
        buildTeamFlagMap(allTeams);

        localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(allMatches));
        if (allTeams.length) {
            localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(allTeams));
        }

        render(allMatches);
    } catch (error) {
        console.error(error);
        const cachedMatches = localStorage.getItem(MATCHES_STORAGE_KEY);
        const cachedTeams = localStorage.getItem(TEAMS_STORAGE_KEY);

        if (cachedMatches) {
            try {
                allMatches = JSON.parse(cachedMatches);
                if (cachedTeams) {
                    allTeams = JSON.parse(cachedTeams);
                    buildTeamFlagMap(allTeams);
                }
                render(allMatches);
                return;
            } catch (cacheError) {
                console.error(cacheError);
            }
        }

        app.innerHTML = `<div class="status">${error.message}</div>`;
    }
}

searchEl.addEventListener("input", applyFilter);
window.addEventListener("ratingschange", applyFilter);
loadData();
