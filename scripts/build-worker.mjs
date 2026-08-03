import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
let html = readFileSync(join(dist, "index.html"), "utf8");
const cssName = html.match(/href="\/assets\/([^"]+\.css)"/)?.[1];
const jsName = html.match(/src="\/assets\/([^"]+\.js)"/)?.[1];

if (!cssName || !jsName) {
  throw new Error("Could not find Vite CSS/JS assets in dist/index.html");
}

const css = readFileSync(join(dist, "assets", cssName), "utf8");
const js = readFileSync(join(dist, "assets", jsName), "utf8");
const image = readFileSync(join(dist, "bc-forest-bear.png")).toString("base64");
const refreshStatus = readFileSync(join("public", "refresh-status.json"), "utf8");

html = html
  .replace(/<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/, "")
  .replace(/<link rel="stylesheet" crossorigin href="\/assets\/[^"]+">/, "")
  .replace("</head>", "<style>" + css + "</style></head>")
  .replace("</body>", "<script type=\"module\">" + js + "</script></body>");

const worker = `const html = ${JSON.stringify(html)};
const bearImage = Uint8Array.from(atob(${JSON.stringify(image)}), (char) => char.charCodeAt(0));
const refreshStatus = ${JSON.stringify(refreshStatus)};

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }
});

async function triggerGithubRefresh(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, message: "Use POST to trigger a refresh." }, 405);
  }

  const token = env?.GITHUB_REFRESH_TOKEN || env?.GH_REFRESH_TOKEN;
  if (!token) {
    return json({
      ok: false,
      code: "missing_token",
      message: "Manual refresh is wired, but the Sites deployment needs a server-side GITHUB_REFRESH_TOKEN secret to trigger GitHub Actions from the public dashboard."
    }, 501);
  }

  const response = await fetch(
    "https://api.github.com/repos/dkkim0613/bc-parks-camp-finder/actions/workflows/daily-refresh.yml/dispatches",
    {
      method: "POST",
      headers: {
        "authorization": "Bearer " + token,
        "accept": "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "bc-parks-camp-finder"
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { force: "true" }
      })
    }
  );

  if (!response.ok) {
    return json({
      ok: false,
      code: "github_dispatch_failed",
      message: "GitHub Actions did not accept the refresh request.",
      status: response.status
    }, response.status);
  }

  return json({
    ok: true,
    message: "GitHub refresh workflow started. The dashboard status updates after the workflow commits and redeploys."
  }, 202);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/refresh") {
      return triggerGithubRefresh(request, env);
    }

    if (url.pathname === "/refresh-status.json") {
      return new Response(refreshStatus, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (url.pathname === "/bc-forest-bear.png") {
      return new Response(bearImage, {
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=31536000, immutable"
        }
      });
    }

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};
`;

writeFileSync(join(dist, "index.js"), worker);
