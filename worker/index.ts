/** Cloudflare Worker entry point for the BC Parks Camp Finder. */
import handler from "vinext/server/app-router-entry";
import { runRefresh } from "../lib/refresh";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },

  // The previous GitHub Actions `schedule:` trigger was observed firing 5-11
  // hours late on every run, so the old refresh script's "is it 6 AM in
  // Vancouver?" guard rejected every scheduled run and the dashboard never
  // refreshed on its own. Cloudflare Cron Triggers keep far tighter timing,
  // so the schedule now lives here (see wrangler.toml `[triggers]`).
  async scheduled(
    _event: ScheduledController,
    _env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const outcome = await runRefresh("Cloudflare Cron scheduled refresh", false);
        console.log(
          outcome.refreshed
            ? `[scheduled] refreshed at ${outcome.status.refreshedAt}`
            : `[scheduled] skipped: ${outcome.reason}`
        );
      })()
    );
  },
};

export default worker;
