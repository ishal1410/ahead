import { describe, it, expect } from "vitest";
import { HAIR_RING, ringShade, suggestShade, shadeName, ringMatch } from "./hairChart";
import { WIGS } from "./catalog";
import { rankByColour } from "./color";

describe("colour ring", () => {
  it("has unique ids and valid swatches", () => {
    expect(new Set(HAIR_RING.map((s) => s.id)).size).toBe(HAIR_RING.length);
    for (const s of HAIR_RING) expect(s.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("suggests the nearest ring shade for a sampled colour", () => {
    expect(suggestShade("#1A1615").id).toBe("soft-black");
    expect(suggestShade("#C8985F").id).toBe("honey-blonde");
    expect(suggestShade("#A7A3A0").id).toBe("silver");
  });

  it("names any hex with one function, so a colour never gets two names", () => {
    expect(shadeName("#5C3420")).toBe("Chestnut");
    expect(shadeName(ringShade("auburn")!.hex)).toBe("Auburn");
  });

  it("scores the same shade 100 and a far shade low", () => {
    const chestnut = ringShade("chestnut")!;
    expect(ringMatch(chestnut, chestnut)).toBe(100);
    expect(ringMatch(chestnut, ringShade("silver")!)).toBeLessThan(20);
  });

  it("every wig sits exactly on a ring shade with the matching name", () => {
    for (const w of WIGS) {
      const shade = HAIR_RING.find((s) => s.hex === w.hex);
      expect(shade, w.id).toBeDefined();
      expect(w.shade).toBe(shade!.name);
    }
  });

  it("ranks a chestnut passport's chestnut wig first and the ash bob low", () => {
    const ranked = rankByColour(WIGS, ringShade("chestnut")!.hex);
    expect(ranked[0].id).toBe("chestnut-wave");
    expect(ranked[0].match).toBe(100);
    expect(ranked.find((w) => w.id === "ash-blonde-bob")!.match).toBeLessThan(50);
  });
});
