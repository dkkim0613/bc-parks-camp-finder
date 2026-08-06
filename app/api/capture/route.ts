import { getD1 } from "@/db";
import { initializeDatabase } from "@/db/initialize";
import type { CapturePayload } from "@/lib/bcparks-capture";

export const dynamic = "force-dynamic";

/**
 * The capture bookmarklet runs on camping.bcparks.ca and posts here, so this
 * route answers cross-origin requests. It only ever accepts availability rows
 * the user already had on screen — there is nothing sensitive to protect behind
 * an origin check, and the response carries no credentials.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type CapturedRowRecord = {
  id: string;
  name: string;
  category: string;
  level: string;
  availability: string;
  available: number;
  start_date: string;
  end_date: string;
  nights: string;
  source_url: string;
  captured_at: string;
};

/** Returns the most recent capture, newest first. */
export async function GET() {
  await initializeDatabase();
  const result = await getD1()
    .prepare(
      `SELECT * FROM captured_availability
       ORDER BY captured_at DESC, available DESC, name ASC
       LIMIT 500`
    )
    .all<CapturedRowRecord>();

  return Response.json({ rows: result.results }, { headers: CORS });
}

/**
 * Accepts a payload produced by the capture bookmarklet.
 *
 * A capture replaces any earlier capture for the same drill-down level and date
 * range, so re-running the bookmarklet after a fresh BC Parks search updates
 * that view instead of stacking duplicates.
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as CapturePayload | null;

  if (!payload || !Array.isArray(payload.rows)) {
    return Response.json(
      { message: "Expected the JSON produced by the capture bookmarklet." },
      { status: 400, headers: CORS }
    );
  }
  if (payload.rows.length === 0) {
    return Response.json(
      { message: "That capture had no result rows. Run it on a BC Parks results page in list view." },
      { status: 400, headers: CORS }
    );
  }

  await initializeDatabase();
  const db = getD1();

  const level = String(payload.pageTitle ?? "").slice(0, 200);
  const search = payload.search ?? {
    startDate: "",
    endDate: "",
    nights: "",
    equipment: "",
    resultsLabel: "",
  };
  const startDate = String(search.startDate ?? "");
  const endDate = String(search.endDate ?? "");
  const capturedAt = String(payload.capturedAt ?? new Date().toISOString());
  const sourceUrl = String(payload.sourceUrl ?? "").slice(0, 2000);

  await db
    .prepare(
      `DELETE FROM captured_availability
       WHERE level = ? AND start_date = ? AND end_date = ?`
    )
    .bind(level, startDate, endDate)
    .run();

  const statements = payload.rows.slice(0, 500).map((row) => {
    const name = String(row.name ?? "").slice(0, 300);
    return db
      .prepare(
        `INSERT OR REPLACE INTO captured_availability (
          id, name, category, level, availability, available,
          start_date, end_date, nights, equipment, source_url, captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `${level}|${startDate}|${endDate}|${name}`,
        name,
        String(row.category ?? "").slice(0, 100),
        level,
        String(row.availability ?? "").slice(0, 200),
        row.available ? 1 : 0,
        startDate,
        endDate,
        String(search.nights ?? "").slice(0, 20),
        String(search.equipment ?? "").slice(0, 200),
        sourceUrl,
        capturedAt
      );
  });

  await db.batch(statements);

  const availableCount = payload.rows.filter((row) => row.available).length;
  return Response.json({
    message: `Captured ${payload.rows.length} row(s) from "${level || "BC Parks"}" · ${availableCount} available.`,
    stored: payload.rows.length,
    available: availableCount,
  }, { headers: CORS });
}
