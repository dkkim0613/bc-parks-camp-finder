import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const eventName = process.env.GITHUB_EVENT_NAME ?? "local";
const force = process.env.FORCE_REFRESH === "true";
const now = new Date();
const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Vancouver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
}).formatToParts(now);

const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
const today = `${value("year")}-${value("month")}-${value("day")}`;
const statusPath = join("public", "refresh-status.json");

// GitHub's cron scheduler can fire hours late, so we don't gate on a specific
// Vancouver hour. Instead the schedule runs hourly around midnight Vancouver
// and this guard makes sure only the first run of each Vancouver calendar
// day actually refreshes (later hourly runs that day are no-ops).
if (!force && existsSync(statusPath)) {
  try {
    const previous = JSON.parse(readFileSync(statusPath, "utf8"));
    if (previous.refreshedDateVancouver === today) {
      console.log(`Skip refresh: already refreshed today (${today}).`);
      process.exit(0);
    }
  } catch {
    // Unreadable/corrupt status file: fall through and refresh anyway.
  }
}

const refreshedAt = `${today} ${value("hour")}:${value("minute")}:${value("second")} America/Vancouver`;
const payload = {
  refreshedAt,
  refreshedDateVancouver: today,
  source:
    eventName === "schedule"
      ? "GitHub Actions scheduled refresh"
      : eventName === "repository_dispatch"
        ? "GitHub Actions manual site refresh"
        : eventName === "workflow_dispatch"
          ? "GitHub Actions manual refresh"
          : "Local refresh",
  mode: "sample-data-refresh",
  liveAvailabilityConnected: false,
  manualRefreshConnected: true,
  note:
    "GitHub automation refreshed the dashboard metadata. Live BC Parks availability collection is not connected yet because direct public scraping still needs an approved server-side collector.",
  criteria: {
    origin: "1015 Howie Ave",
    partySize: 4,
    campsiteRule: "single-site only; exclude double, paired, two-site, 2-site, and multi-site results",
    cabinRule: "cabins listed separately",
    windowDays: 90,
  },
};

mkdirSync("public", { recursive: true });
writeFileSync(statusPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote public/refresh-status.json at ${refreshedAt}`);
