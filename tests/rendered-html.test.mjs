import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("schedules the daily refresh with a Cloudflare Cron Trigger, not GitHub Actions", async () => {
  const [wrangler, worker] = await Promise.all([
    source("wrangler.toml"),
    source("worker/index.ts"),
  ]);

  assert.match(wrangler, /\[triggers\]/);
  assert.match(wrangler, /crons = \["0 7 \* \* \*"\]/);
  assert.match(worker, /async scheduled\(/);
  assert.match(worker, /runRefresh\("Cloudflare Cron scheduled refresh", false\)/);
});

test("keeps one scheduled refresh per Vancouver calendar day but lets manual force through", async () => {
  const [refresh, route] = await Promise.all([
    source("lib/refresh.ts"),
    source("app/api/refresh/route.ts"),
  ]);

  assert.match(refresh, /refreshed_date_vancouver/);
  assert.match(refresh, /if \(!force && previous\?\.refreshed_date_vancouver === date\)/);
  assert.match(route, /runRefresh\("Manual dashboard refresh", true\)/);
});

test("stores stays in D1 instead of a hardcoded array", async () => {
  const [schema, initialize, page] = await Promise.all([
    source("db/schema.ts"),
    source("db/initialize.ts"),
    source("app/page.tsx"),
  ]);

  assert.match(schema, /export const stays = sqliteTable\("stays"/);
  assert.match(schema, /export const refreshStatus = sqliteTable\("refresh_status"/);
  assert.match(initialize, /porteau-cove-main/);
  assert.match(initialize, /saysutshun-cabin/);
  assert.match(page, /SELECT \* FROM stays/);
  assert.match(page, /force-dynamic/);
});

test("keeps the single-site rule and party cap in the filter chain", async () => {
  const finder = await source("app/camp-finder.tsx");

  assert.match(finder, /double\|paired\|two\[-\\s\]\?site\|2\[-\\s\]\?site\|multi\[-\\s\]\?site/);
  assert.match(finder, /option\.maxParty <= 4/);
  assert.match(finder, /!isMultiSiteBooking\(option\)/);
});

test("captures availability by reading the page instead of fetching BC Parks", async () => {
  const [capture, route, finder] = await Promise.all([
    source("lib/bcparks-capture.ts"),
    source("app/api/capture/route.ts"),
    source("app/camp-finder.tsx"),
  ]);

  // Assert against the bookmarklet body only, so prose in the doc comment
  // cannot satisfy or break these checks.
  const start = capture.indexOf("`", capture.indexOf("CAPTURE_SOURCE")) + 1;
  const body = capture.slice(start, capture.indexOf("`;", start));

  // Selectors below must match the real rendered BC Parks results markup.
  assert.match(body, /\[role="listitem"\]\.list-entry/);
  assert.match(body, /h3\[id\^="map-link-name-"\]/);
  assert.match(body, /\[id\^="availability-"\]/);
  assert.match(body, /\.availability-label/);
  assert.match(body, /cdk-visually-hidden/);

  // Site-level results render each row more than once; without both of these
  // a capture of one campground reported every site twice.
  assert.match(body, /el\.contains\(other\)/);
  assert.match(body, /seen\[row\.name\]/);

  // The bookmarklet may post its findings to our own dashboard, but it must
  // never request anything from BC Parks itself — it only reads the page the
  // user already loaded. Check the executable code with comments stripped, so
  // a mention of the domain in a note is not mistaken for a request to it.
  const code = body.replace(/\/\/[^\n]*/g, "");
  assert.doesNotMatch(code, /bcparks\.ca/);
  assert.doesNotMatch(code, /XMLHttpRequest/);
  assert.match(body, /__CAPTURE_ENDPOINT__/);
  assert.match(body, /navigator\.clipboard/);

  // Cross-origin POST from camping.bcparks.ca needs preflight + CORS headers.
  assert.match(route, /export async function OPTIONS/);
  assert.match(route, /access-control-allow-origin/);

  assert.match(route, /export async function POST/);
  assert.match(route, /captured_availability/);
  assert.match(finder, /CapturePanel/);
  assert.match(finder, /\/api\/capture/);
});

test("ties captured availability to the curated park list", async () => {
  const finder = await source("app/camp-finder.tsx");

  assert.match(finder, /function normalizeParkName/);
  assert.match(finder, /function findCaptureMatch/);
  assert.match(finder, /captureMatches/);
  assert.match(finder, /Live check:/);
  assert.match(finder, /extraCaptured/);
  assert.match(finder, /Freshly captured, not yet in the curated list/);
});

test("normalizeParkName and findCaptureMatch behave correctly against real capture shapes", async () => {
  const finder = await source("app/camp-finder.tsx");

  // Load the two functions as executable code without importing the whole
  // client component (which needs a DOM / React runtime this test doesn't have).
  const extract = (name) => {
    const start = finder.indexOf(`function ${name}`);
    const bodyStart = finder.indexOf("{", start);
    let depth = 0;
    for (let i = bodyStart; i < finder.length; i += 1) {
      if (finder[i] === "{") depth += 1;
      if (finder[i] === "}") {
        depth -= 1;
        if (depth === 0) return finder.slice(start, i + 1);
      }
    }
    throw new Error(`could not extract ${name}`);
  };

  // These functions carry TypeScript parameter types, so transpile them with
  // the real compiler rather than eval'ing TS syntax as if it were JS.
  const tsSource = `${extract("normalizeParkName")}\n${extract("findCaptureMatch")}\nexport { normalizeParkName, findCaptureMatch };`;
  const { outputText } = ts.transpileModule(tsSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const compiledModule = { exports: {} };
  new Function("exports", outputText)(compiledModule.exports);
  const { normalizeParkName, findCaptureMatch } = compiledModule.exports;

  assert.equal(normalizeParkName("Alice Lake Park"), normalizeParkName("Alice Lake"));

  // Real rows captured earlier in this project's history, matched against the
  // curated stays seed (db/initialize.ts).
  const captured = [
    { name: "Alice Lake", captured_at: "2026-08-06T01:24:37.333Z" },
    { name: "Golden Ears", captured_at: "2026-08-06T01:24:37.000Z" },
    { name: "Co12", captured_at: "2026-08-06T01:24:37.333Z" },
    { name: "Sx̱ótsaqel / Chilliwack Lake", captured_at: "2026-08-06T01:24:37.333Z" },
  ];

  assert.equal(findCaptureMatch("Alice Lake Park", captured)?.name, "Alice Lake");
  assert.equal(findCaptureMatch("Golden Ears Park", captured)?.name, "Golden Ears");
  // Porteau Cove was never captured, must not false-match an unrelated row.
  assert.equal(findCaptureMatch("Porteau Cove Park", captured), null);
  // A bare site code must not be mistaken for a park-level capture.
  assert.equal(findCaptureMatch("Cultus Lake Park", captured), null);
});

test("keeps booking handoff manual and never submits payment", async () => {
  const finder = await source("app/camp-finder.tsx");

  assert.match(finder, /never submit payment or final confirmation/);
  assert.match(finder, /complete cart\/payment manually/);
  assert.match(finder, /makeAutofillBookmarklet/);
});
