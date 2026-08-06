import { getD1 } from "@/db";
import { initializeDatabase } from "@/db/initialize";
import CampFinder, { type CapturedRowRecord } from "./camp-finder";
import type { RefreshStatus, StayOption, StayRow } from "./types";
import { rowToStay } from "./types";

// The page renders per-request D1 state, so it must not be statically cached.
export const dynamic = "force-dynamic";

export default async function Home() {
  await initializeDatabase();
  const db = getD1();

  const [stayResult, status, capturedResult] = await Promise.all([
    db.prepare("SELECT * FROM stays ORDER BY drive_minutes ASC, distance_km ASC").all<StayRow>(),
    db.prepare("SELECT * FROM refresh_status WHERE id = 'primary'").first<{
      refreshed_at: string;
      source: string;
      mode: string;
      live_availability_connected: number;
      manual_refresh_connected: number;
      note: string;
    }>(),
    db
      .prepare(
        `SELECT * FROM captured_availability
         ORDER BY captured_at DESC, available DESC, name ASC
         LIMIT 500`
      )
      .all<CapturedRowRecord>(),
  ]);

  const stays: StayOption[] = stayResult.results.map(rowToStay);
  const refreshStatus: RefreshStatus | null = status
    ? {
        refreshedAt: status.refreshed_at,
        source: status.source,
        mode: status.mode,
        liveAvailabilityConnected: Boolean(status.live_availability_connected),
        manualRefreshConnected: Boolean(status.manual_refresh_connected),
        note: status.note,
      }
    : null;

  return (
    <CampFinder
      stays={stays}
      initialRefreshStatus={refreshStatus}
      initialCaptured={capturedResult.results}
    />
  );
}
