// Representative hair colour for a reference photo: the lit mid-tones of the hair
// (50th-80th luminance percentile of pixels that are neither background nor skin).
// That is what a person's tap on their own hair tends to land on, so wig hex values
// and tapped passport hex values are comparable.
// Run: node scripts/sample-wig-hex.mjs [files...]   (default: every public/refs/wig-*.jpg)
import sharp from "sharp";
import { readdirSync } from "node:fs";

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const hex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

const files = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync("public/refs").filter((f) => f.startsWith("wig")).map((f) => `public/refs/${f}`);

for (const f of files) {
  const { data, info } = await sharp(f).resize(208, 256).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: c } = info;
  const px = (x, y) => { const i = (y * W + x) * c; return [data[i], data[i + 1], data[i + 2]]; };
  const bgs = [px(4, 4), px(W - 5, 4)];
  const skins = [px(Math.round(W * 0.5), Math.round(H * 0.42)), px(Math.round(W * 0.42), Math.round(H * 0.5))];
  const hair = [];
  for (let y = 0; y < H * 0.55; y++) for (let x = 0; x < W; x++) {
    const p = px(x, y);
    if (bgs.some((b) => dist(p, b) < 40) || skins.some((s) => dist(p, s) < 55)) continue;
    hair.push(p);
  }
  hair.sort((a, b) => lum(a) - lum(b));
  const band = hair.slice(Math.floor(hair.length * 0.5), Math.floor(hair.length * 0.8));
  const mean = [0, 1, 2].map((k) => band.reduce((s, p) => s + p[k], 0) / band.length);
  console.log(f.padEnd(40), hex(mean), `n=${hair.length}`);
}
