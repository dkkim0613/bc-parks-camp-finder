import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
const vancouverHour = Number(value("hour"));

if (!force && vancouverHour !== 6) {
  console.log(`Skip refresh: Vancouver hour is ${vancouverHour}, not 6.`);
  process.exit(0);
}

const refreshedAt = `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}:${value("second")} America/Vancouver`;
const payload = {
  refreshedAt,
  source: "GitHub Actions scheduled refresh",
  mode: "sample-data-refresh",
  liveAvailabilityConnected: false,
  note:
    "GitHub automation refreshed the dashboard metadata. Live BC Parks availability collection is not connected yet.",
  criteria: {
    origin: "1015 Howie Ave",
    partySize: 4,
    campsiteRule: "single-site only; exclude double, paired, two-site, 2-site, and multi-site results",
    cabinRule: "cabins listed separately",
    windowDays: 90,
  },
};

mkdirSync("public", { recursive: true });
writeFileSync(join("public", "refresh-status.json"), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote public/refresh-status.json at ${refreshedAt}`);
