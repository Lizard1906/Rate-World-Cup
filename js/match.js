const DATA_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const TEAMS_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.teams.json";
const MATCHES_STORAGE_KEY = "rate-wc-matches";
const TEAMS_STORAGE_KEY = "rate-wc-teams";
const RATE_STORAGE_KEY = "rate-wc-rates";

const params = new URLSearchParams(window.location.search);

const matchId = params.get("id");


const teams = JSON.parse(
    localStorage.getItem(TEAMS_STORAGE_KEY) || "[]"
);
buildTeamFlagMap(teams);

const matches = JSON.parse(
    localStorage.getItem(MATCHES_STORAGE_KEY) || "[]"
);

const match = matches.find(
    (m) => m.id === matchId
);

function formatScore(match) {
    const home = match?.score?.ft?.[0];
    const away = match?.score?.ft?.[1];

    if (Number.isFinite(home) && Number.isFinite(away)) {
        return `${home} x ${away}`;
    }

    return "vs";
}

function compareMinutes(minuteAstr, minuteBstr) {
    let minuteA, minuteB;

    if (minuteAstr.includes('+')) {  
        const parts = minuteAstr.split('+');
        minuteA = parseInt(parts[0], 10) + parseInt(parts[1], 10);
    } else {
        minuteA = parseInt(minuteAstr, 10);
    }

    if (minuteBstr.includes('+')) {
        const parts = minuteBstr.split('+');
        minuteB = parseInt(parts[0], 10) + parseInt(parts[1], 10);
    } else {
        minuteB = parseInt(minuteBstr, 10);
    }

    return minuteA - minuteB;

}

function renderGoals(match) {
    const goals1 = (match.goals1 || []).map(g => ({ ...g, team: 1 }));
    const goals2 = (match.goals2 || []).map(g => ({ ...g, team: 2 }));

    const allGoals = [...goals1, ...goals2].sort((a, b) => compareMinutes(a.minute, b.minute));

    if (!allGoals.length) return "";

    return `
        <div class="goals-timeline">
        ${allGoals.map(goal => {
            const flags = [];
            if (goal.penalty) flags.push("(P)");
            if (goal.owngoal) flags.push("(OG)");

            return `
                <div class="goal-row ${goal.team === 1 ? 'home-goal' : 'away-goal'}">
                
                    <div class="goal-content">
                        <span class="pill">
                            ${goal.name} ${flags.length ? ` ${flags.join(", ")}` : ""}
                        </span>
                    </div>

                    <div class="goal-minute">
                        <span>${goal.minute}'</span>
                    </div>

                    <div class="goal-spacer"></div>

                </div>
            `;
        }).join("")}
        </div>
  `;
}


document.getElementById("match").innerHTML = `
  <div class="page">

    <div class="hero match-hero">

        <p class="eyebrow">World Cup 2026</p>

        <div class="match-meta">
            <div class="meta-line">
                <span>${match.date}</span>
                <span>•</span>
                <span>${match.time}</span>
            </div>
            <div class="meta-stadium">
                ${match.ground ?? "-"}
            </div>
        </div>

        <div class="match-score">
            <div class="team home">
                ${renderTeamFlag(match.team1)}
                <span class="team-name">${match.team1}</span>
            </div>

            <span class="score big">${formatScore(match)}</span>

            <div class="team away">
                <span class="team-name">${match.team2}</span>
                ${renderTeamFlag(match.team2)}
            </div>
        </div>

        <div class="match-badges">
            <span class="badge">${match.round}</span>
            <span class="badge">${match.group ?? "Group Stage"}</span>
        </div>

        ${renderGoals(match)}
        
    </div>
  </div>
`;