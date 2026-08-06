export type StayType = "campsite" | "cabin";
export type DateRange = "30" | "60" | "90" | "weekend";
export type FireStatus = "allowed" | "restricted" | "unknown";

export type StayOption = {
  id: string;
  type: StayType;
  park: string;
  area: string;
  distanceKm: number;
  driveMinutes: number;
  earliest: string;
  availableDates: string[];
  availableDateOffsets: number[];
  nights: string;
  weekend: boolean;
  maxParty: number;
  tents?: string;
  siteKind?: string;
  price: string;
  priceNote: string;
  facilities: string[];
  activities: string[];
  fireStatus: FireStatus;
  cooking: string;
  sourceUrl: string;
  bookingUrl: string;
  fireUrl: string;
};

export type BookingPreset = {
  bookingType: "Campsite" | "Cabin";
  parkSearch: string;
  arrival: string;
  departure: string;
  equipment: string;
  partySize: string;
};

export type RefreshStatus = {
  refreshedAt: string;
  source: string;
  mode: string;
  liveAvailabilityConnected: boolean;
  manualRefreshConnected?: boolean;
  note: string;
};

/** Raw `stays` row as stored in D1. */
export type StayRow = {
  id: string;
  type: string;
  park: string;
  area: string;
  distance_km: number;
  drive_minutes: number;
  earliest: string;
  available_dates: string;
  available_date_offsets: string;
  nights: string;
  weekend: number;
  max_party: number;
  tents: string | null;
  site_kind: string | null;
  price: string;
  price_note: string;
  facilities: string;
  activities: string;
  fire_status: string;
  cooking: string;
  source_url: string;
  booking_url: string;
  fire_url: string;
};

function parseJsonArray<T>(value: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function rowToStay(row: StayRow): StayOption {
  return {
    id: row.id,
    type: row.type === "cabin" ? "cabin" : "campsite",
    park: row.park,
    area: row.area,
    distanceKm: row.distance_km,
    driveMinutes: row.drive_minutes,
    earliest: row.earliest,
    availableDates: parseJsonArray<string>(row.available_dates, []),
    availableDateOffsets: parseJsonArray<number>(row.available_date_offsets, []),
    nights: row.nights,
    weekend: Boolean(row.weekend),
    maxParty: row.max_party,
    tents: row.tents ?? undefined,
    siteKind: row.site_kind ?? undefined,
    price: row.price,
    priceNote: row.price_note,
    facilities: parseJsonArray<string>(row.facilities, []),
    activities: parseJsonArray<string>(row.activities, []),
    fireStatus:
      row.fire_status === "allowed" || row.fire_status === "restricted"
        ? row.fire_status
        : "unknown",
    cooking: row.cooking,
    sourceUrl: row.source_url,
    bookingUrl: row.booking_url,
    fireUrl: row.fire_url,
  };
}
