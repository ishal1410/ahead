// Generates every reference image and logs prompts to assets-src/PROVENANCE.md.
// Run: node scripts/gen-assets.mjs
import "./env.mjs";
import { writeFileSync, appendFileSync, existsSync } from "node:fs";

const person = (hair) => `Photorealistic studio portrait photograph of a woman wearing a ${hair} wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens`;
const hat = (h) => `Photorealistic e-commerce product photograph of a single ${h}, front view, centered, filling most of the frame, plain white background, soft even studio light, no person, no mannequin, no text, no logo`;

const JOBS = [
  ["public/refs/wig-soft-chestnut.jpg", person("shoulder-length softly wavy light chestnut brown with warm golden highlights"), 109],
  ["public/refs/wig-chestnut-wave.jpg", person("shoulder-length wavy chestnut brown"), 101],
  ["public/refs/wig-espresso-straight.jpg", person("shoulder-length straight dark espresso brown"), 102],
  ["public/refs/wig-auburn-long.jpg", person("long softly layered auburn red"), 103],
  ["public/refs/wig-caramel-bob.jpg", person("chin-length caramel brown bob"), 104],
  ["public/refs/wig-black-pixie.jpg", person("short soft black pixie cut"), 105],
  ["public/refs/wig-ash-blonde-bob.jpg", person("chin-length ash blonde bob"), 106],
  ["public/refs/wig-honey-long.jpg", person("long straight honey blonde"), 107],
  ["public/refs/wig-silver-short.jpg", person("short layered silver grey"), 108],
  ["public/refs/hat-knit-beanie.jpg", hat("soft oatmeal ribbed knit beanie hat"), 201],
  ["public/refs/hat-cotton-turban.jpg", hat("soft sage green jersey cotton turban cap"), 202],
  ["public/refs/hat-cloche.jpg", hat("charcoal wool felt cloche hat"), 203],
  ["public/refs/hat-bucket.jpg", hat("navy cotton bucket hat"), 204],
];

const log = "assets-src/PROVENANCE.md";
if (!existsSync(log)) writeFileSync(log, "# Asset provenance\n\nAll faces and products are AI-generated with Pollinations (model `zimage`, Z-Image Turbo). No real people, no stock, no shop photos.\n\n| File | Seed | Prompt |\n|---|---|---|\n| assets-src/maya-z.jpg (Maya) | 7 | Photorealistic candid portrait photograph of a 40-year-old woman with shoulder-length wavy chestnut brown hair worn down, natural full dark brown eyebrows, faint smile lines, real skin texture with pores, no makeup, grey crew-neck sweater, facing the camera straight on, head and shoulders, plain warm grey wall, soft window light, 85mm lens, documentary style |\n");

for (const [out, prompt, seed] of JOBS) {
  if (existsSync(out)) { console.log("skip", out); continue; }
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=zimage&width=832&height=1024&seed=${seed}&nologo=true`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.POLLINATIONS_KEY}` }, signal: AbortSignal.timeout(180000) });
  const ct = r.headers.get("content-type") ?? "";
  if (!r.ok || !ct.startsWith("image/")) { console.log("FAIL", out, r.status, (await r.text()).slice(0, 300)); continue; }
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  appendFileSync(log, `| ${out} | ${seed} | ${prompt} |\n`);
  console.log("ok", out);
}
