// The Look Passport: what a person saves before treatment. Pure functions only
// (no DOM) so they can be unit-tested; browser-only helpers live in lib/browser.ts.

import { shadeName } from "./hairChart";
import { BROW_PRESETS, type Length, type WigRef } from "./catalog";

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
  // Where the hair and brow were tapped, as fractions of the photo (optional).
  hairAt?: [number, number];
  browAt?: [number, number];
}

// The passport page while it is being filled in.
export interface Draft {
  hairHex?: string;
  browHex?: string;
  hairLength?: Length;
  browPreset?: BrowPresetId;
  hairAt?: [number, number];
  browAt?: [number, number];
}

export function draftFromPassport(p: Passport): Draft {
  const d: Draft = { hairHex: p.hairHex, hairLength: p.hairLength, browHex: p.brow.hex, browPreset: p.brow.preset };
  if (p.hairAt) d.hairAt = p.hairAt;
  if (p.browAt) d.browAt = p.browAt;
  return d;
}

const isPoint = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && n >= 0 && n <= 1);

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
    if (!isPoint(p.hairAt)) delete p.hairAt;
    if (!isPoint(p.browAt)) delete p.browAt;
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
// Names come from the colour ring (lib/hairChart.ts): the same vocabulary the
// wig catalogue uses, so the passport, Wigs tab and Match Card always agree.
export function shadeFamily(hex: string): string {
  return shadeName(hex);
}

// Wigs are named by the same function as the saved hair, from their own hex, so
// one colour never carries two names across the Passport, Wigs tab and Card.
export const wigShade = (w: Pick<WigRef, "hex">) => shadeFamily(w.hex);

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
