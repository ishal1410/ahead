// Reference images the try-ons are rendered from. Every image is AI-generated or
// licensed; provenance is logged in assets-src/PROVENANCE.md. No brand names: the
// Match Card describes a shade family and length a fitter can map to their stock.

export type Length = "short" | "mid" | "long";

// A retailer feed would add its own price, sku and url per entry; Ahead invents none.
export interface WigRef {
  id: string;
  label: string;     // generic description, never a brand
  shade: string;     // generic shade family for the Match Card
  hex: string;       // the wig's ring shade (lib/hairChart.ts), assigned by eye
  length: Length;
  file: string;      // path under /public
}

export interface HatRef {
  id: string;
  label: string;
  file: string;
}

// shade + hex are the wig's shade on Ahead's colour ring (lib/hairChart.ts), assigned
// by eye like a retailer's colour code. Photos can't measure hair colour reliably.
export const WIGS: WigRef[] = [
  { id: "soft-chestnut", label: "Soft chestnut waves with warm highlights", shade: "Light chestnut", hex: "#7E5233", length: "mid", file: "/refs/wig-soft-chestnut.jpg" },
  { id: "chestnut-wave", label: "Shoulder-length chestnut waves", shade: "Chestnut", hex: "#5C3420", length: "mid", file: "/refs/wig-chestnut-wave.jpg" },
  { id: "espresso-straight", label: "Shoulder-length straight espresso", shade: "Espresso", hex: "#2E1E17", length: "mid", file: "/refs/wig-espresso-straight.jpg" },
  { id: "caramel-bob", label: "Warm chestnut bob with fringe", shade: "Chestnut", hex: "#5C3420", length: "short", file: "/refs/wig-caramel-bob.jpg" },
  { id: "auburn-long", label: "Long layered copper", shade: "Copper", hex: "#A4441E", length: "long", file: "/refs/wig-auburn-long.jpg" },
  { id: "black-pixie", label: "Soft black pixie", shade: "Soft black", hex: "#1E1A18", length: "short", file: "/refs/wig-black-pixie.jpg" },
  { id: "ash-blonde-bob", label: "Light ash brown bob", shade: "Light ash brown", hex: "#8E7B6A", length: "short", file: "/refs/wig-ash-blonde-bob.jpg" },
  { id: "honey-long", label: "Long straight honey blonde", shade: "Honey blonde", hex: "#C2925F", length: "long", file: "/refs/wig-honey-long.jpg" },
  { id: "silver-short", label: "Short layered silver", shade: "Silver grey", hex: "#A9A4A1", length: "short", file: "/refs/wig-silver-short.jpg" },
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
