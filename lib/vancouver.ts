/**
 * Vancouver wall-clock helpers.
 *
 * The dashboard's "last checked" stamp is always expressed in the user's local
 * park-planning timezone, never UTC, so both the cron handler and the manual
 * refresh route format time through here.
 */
export function vancouverNow(now: Date = new Date()) {
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

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const clock = `${value("hour")}:${value("minute")}:${value("second")}`;

  return { date, clock, timestamp: `${date} ${clock} America/Vancouver` };
}
