// Ahead's digital colour ring: the shared vocabulary between a person's saved
// hair, the wig catalogue and the Match Card. Wig fitters match on a physical
// colour ring because a photo can't measure hair colour: in testing, two taps
// on the same wig photo read #5C391F and #C79766, and one side-lit head ranked
// as ash blonde or soft black depending on where it was tapped. So a tap only
// SUGGESTS a ring shade; the person confirms it, and matching runs ring-to-ring.

import { deltaE, matchPercent } from "./color";

export interface RingShade {
  id: string;
  name: string;
  hex: string; // display swatch for this shade on Ahead's ring (not a measured value)
}

// Ordered dark to light, then reds, then greys — the way a ring is read.
export const HAIR_RING: RingShade[] = [
  { id: "soft-black", name: "Soft black", hex: "#1E1A18" },
  { id: "espresso", name: "Espresso", hex: "#2E1E17" },
  { id: "dark-brown", name: "Dark brown", hex: "#3D2A1F" },
  { id: "chestnut", name: "Chestnut", hex: "#5C3420" },
  { id: "medium-brown", name: "Medium brown", hex: "#5E4231" },
  { id: "light-chestnut", name: "Light chestnut", hex: "#7E5233" },
  { id: "light-ash-brown", name: "Light ash brown", hex: "#8E7B6A" },
  { id: "dark-blonde", name: "Dark blonde", hex: "#9A7650" },
  { id: "honey-blonde", name: "Honey blonde", hex: "#C2925F" },
  { id: "auburn", name: "Auburn", hex: "#7A2E17" },
  { id: "silver", name: "Silver grey", hex: "#A9A4A1" },
];

export function ringShade(id: string): RingShade | undefined {
  return HAIR_RING.find((s) => s.id === id);
}

// The ring shade closest to a sampled colour — a suggestion the person confirms.
export function suggestShade(sampledHex: string): RingShade {
  return HAIR_RING.reduce((best, s) => (deltaE(s.hex, sampledHex) < deltaE(best.hex, sampledHex) ? s : best));
}

// Name for any hex: the ring shade it sits closest to. One naming function for
// the passport, the wig list and the Match Card, so a colour never gets two names.
export function shadeName(hex: string): string {
  return suggestShade(hex).name;
}

// Match between two ring shades, 0-100. Same shade is 100.
export function ringMatch(a: RingShade, b: RingShade): number {
  return a.id === b.id ? 100 : matchPercent(a.hex, b.hex);
}
