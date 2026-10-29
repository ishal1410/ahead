// The Look Passport: what a person saves before treatment. Pure functions only
// (no DOM) so they can be unit-tested; browser-only helpers live in lib/browser.ts.

import { rgbToLab, hexToRgb } from "./color";
import { BROW_PRESETS, type Length } from "./catalog";

export type BrowPresetId = (typeof BROW_PRESETS)[number]["id"];

export interface BrowSaved {
  preset: BrowPresetId;
  hex: string;
  thickness: number;
  intensity: number;
}

export interface Passport {
  version: 1;
  savedAt: string;
  hairHex: string;
  hairLength: Length;
  brow: BrowSaved;
  photoDataUrl: string;
}

export const STORAGE_KEY = "ahead.passport.v1";
export const LENGTHS: Length[] = ["short", "mid", "long"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function browLabel(id: string): string {
  return BROW_PRESETS.find((p) => p.id === id)?.label ?? id;
}

// Anything read back from storage is untrusted: validate the shape, never throw.
export function parsePassport(raw: string | null): Passport | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p?.version !== 1 || !HEX.test(p.hairHex) || !LENGTHS.includes(p.hairLength)) return null;
    if (!p.brow || !BROW_PRESETS.some((b) => b.id === p.brow.preset) || !HEX.test(p.brow.hex)) return null;
    if (typeof p.photoDataUrl !== "string" || !p.photoDataUrl.startsWith("data:image/")) return null;
    return p as Passport;
  } catch {
    return null;
  }
}

// What the QR on the Match Card carries: everything except the photo.
export function qrPayload(p: Passport): string {
  const { photoDataUrl: _photo, ...rest } = p;
  return JSON.stringify(rest);
}

// A generic, brand-free shade family a wig fitter can map to their own stock.
export function shadeFamily(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [L, a, bb] = rgbToLab([r, g, b]);
  const chroma = Math.hypot(a, bb);
  if (chroma < 6 && L > 55) return "Silver grey";
  if (L < 18) return "Soft black";
  if (L < 30) return a > 12 ? "Dark auburn" : "Dark brown";
  if (L < 45) return a > 14 ? "Auburn" : "Medium brown";
  if (L < 60) return a > 14 ? "Copper" : "Light brown";
  return "Blonde";
}

// Machine-readable-zone style lines for the passport page. Purely decorative, but
// they encode the real recipe so the page reads like a document, not a mock.
export function mrzLines(d: { hairHex?: string; hairLength?: Length; brow?: { preset: string; hex: string; thickness: number; intensity: number } }): [string, string] {
  const pad = (s: string) => (s.toUpperCase().replace(/[^A-Z0-9<]/g, "<") + "<".repeat(36)).slice(0, 36);
  const hair = d.hairHex ? d.hairHex.slice(1) : "";
  const brow = d.brow;
  return [
    pad(`P<AHD<HAIR<${hair}<${d.hairLength ?? ""}`),
    pad(brow ? `BROW<${brow.preset}<${brow.hex.slice(1)}<T${brow.thickness}<I${brow.intensity}` : "BROW<"),
  ];
}
