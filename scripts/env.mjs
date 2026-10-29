// Loads .env.local (this repo first, then the sibling GlowRead repo for shared dev keys).
import { readFileSync, existsSync } from "node:fs";
for (const p of [new URL("../.env.local", import.meta.url), new URL("../../skincare-coach/.env.local", import.meta.url)]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
