import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const dist = resolve("dist");
const base = "/Baakanya";

const routes = [
  "/tools/convert",
  "/tools/career",
  "/tools/invoice",
  "/tools/editor",
  "/workspace",
  "/workspace/history",
  "/account",
  "/access",
  "/auth",
  "/payment",
  "/admin",
  "/tools",
  "/how-it-works",
  "/pricing",
  "/about",
];

const indexHtml = readFileSync(resolve(dist, "index.html"), "utf8");

for (const route of routes) {
  const file = resolve(dist, `.${route}`, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, indexHtml, "utf8");
}

const redirect404 = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <title>Opening Baakanya…</title>
    <script>
      (function () {
        var base = "${base}";
        var path =
          window.location.pathname.indexOf(base) === 0
            ? window.location.pathname.slice(base.length)
            : window.location.pathname;
        var route = path + window.location.search + window.location.hash;
        if (!route || route === "/") {
          window.location.replace(base + "/");
          return;
        }
        window.location.replace(base + "/?route=" + encodeURIComponent(route));
      })();
    </script>
  </head>
  <body></body>
</html>
`;

writeFileSync(resolve(dist, "404.html"), redirect404, "utf8");
writeFileSync(resolve(dist, ".nojekyll"), "", "utf8");

console.log(
  `GitHub Pages SPA fallbacks ready: ${routes.length} routes + 404 redirect.`,
);
