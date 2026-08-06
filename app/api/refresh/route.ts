import { initializeDatabase } from "@/db/initialize";
import { readStatus, runRefresh } from "@/lib/refresh";

export const dynamic = "force-dynamic";

export async function GET() {
  await initializeDatabase();
  return Response.json(await readStatus());
}

export async function POST() {
  const outcome = await runRefresh("Manual dashboard refresh", true);
  return Response.json({
    message: outcome.refreshed
      ? "Dashboard metadata refreshed."
      : `Skipped: ${outcome.reason}.`,
    status: outcome.status,
  });
}
