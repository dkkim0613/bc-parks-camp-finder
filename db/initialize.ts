import { getD1 } from "./index";
import { vancouverNow } from "../lib/vancouver";

/**
 * Seed stays carried over verbatim from the pre-migration hardcoded
 * `options` array in src/main.tsx. Column order matches the INSERT below.
 */
const staySeeds: Array<Array<string | number | null>> = [
  [
    "porteau-cove-main", "campsite", "Porteau Cove Park", "Oceanfront campsites",
    47, 45, "Aug 7",
    JSON.stringify(["Aug 7-8", "Aug 18", "Sep 3-5", "Sep 21"]),
    JSON.stringify([4, 15, 31, 49]),
    "1-2 nights", 1, 4, "1-3 tents", "Standard single site",
    "~$41-$59 CAD total",
    "1 night estimate: camping fee + $6 reservation fee; non-residents add $20",
    JSON.stringify(["Flush toilets", "Showers", "Drinking water", "Boat launch"]),
    JSON.stringify(["Ocean views", "Kayaking", "Diving", "Short shoreline walks"]),
    "restricted",
    "Gas/propane stove likely okay; confirm bulletin before travel",
    "https://bcparks.ca/porteau-cove-park/",
    "https://camping.bcparks.ca/",
    "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  ],
  [
    "alice-lake-camping", "campsite", "Alice Lake Park", "Family campground",
    78, 75, "Aug 13",
    JSON.stringify(["Aug 13", "Aug 27-28", "Sep 9-11", "Oct 2-3"]),
    JSON.stringify([10, 24, 37, 60]),
    "1-3 nights", 1, 4, "1-3 tents", "Standard single site",
    "~$47-$65 CAD total",
    "1 night estimate: camping fee + $6 reservation fee; non-residents add $20",
    JSON.stringify(["Flush toilets", "Showers", "Drinking water", "Playground"]),
    JSON.stringify(["Lake swimming", "Hiking", "Biking nearby", "Family beach time"]),
    "restricted",
    "Use contained camp stove; campfires depend on current order",
    "https://bcparks.ca/alice-lake-park/",
    "https://camping.bcparks.ca/",
    "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  ],
  [
    "golden-ears-alouette", "campsite", "Golden Ears Park", "Alouette Lake area",
    61, 70, "Aug 20",
    JSON.stringify(["Aug 20", "Sep 6-7", "Sep 17-19", "Oct 4"]),
    JSON.stringify([17, 34, 45, 62]),
    "1-2 nights", 1, 4, "1-3 tents", "Double site",
    "~$47-$65 CAD total",
    "Excluded by default: double-site booking would roughly double site fees",
    JSON.stringify(["Pit/flush toilets", "Drinking water", "Boat launch", "Picnic areas"]),
    JSON.stringify(["Lake paddling", "Beach", "Waterfalls", "Trail network"]),
    "unknown",
    "Check park advisory and fire centre before using open flame",
    "https://bcparks.ca/golden-ears-park/",
    "https://camping.bcparks.ca/",
    "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  ],
  [
    "cultus-lake-cabin", "cabin", "Cultus Lake Park", "Cabin-style stays",
    103, 90, "Sep 8",
    JSON.stringify(["Sep 8-10", "Sep 24", "Oct 6-8"]),
    JSON.stringify([36, 52, 64]),
    "1-3 nights", 0, 4, null, "Cabin",
    "~$96-$146 CAD total",
    "1 night cabin estimate + $6 reservation fee; non-residents add $20",
    JSON.stringify(["Nearby washrooms", "Lake access", "Picnic areas", "Family amenities"]),
    JSON.stringify(["Swimming", "Paddling", "Easy walks", "Nearby family attractions"]),
    "restricted",
    "Cabin cooking rules vary; verify appliance and flame rules",
    "https://bcparks.ca/cultus-lake-park/",
    "https://camping.bcparks.ca/",
    "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  ],
  [
    "saysutshun-cabin", "cabin", "Saysutshun Newcastle Island Park", "Group-friendly cabin options",
    82, 125, "Aug 29",
    JSON.stringify(["Aug 29-30", "Sep 15-17", "Oct 10"]),
    JSON.stringify([26, 43, 68]),
    "1-2 nights", 1, 4, null, "Cabin",
    "~$86-$136 CAD total",
    "1 night cabin estimate + $6 reservation fee; ferry/park extras not included",
    JSON.stringify(["Ferry access", "Flush toilets", "Picnic areas", "Food nearby seasonally"]),
    JSON.stringify(["Island walks", "Beaches", "Cycling", "Harbour views"]),
    "allowed",
    "Contained stove preferred; confirm local island/park restrictions",
    "https://bcparks.ca/saysutshun-newcastle-island-marine-park/",
    "https://camping.bcparks.ca/",
    "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  ],
];

export const REFRESH_NOTE =
  "Cloudflare Cron refreshed the dashboard metadata. Live BC Parks availability collection is not connected yet because camping.bcparks.ca sits behind an Azure WAF bot challenge that blocks automated reads.";

let initialized = false;

/** Creates the schema on first use and seeds the starting stay list. */
export async function initializeDatabase() {
  if (initialized) return;
  const db = getD1();

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS stays (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      park TEXT NOT NULL,
      area TEXT NOT NULL,
      distance_km INTEGER NOT NULL,
      drive_minutes INTEGER NOT NULL,
      earliest TEXT NOT NULL,
      available_dates TEXT NOT NULL DEFAULT '[]',
      available_date_offsets TEXT NOT NULL DEFAULT '[]',
      nights TEXT NOT NULL,
      weekend INTEGER NOT NULL DEFAULT 0,
      max_party INTEGER NOT NULL DEFAULT 4,
      tents TEXT,
      site_kind TEXT,
      price TEXT NOT NULL,
      price_note TEXT NOT NULL DEFAULT '',
      facilities TEXT NOT NULL DEFAULT '[]',
      activities TEXT NOT NULL DEFAULT '[]',
      fire_status TEXT NOT NULL DEFAULT 'unknown',
      cooking TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL,
      booking_url TEXT NOT NULL,
      fire_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS captured_availability (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL DEFAULT '',
      availability TEXT NOT NULL DEFAULT '',
      available INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      nights TEXT NOT NULL DEFAULT '',
      equipment TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      captured_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS refresh_status (
      id TEXT PRIMARY KEY,
      refreshed_at TEXT NOT NULL,
      refreshed_date_vancouver TEXT NOT NULL,
      source TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'sample-data-refresh',
      live_availability_connected INTEGER NOT NULL DEFAULT 0,
      manual_refresh_connected INTEGER NOT NULL DEFAULT 1,
      note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
  ]);

  await db.batch(
    staySeeds.map((seed) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO stays (
            id, type, park, area, distance_km, drive_minutes, earliest,
            available_dates, available_date_offsets, nights, weekend, max_party,
            tents, site_kind, price, price_note, facilities, activities,
            fire_status, cooking, source_url, booking_url, fire_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(...seed)
    )
  );

  const { timestamp, date } = vancouverNow();
  await db
    .prepare(
      `INSERT OR IGNORE INTO refresh_status (
        id, refreshed_at, refreshed_date_vancouver, source, mode,
        live_availability_connected, manual_refresh_connected, note
      ) VALUES ('primary', ?, ?, 'Initial seed', 'sample-data-refresh', 0, 1, ?)`
    )
    .bind(timestamp, date, REFRESH_NOTE)
    .run();

  initialized = true;
}
