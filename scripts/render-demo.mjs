// Pre-renders Maya's demo with the REAL YouCam APIs and saves every result as a
// static file, so the public demo path costs zero units. Merges into
// public/demo/manifest.json, so jobs can be run a few at a time.
// Run: node scripts/render-demo.mjs <job> [job...]
//   jobs: sample | brow:<Preset> | wig:<wigId> | best:<wigId> | hat:<hatId> (on the best wig)
//         | browOnWig  (saved brow recipe drawn on the best wig render)
import "./env.mjs";
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASE = process.env.PERFECTCORP_BASE_URL || "https://yce-api-01.makeupar.com";
const auth = { Authorization: `Bearer ${process.env.PERFECTCORP_API_KEY}` };
const MANIFEST = "public/demo/manifest.json";
const PHOTO = "public/demo/maya.jpg";
const PATH = { wig: "/s2s/v2.1/task/hair-transfer", hat: "/s2s/v2.0/task/hat", brow: "/s2s/v2.0/task/makeup-vto" };

if (!existsSync(PHOTO)) {
  await sharp("assets-src/maya-z.jpg").resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 92 }).toFile(PHOTO);
}
const m = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {
  persona: { name: "Maya", label: "AI-generated persona, preparing for treatment", photo: "/demo/maya.jpg" },
  passport: null,
  renders: { brow: {}, wig: {}, hat: {} },
};
// _urls holds live YouCam result URLs (valid ~2h) for chaining; stripped before commit.
m._urls ??= {};
const save = () => writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");

const credit = async () => (await (await fetch(`${BASE}/s2s/v1.0/client/credit`, { headers: auth })).json())
  ?.results?.reduce((s, r) => s + (r.amount ?? 0), 0);

async function upload(path) {
  const jpg = await sharp(readFileSync(path)).resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 92 }).toBuffer();
  const init = await (await fetch(`${BASE}/s2s/v2.0/file`, {
    method: "POST", headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ files: [{ content_type: "image/jpg", file_name: "img.jpg", file_size: jpg.length }] }),
  })).json();
  const f = init?.data?.files?.[0];
  const put = await fetch(f.requests[0].url, { method: "PUT", headers: f.requests[0].headers, body: new Uint8Array(jpg) });
  if (!put.ok) throw new Error(`put ${put.status}`);
  return f.file_id;
}

async function run(feature, body, outFile) {
  const t = await (await fetch(`${BASE}${PATH[feature]}`, {
    method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body),
  })).json();
  const id = t?.data?.task_id;
  if (!id) throw new Error(`task create: ${JSON.stringify(t).slice(0, 300)}`);
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const d = (await (await fetch(`${BASE}${PATH[feature]}/${id}`, { headers: auth })).json())?.data;
    if (d?.task_status === "success") {
      const r = d.results;
      const url = r?.url ?? r?.[0]?.download_url ?? r?.[0]?.url;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      await sharp(buf).jpeg({ quality: 88 }).toFile(`public/demo/${outFile}`);
      return { url, local: `/demo/${outFile}` };
    }
    if (d?.task_status === "error") throw new Error(`task error: ${JSON.stringify(d).slice(0, 300)}`);
  }
  throw new Error("timeout");
}

async function samplePatch(path, fx, fy, r = 6) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const cx = Math.round(fx * info.width), cy = Math.round(fy * info.height);
  let s = [0, 0, 0], n = 0;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const i = (y * info.width + x) * info.channels;
    s = s.map((v, k) => v + data[i + k]); n++;
  }
  return "#" + s.map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// The wig ranked closest to Maya's saved hair is the base for hats and brows-on-wig.
function bestWigUrl() {
  const id = m.bestWig;
  if (!id || !m._urls[`wig:${id}`]) throw new Error("render the best wig first (wig:<id> then best:<id>) within the 2h URL window");
  return m._urls[`wig:${id}`];
}

console.log("units before:", await credit());
let fileId;
const src = async () => (fileId ??= await upload(PHOTO));

for (const job of process.argv.slice(2)) {
  const [kind, arg] = job.split(":");
  try {
    if (kind === "sample") {
      // Brow colour is tapped (fullest part of her left brow). Hair is NOT taken
      // from a tap: Maya confirms her shade on the colour ring (lib/hairChart.ts),
      // because taps on her side-lit hair ranged from #946F50 to #130801.
      const browHex = await samplePatch(PHOTO, 0.40, 0.345, 4);
      const hairHex = "#5C3420"; // ring shade "chestnut"
      m.passport = { hairHex, hairShade: "chestnut", hairLength: "mid", brow: { preset: "SoftArch1", hex: browHex, thickness: 0, intensity: 80 } };
      console.log("passport", hairHex, browHex);
    } else if (kind === "wigbrow") {
      // Fresh wig render, then the saved brows drawn on THAT render, so every
      // wig's "brows on your wig" view is real (one shared image lied for 8 of 9).
      const ref = await upload(`public/refs/wig-${arg}.jpg`);
      const w = await run("wig", { src_file_id: await src(), ref_file_id: ref }, `wig-${arg}.jpg`);
      m.renders.wig[arg] = w.local;
      const b = m.passport.brow;
      const r = await run("brow", {
        src_file_url: w.url, version: "1.0",
        effects: [{ category: "eyebrows", pattern: { type: "shape", name: b.preset, curvature: 0, thickness: b.thickness, definition: 60 },
          palettes: [{ color: b.hex, colorIntensity: b.intensity, texture: "matte" }] }],
      }, `brow-on-wig-${arg}.jpg`);
      if (typeof m.renders.browOnWig !== "object" || m.renders.browOnWig === null) m.renders.browOnWig = {};
      m.renders.browOnWig[arg] = r.local;
    } else if (kind === "brow") {
      const b = m.passport.brow;
      const r = await run("brow", {
        src_file_id: await src(), version: "1.0",
        effects: [{ category: "eyebrows", pattern: { type: "shape", name: arg, curvature: 0, thickness: b.thickness, definition: 60 },
          palettes: [{ color: b.hex, colorIntensity: b.intensity, texture: "matte" }] }],
      }, `brow-${arg}.jpg`);
      m.renders.brow[arg] = r.local;
    } else if (kind === "wig") {
      const ref = await upload(`public/refs/wig-${arg}.jpg`);
      const r = await run("wig", { src_file_id: await src(), ref_file_id: ref }, `wig-${arg}.jpg`);
      m.renders.wig[arg] = r.local;
      m._urls[`wig:${arg}`] = r.url;
    } else if (kind === "best") {
      m.bestWig = arg;
    } else if (kind === "hat") {
      const ref = await upload(`public/refs/hat-${arg}.jpg`);
      const r = await run("hat", { src_file_url: bestWigUrl(), ref_file_id: ref, gender: "female", style: "style_warm_cozy" }, `hat-${arg}.jpg`);
      m.renders.hat[arg] = r.local;
    } else if (kind === "browOnWig") {
      const b = m.passport.brow;
      const r = await run("brow", {
        src_file_url: bestWigUrl(), version: "1.0",
        effects: [{ category: "eyebrows", pattern: { type: "shape", name: b.preset, curvature: 0, thickness: b.thickness, definition: 60 },
          palettes: [{ color: b.hex, colorIntensity: b.intensity, texture: "matte" }] }],
      }, "brow-on-wig.jpg");
      m.renders.browOnWig = r.local;
    }
    console.log("ok", job);
  } catch (e) {
    console.log("FAIL", job, e.message);
  }
  save();
}
console.log("units after:", await credit());
