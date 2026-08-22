import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
console.log("Copied dist/index.html -> dist/404.html for GitHub Pages SPA routing.");
