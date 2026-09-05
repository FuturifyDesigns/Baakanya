import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

const publicFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else publicFiles.push(path);
  }
};
walk(dist);

const forbiddenNames = /(?:^|[\\/])(?:\.git|\.env|readme(?:\.md)?|package-lock\.json|vite\.config\.[^\\/]+|\.github)(?:$|[\\/])/i;
const forbiddenExtensions = /\.(?:map|yml|yaml)$/i;
const forbiddenDisclosure =
  /github pages|futurifydesigns\.github\.io|x-github|x-fastly|x-served-by:\s*cache-|server:\s*github\.com/i;
for (const path of publicFiles) {
  const relativePath = path.slice(dist.length + 1);
  if (forbiddenNames.test(relativePath) || forbiddenExtensions.test(relativePath)) {
    throw new Error(`Forbidden public build artifact: ${relativePath}`);
  }
  if (/\.(?:html|css|js|txt|xml)$/i.test(path)) {
    const contents = readFileSync(path, "utf8");
    if (forbiddenDisclosure.test(contents)) {
      throw new Error(`Origin disclosure found in public artifact: ${relativePath}`);
    }
  }
}

for (const required of [
  "404.html",
  "robots.txt",
  "sitemap.xml",
  ".well-known/security.txt",
]) {
  if (!publicFiles.includes(resolve(dist, required))) {
    throw new Error(`Required public security artifact is missing: ${required}`);
  }
}

console.log(
  `Static SPA fallbacks and public-output checks ready: ${routes.length} routes.`,
);
