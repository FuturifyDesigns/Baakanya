import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const dist = resolve("dist");

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
    <meta name="referrer" content="no-referrer" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'" />
    <title>Opening Baakanya…</title>
    <link rel="stylesheet" href="/error.css" />
    <script src="/spa-recovery.js"></script>
  </head>
  <body><main><img src="/baakanya-mark.png?v=3" alt="" /><p>Opening Baakanya…</p><a href="/">Return home</a></main></body>
</html>
`;

writeFileSync(resolve(dist, "404.html"), redirect404, "utf8");
console.log(
  `Static SPA fallbacks ready: ${routes.length} routes + 404 redirect.`,
);
