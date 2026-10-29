// Colour maths for matching wigs to the hair colour a person saved before
// treatment. CIE76 delta-E in Lab space: simple, explainable, good enough to rank
// a small catalogue (a delta-E under ~10 reads as "the same family" to most eyes).

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`bad hex: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab([r, g, b]: Rgb): [number, number, number] {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  // sRGB -> XYZ (D65), normalised by the reference white
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = rgbToLab(hexToRgb(a));
  const [l2, a2, b2] = rgbToLab(hexToRgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

// Map delta-E to a 0-100 "colour match" a person can read. 0 -> 100%, and the
// score reaches 0 at delta-E 50 (a different hair colour family entirely).
export function matchPercent(a: string, b: string): number {
  return Math.max(0, Math.round(100 - deltaE(a, b) * 2));
}

// Average a square patch of RGBA pixels (from a canvas) into one hex. Used for
// the tap-to-sample "this is my hair / my brow" step.
export function averageHex(rgba: ArrayLike<number>): string {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue; // skip transparent pixels
    r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++;
  }
  if (!n) throw new Error("no opaque pixels to sample");
  return rgbToHex([r / n, g / n, b / n]);
}

export interface Rankable { id: string; hex: string }

// Closest colour first; ties keep catalogue order.
export function rankByColour<T extends Rankable>(items: T[], targetHex: string): (T & { match: number })[] {
  return items
    .map((it, i) => ({ ...it, match: matchPercent(it.hex, targetHex), _i: i, _d: deltaE(it.hex, targetHex) }))
    .sort((a, b) => a._d - b._d || a._i - b._i)
    .map(({ _i, _d, ...rest }) => rest as T & { match: number });
}
