// Generate one image via Pollinations (keyed, free quest pollen). Prompts are logged in assets-src/PROVENANCE.md.
// Run: node scripts/gen-pollinations.mjs <out.jpg> "<prompt>" [model] [width] [height] [seed]
import "./env.mjs";
import { writeFileSync } from "node:fs";
const [out, prompt, model = "zimage", w = "832", h = "1024", seed = "7"] = process.argv.slice(2);
const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${model}&width=${w}&height=${h}&seed=${seed}&nologo=true`;
const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.POLLINATIONS_KEY}` }, signal: AbortSignal.timeout(180000) });
const ct = r.headers.get("content-type") ?? "";
if (!r.ok || !ct.startsWith("image/")) { console.log(r.status, ct, (await r.text()).slice(0, 400)); process.exit(1); }
writeFileSync(out, Buffer.from(await r.arrayBuffer()));
console.log(r.status, model, ct, "->", out);
