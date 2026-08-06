import { getD1 } from "@/db";
import { initializeDatabase, REFRESH_NOTE } from "@/db/initialize";
import { vancouverNow } from "./vancouver";

export type RefreshOutcome = {
  refreshed: boolean;
  reason?: string;
  status: {
    refreshedAt: string;
    source: string;
    mode: string;
    liveAvailabilityConnected: boolean;
    manualRefreshConnected: boolean;
    note: string;
  };
};

/**
 * Refreshes the dashboard's status row.
 *
 * `force` is set for manual refreshes. Scheduled runs leave it false so a
 * Vancouver calendar day only ever records one scheduled refresh, even if the
 * cron fires more than once (a retry, or an operator re-running it).
 */
export async function runRefresh(source: string, force: boolean): Promise<RefreshOutcome> {
  await initializeDatabase();
  const db = getD1();
  const { date, timestamp } = vancouverNow();

  const previous = await db
    .prepare("SELECT refreshed_date_vancouver FROM refresh_status WHERE id = 'primary'")
    .first<{ refreshed_date_vancouver: string }>();

  if (!force && previous?.refreshed_date_vancouver === date) {
    const current = await readStatus();
    return { refreshed: false, reason: `already refreshed today (${date})`, status: current };
  }

  await db
    .prepare(
      `UPDATE refresh_status SET
        refreshed_at = ?, refreshed_date_vancouver = ?, source = ?,
        note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = 'primary'`
    )
    .bind(timestamp, date, source, REFRESH_NOTE)
    .run();

  return { refreshed: true, status: await readStatus() };
}

export async function readStatus() {
  const row = await getD1()
    .prepare("SELECT * FROM refresh_status WHERE id = 'primary'")
    .first<{
      refreshed_at: string;
      source: string;
      mode: string;
      live_availability_connected: number;
      manual_refresh_connected: number;
      note: string;
    }>();

  return {
    refreshedAt: row?.refreshed_at ?? "",
    source: row?.source ?? "",
    mode: row?.mode ?? "sample-data-refresh",
    liveAvailabilityConnected: Boolean(row?.live_availability_connected),
    manualRefreshConnected: Boolean(row?.manual_refresh_connected),
    note: row?.note ?? "",
  };
}
