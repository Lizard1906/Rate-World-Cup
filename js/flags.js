let teamFlagByName = new Map();

function buildTeamFlagMap(teams) {
    teamFlagByName = new Map(
        teams.map((team) => [team.name.trim().toLowerCase(), team.flag_icon || team.name]),
    );
}

function getTeamFlag(teamName) {
    if (!teamName) {
        return "-";
    }

    return teamFlagByName.get(teamName.trim().toLowerCase()) ?? teamName
}

function emojiToTwemojiUrl(emoji) {
    const codePoints = Array.from(emoji)
        .map((character) => character.codePointAt(0).toString(16))
        .join("-");

    return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codePoints}.svg`;
}

function renderTeamFlag(teamName) {
    const flagIcon = getTeamFlag(teamName);

    if (!flagIcon || flagIcon === teamName) {
        return `<span class="team-flag-fallback" aria-label="${teamName}">${teamName}</span>`;
    }

    return `<img class="team-flag" src="${emojiToTwemojiUrl(flagIcon)}" alt="${teamName}" loading="lazy">`;
}
