function parseTimeOffset(timeValue) {
  const match = typeof timeValue === "string" ? timeValue.trim().match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2}))?$/i) : null;

  if (!match) {
    return null;
  }

  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
    offset: Number.parseInt(match[3] ?? "0", 10),
  };
}

function formatUtcPlusOneTime(baseDate) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(baseDate);
}

function convertTimeToUtcPlusOne(dateValue, timeValue) {
  const parsed = parseTimeOffset(timeValue);

  if (!dateValue || !parsed) {
    return { date: dateValue, time: timeValue };
  }

  const baseUtcMs = Date.UTC(
    Number.parseInt(dateValue.slice(0, 4), 10),
    Number.parseInt(dateValue.slice(5, 7), 10) - 1,
    Number.parseInt(dateValue.slice(8, 10), 10),
    parsed.hour,
    parsed.minute,
  ) - parsed.offset * 60 * 60 * 1000;

  const targetMs = baseUtcMs + 1 * 60 * 60 * 1000;
  const targetDate = new Date(targetMs);

  return {
    date: targetDate.toISOString().slice(0, 10),
    time: `${formatUtcPlusOneTime(targetDate)}`,
  };
}
