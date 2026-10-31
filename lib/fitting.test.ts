import { describe, expect, it } from "vitest";
import { WIGS } from "./catalog";
import { fittingList, toggleFitting } from "./render";
import { qrPayload, type Passport } from "./passport";

describe("fitting list", () => {
  it("keeps known ids only, no repeats, at most 3", () => {
    expect(fittingList(["x", "soft-chestnut", "soft-chestnut", "black-pixie", "honey-long", "silver-short"], WIGS)).toEqual(["soft-chestnut", "black-pixie", "honey-long"]);
    expect(fittingList("bad", WIGS)).toEqual([]);
    expect(fittingList(null, WIGS)).toEqual([]);
    expect(fittingList([1, {}], WIGS)).toEqual([]);
  });

  it("toggles one wig and ignores additions to a full list", () => {
    let l = toggleFitting(undefined, "a");
    l = toggleFitting(l, "b");
    l = toggleFitting(l, "c");
    expect(toggleFitting(l, "d")).toEqual(["a", "b", "c"]);
    expect(toggleFitting(l, "b")).toEqual(["a", "c"]);
    expect(toggleFitting(["a"], "a")).toEqual([]);
  });

  it("the QR carries the shortlist, never the photo", () => {
    const p = { version: 1, savedAt: "2026-10-31T00:00:00.000Z", hairHex: "#5C3420", hairLength: "mid", brow: { preset: "SoftArch1", hex: "#564843", thickness: 0, intensity: 80 }, photoDataUrl: "data:image/jpeg;base64,AAAA" } as unknown as Passport;
    const withList = JSON.parse(qrPayload(p, ["chestnut-wave"]));
    expect(withList.fitting).toEqual(["chestnut-wave"]);
    expect(withList).not.toHaveProperty("photoDataUrl");
    expect(JSON.parse(qrPayload(p))).not.toHaveProperty("fitting");
  });

  it("the catalogue carries no prices or SKUs", () => {
    for (const w of WIGS) expect(JSON.stringify(w)).not.toMatch(/\$|price|sku/i);
  });
});
