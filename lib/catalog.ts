// Reference images the try-ons are rendered from. Every image is AI-generated or
// licensed; provenance is logged in assets-src/PROVENANCE.md. No brand names: the
// Match Card describes a shade family and length a fitter can map to their stock.

export type Length = "short" | "mid" | "long";

export interface WigRef {
  id: string;
  label: string;     // generic description, never a brand
  shade: string;     // generic shade family for the Match Card
  hex: string;       // representative hair colour, sampled from the reference image
  length: Length;
  file: string;      // path under /public
}

export interface HatRef {
  id: string;
  label: string;
  file: string;
}

// hex values come from scripts/sample-wig-hex.mjs (lit mid-tones of the hair, comparable to a tap).
export const WIGS: WigRef[] = [
  { id: "soft-chestnut", label: "Soft chestnut waves with warm highlights", shade: "Light chestnut", hex: "#7F4E33", length: "mid", file: "/refs/wig-soft-chestnut.jpg" },
  { id: "chestnut-wave", label: "Shoulder-length chestnut waves", shade: "Chestnut brown", hex: "#452617", length: "mid", file: "/refs/wig-chestnut-wave.jpg" },
  { id: "espresso-straight", label: "Shoulder-length straight espresso", shade: "Dark brown", hex: "#4C352C", length: "mid", file: "/refs/wig-espresso-straight.jpg" },
  { id: "caramel-bob", label: "Caramel bob with fringe", shade: "Medium brown", hex: "#663D2C", length: "short", file: "/refs/wig-caramel-bob.jpg" },
  { id: "auburn-long", label: "Long layered auburn", shade: "Auburn", hex: "#5E210F", length: "long", file: "/refs/wig-auburn-long.jpg" },
  { id: "black-pixie", label: "Soft black pixie", shade: "Soft black", hex: "#221F1D", length: "short", file: "/refs/wig-black-pixie.jpg" },
  { id: "ash-blonde-bob", label: "Light ash brown bob", shade: "Light ash brown", hex: "#92725E", length: "short", file: "/refs/wig-ash-blonde-bob.jpg" },
  { id: "honey-long", label: "Long straight honey blonde", shade: "Honey blonde", hex: "#D2A278", length: "long", file: "/refs/wig-honey-long.jpg" },
  { id: "silver-short", label: "Short layered silver", shade: "Silver grey", hex: "#968C87", length: "short", file: "/refs/wig-silver-short.jpg" },
];

// No hats: the hat API returns a generated full-body fashion scene, not a head try-on.
export const HATS: HatRef[] = [];

// Three visibly different shapes so "which brows are yours?" is a real choice.
// Labels come from YouCam's eyebrows.json.
export const BROW_PRESETS = [
  { id: "Straight1", label: "Straight" },
  { id: "SoftArch1", label: "Soft arch" },
  { id: "HighArch1", label: "High arch" },
] as const;

export function findRef(feature: "wig" | "hat", id: string): WigRef | HatRef | undefined {
  return (feature === "wig" ? WIGS : HATS).find((r) => r.id === id);
}

export function isBrowPreset(id: unknown): boolean {
  return BROW_PRESETS.some((p) => p.id === id);
}
