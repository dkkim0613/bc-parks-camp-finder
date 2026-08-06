import { getD1 } from "@/db";
import { initializeDatabase } from "@/db/initialize";
import { rowToStay, type StayRow } from "@/app/types";

export const dynamic = "force-dynamic";

export async function GET() {
  await initializeDatabase();
  const result = await getD1()
    .prepare("SELECT * FROM stays ORDER BY drive_minutes ASC, distance_km ASC")
    .all<StayRow>();

  return Response.json({ stays: result.results.map(rowToStay) });
}
