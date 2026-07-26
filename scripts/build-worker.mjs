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

html = html
  .replace(/<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/, "")
  .replace(/<link rel="stylesheet" crossorigin href="\/assets\/[^"]+">/, "")
  .replace("</head>", "<style>" + css + "</style></head>")
  .replace("</body>", "<script type=\"module\">" + js + "</script></body>");

const worker = `const html = ${JSON.stringify(html)};
const bearImage = Uint8Array.from(atob(${JSON.stringify(image)}), (char) => char.charCodeAt(0));

export default {
  async fetch(request) {
    const url = new URL(request.url);

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
