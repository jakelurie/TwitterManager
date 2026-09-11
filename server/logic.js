import twitterText from "twitter-text";
export function validCaption(text) {
  return (
    typeof text === "string" &&
    text.trim().length > 0 &&
    twitterText.parseTweet(text).valid
  );
}
export function nextSlot(settings, posts, now = Date.now()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = (t) =>
    Object.fromEntries(
      formatter.formatToParts(t).map((p) => [p.type, p.value]),
    );
  const day = (p) => `${p.year}-${p.month}-${p.day}`;
  const active = posts.filter(
    (p) => !["cancelled", "failed"].includes(p.status),
  );
  let start = Math.ceil((now + 3600000) / 1800000) * 1800000;
  for (let t = start; t < start + 30 * 86400000; t += 1800000) {
    const p = parts(t),
      hour = +p.hour;
    if (hour < settings.startHour || hour >= settings.endHour) continue;
    if (
      active.filter((x) => day(parts(new Date(x.scheduledAt))) === day(p))
        .length >= settings.dailyLimit
    )
      continue;
    if (
      active.some(
        (x) => Math.abs(new Date(x.scheduledAt).getTime() - t) < 3 * 3600000,
      )
    )
      continue;
    return new Date(t).toISOString();
  }
  throw new Error(
    "No available slots in the next 30 days. Adjust your posting window.",
  );
}
