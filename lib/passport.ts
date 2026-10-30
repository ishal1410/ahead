// The Look Passport: what a person saves before treatment. Pure functions only
// (no DOM) so they can be unit-tested; browser-only helpers live in lib/browser.ts.

import { shadeName, suggestShade } from "./hairChart";
import { hexToRgb, rgbToLab } from "./color";
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
    // Passports saved before the colour ring hold a raw tapped hex: snap it to its ring
    // shade so the ring shows a selection and the ranking says "same shade" consistently.
    p.hairHex = suggestShade(p.hairHex).hex;
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

// Brows are not hair: they get their own plain descriptor, never a hair-ring name
// ("Honey blonde" for a brow reads wrong). One function for Passport, Rebuild and Card.
const lightness = (hex: string) => rgbToLab(hexToRgb(hex))[0];
export function browTone(hex: string): string {
  const L = lightness(hex);
  return L < 20 ? "Black-brown brow" : L < 30 ? "Dark brown brow" : L < 42 ? "Medium brown brow" : L < 55 ? "Light brown brow" : "Blonde brow";
}

// A brow tap that reads this light almost always landed on skin.
export const BROW_TOO_LIGHT = "That looks like skin. Tap the darkest part of the brow.";
export function browSampleProblem(hex: string): string | undefined {
  return lightness(hex) > 60 ? BROW_TOO_LIGHT : undefined;
}

// Which session a URL step belongs to, kept per tab (sessionStorage) so Back/Forward and
// refresh stay in the demo or in the saved passport, never swap one for the other.
export const SESSION_KEY = "ahead.session.v1";
export interface SessionState<L = unknown> {
  kind: "demo" | "saved";
  passport?: Passport; // demo only: the saved passport lives in localStorage
  savedAt?: string; // saved only: which saved passport this look belongs to
  look?: L;
}

export function parseSessionState<L>(raw: string | null): SessionState<L> | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s?.kind !== "demo" && s?.kind !== "saved") return null;
    const passport = s.passport ? parsePassport(JSON.stringify(s.passport)) ?? undefined : undefined;
    return { kind: s.kind, passport, savedAt: typeof s.savedAt === "string" ? s.savedAt : undefined, look: s.look && typeof s.look === "object" ? s.look : undefined };
  } catch {
    return null;
  }
}

export type AppStep = "landing" | "capture" | "passport" | "rebuild" | "card";
export type Resume =
  | { to: "go"; step: AppStep }
  | { to: "demo"; step: AppStep }
  | { to: "saved"; step: AppStep; restoreLook: boolean };

const needsPassport = (s: AppStep) => s === "rebuild" || s === "card";

// Page load: where ?step=X goes, given what this tab was doing and what is saved.
export function resumeTarget(want: AppStep, stored: SessionState | null, saved: Passport | null): Resume {
  if (want === "landing" || want === "capture") return { to: "go", step: want };
  if (stored?.kind === "demo") return { to: "demo", step: needsPassport(want) && !stored.passport ? "passport" : want };
  if (saved) return { to: "saved", step: want, restoreLook: stored?.kind === "saved" && stored.savedAt === saved.savedAt };
  return { to: "go", step: "landing" };
}

// Back/Forward: stay inside the current session; only with no session fall back to the saved one.
export function popTarget(want: AppStep, hasSession: boolean, hasPassport: boolean, hasSaved: boolean): Resume {
  if (want === "landing" || want === "capture") return { to: "go", step: want };
  if (hasSession) return { to: "go", step: needsPassport(want) && !hasPassport ? "passport" : want };
  if (hasSaved) return { to: "saved", step: want, restoreLook: false };
  return { to: "go", step: "landing" };
}
