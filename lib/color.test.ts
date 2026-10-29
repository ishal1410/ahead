import { describe, it, expect } from "vitest";
import { hexToRgb, rgbToHex, deltaE, matchPercent, averageHex, rankByColour } from "./color";

describe("colour maths", () => {
  it("round-trips hex", () => {
    expect(rgbToHex(hexToRgb("#3b2a1e"))).toBe("#3B2A1E");
  });

  it("rejects malformed hex", () => {
    expect(() => hexToRgb("brown")).toThrow();
  });

  it("is zero for identical colours and symmetric", () => {
    expect(deltaE("#5A3A22", "#5A3A22")).toBe(0);
    expect(deltaE("#5A3A22", "#C8A060")).toBeCloseTo(deltaE("#C8A060", "#5A3A22"), 10);
  });

  it("matches black vs white at the known CIE76 distance of 100", () => {
    expect(deltaE("#000000", "#FFFFFF")).toBeCloseTo(100, 1);
  });

  it("scores close browns higher than brown vs blonde", () => {
    expect(matchPercent("#5A3A22", "#5E3D25")).toBeGreaterThan(90);
    expect(matchPercent("#5A3A22", "#D8B878")).toBeLessThan(40);
    expect(matchPercent("#000000", "#FFFFFF")).toBe(0);
  });

  it("averages only opaque pixels", () => {
    const px = [10, 20, 30, 255, 30, 40, 50, 255, 255, 255, 255, 0];
    expect(averageHex(px)).toBe("#141E28");
    expect(() => averageHex([0, 0, 0, 0])).toThrow();
  });

  it("ranks closest colour first and keeps catalogue order on ties", () => {
    const items = [
      { id: "blonde", hex: "#D8B878" },
      { id: "brown-a", hex: "#5E3D25" },
      { id: "black", hex: "#1A1614" },
      { id: "brown-b", hex: "#5E3D25" },
    ];
    const ranked = rankByColour(items, "#5A3A22");
    expect(ranked.map((r) => r.id)).toEqual(["brown-a", "brown-b", "black", "blonde"]);
    expect(ranked[0].match).toBeGreaterThan(ranked[3].match);
  });
});
