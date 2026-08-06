import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One bookable stay option (a campsite loop or a cabin) at a BC Parks park.
 *
 * `availableDates` / `availableDateOffsets` are JSON-encoded arrays kept in
 * lockstep: index N of the offsets array is the day-offset from "today" for
 * the label at index N of the dates array. They stay JSON rather than a child
 * table because the dashboard always reads and replaces a stay's whole date
 * set at once, never a single date.
 */
export const stays = sqliteTable("stays", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // "campsite" | "cabin"
  park: text("park").notNull(),
  area: text("area").notNull(),
  distanceKm: integer("distance_km").notNull(),
  driveMinutes: integer("drive_minutes").notNull(),
  earliest: text("earliest").notNull(),
  availableDates: text("available_dates").notNull().default("[]"),
  availableDateOffsets: text("available_date_offsets").notNull().default("[]"),
  nights: text("nights").notNull(),
  weekend: integer("weekend").notNull().default(0),
  maxParty: integer("max_party").notNull().default(4),
  tents: text("tents"),
  siteKind: text("site_kind"),
  price: text("price").notNull(),
  priceNote: text("price_note").notNull().default(""),
  facilities: text("facilities").notNull().default("[]"),
  activities: text("activities").notNull().default("[]"),
  fireStatus: text("fire_status").notNull().default("unknown"),
  cooking: text("cooking").notNull().default(""),
  sourceUrl: text("source_url").notNull(),
  bookingUrl: text("booking_url").notNull(),
  fireUrl: text("fire_url").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Availability rows captured from a BC Parks results page the user already had
 * open in their own browser (see lib/bcparks-capture.ts).
 *
 * `level` records which drill-down the capture came from, because BC Parks
 * reuses one list component for regions, parks, and individual sites — a row
 * named "Northern" is a region, "Alice Lake" a park, "Site 42" a site.
 */
export const capturedAvailability = sqliteTable("captured_availability", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  level: text("level").notNull().default(""),
  availability: text("availability").notNull().default(""),
  available: integer("available").notNull().default(0),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  nights: text("nights").notNull().default(""),
  equipment: text("equipment").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  capturedAt: text("captured_at").notNull(),
});

/**
 * Single-row table (id = 'primary') tracking when the dashboard last refreshed.
 *
 * This replaces the old public/refresh-status.json file that the GitHub Actions
 * workflow used to rewrite and commit on every run.
 */
export const refreshStatus = sqliteTable("refresh_status", {
  id: text("id").primaryKey(),
  refreshedAt: text("refreshed_at").notNull(),
  refreshedDateVancouver: text("refreshed_date_vancouver").notNull(),
  source: text("source").notNull(),
  mode: text("mode").notNull().default("sample-data-refresh"),
  liveAvailabilityConnected: integer("live_availability_connected").notNull().default(0),
  manualRefreshConnected: integer("manual_refresh_connected").notNull().default(1),
  note: text("note").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
