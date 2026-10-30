// Regression tests for docs/FIX_LIST_2.md. Each one failed before its fix.
import { describe, it, expect } from "vitest";
import * as render from "./render";
import * as passport from "./passport";
import * as browser from "./browser";
import { HAIR_RING } from "./hairChart";

const base = {
  version: 1,
  savedAt: "2026-10-01T10:00:00.000Z",
  hairLength: "mid",
  brow: { preset: "SoftArch1", hex: "#564843", thickness: 0, intensity: 80 },
  photoDataUrl: "data:image/jpeg;base64,AAAA",
};
const saved = passport.parsePassport(JSON.stringify({ ...base, hairHex: "#5C3420" }))!;

// Items 2 + 15: Back/Forward and refresh stay in the session they belong to.
describe("session-aware navigation", () => {
  it("Forward to rebuild inside the demo never swaps in the saved passport", () => {
    expect(passport.popTarget("rebuild", true, false, true)).toEqual({ to: "go", step: "passport" });
    expect(passport.popTarget("card", true, true, true)).toEqual({ to: "go", step: "card" });
  });
  it("with no session, Back/Forward falls back to the saved passport", () => {
    expect(passport.popTarget("rebuild", false, false, true)).toMatchObject({ to: "saved", step: "rebuild" });
    expect(passport.popTarget("rebuild", false, false, false)).toEqual({ to: "go", step: "landing" });
  });
  it("refreshing the demo's Match Card restores the demo, not the saved card", () => {
    const stored = { kind: "demo" as const, passport: saved };
    expect(passport.resumeTarget("card", stored, saved)).toEqual({ to: "demo", step: "card" });
    expect(passport.resumeTarget("card", { kind: "demo" }, saved)).toEqual({ to: "demo", step: "passport" });
  });
  it("refreshing a saved session restores its look only for the same saved passport", () => {
    expect(passport.resumeTarget("rebuild", { kind: "saved", savedAt: saved.savedAt }, saved)).toEqual({ to: "saved", step: "rebuild", restoreLook: true });
    expect(passport.resumeTarget("rebuild", { kind: "saved", savedAt: "other" }, saved)).toMatchObject({ restoreLook: false });
  });
});

// Item 4: the session record round-trips the look and the demo passport.
describe("parseSessionState", () => {
  it("keeps the look and a valid demo passport, rejects junk", () => {
    const look = { wig: { id: "w", url: "/demo/w.jpg", match: 100 }, brow: { url: "/demo/b.jpg", wigId: "w", expiresAt: 5 } };
    const s = passport.parseSessionState(JSON.stringify({ kind: "demo", passport: saved, look }));
    expect(s?.look).toEqual(look);
    expect(s?.passport?.hairHex).toBe("#5C3420");
    expect(passport.parseSessionState("{\"kind\":\"x\"}")).toBeNull();
    expect(passport.parseSessionState("not json")).toBeNull();
  });
});

// Item 5: an upload that resolves after the session changed is dropped.
describe("render cache guard", () => {
  it("throws StaleError when reset() ran while the promise was pending", async () => {
    const c = render.createRenderCache<string>();
    let done!: (v: string) => void;
    const p = c.guard(new Promise<string>((r) => (done = r)));
    c.reset();
    done("file-1");
    await expect(p).rejects.toBeInstanceOf(render.StaleError);
    await expect(c.guard(Promise.resolve("ok"))).resolves.toBe("ok");
  });
});

// Item 6: legacy passports hold raw tapped hexes; they snap onto the ring.
describe("parsePassport snaps legacy hair hex to the ring", () => {
  it.each(["#6B4A35", "#5D3521"])("%s becomes a ring shade", (hex) => {
    const p = passport.parsePassport(JSON.stringify({ ...base, hairHex: hex }))!;
    expect(HAIR_RING.map((s) => s.hex)).toContain(p.hairHex);
  });
});

// Item 7: skin taps are refused as brows; brows never get a hair-ring name.
describe("brow colour", () => {
  it("rejects a skin-light sample and accepts a real brow", () => {
    expect(passport.browSampleProblem("#D9B49A")).toBe(passport.BROW_TOO_LIGHT);
    expect(passport.browSampleProblem("#564843")).toBeUndefined();
  });
  it("describes brows plainly, never as Honey blonde", () => {
    expect(passport.browTone("#564843")).toMatch(/brown brow$/);
    expect(passport.browTone("#C2925F")).not.toMatch(/honey/i);
  });
});

// Item 9: brows hidden because they sit on another wig are not "expired".
describe("liveLook", () => {
  it("does not flag expiry when brows belong to a different wig", () => {
    const l = render.liveLook({ wig: { id: "b", url: "u", match: 90 }, brow: { url: "x", wigId: "a" } }, 0);
    expect(l.brow).toBeUndefined();
    expect(l.expired).toBe(false);
  });
  it("flags expiry when the brow URL really expired", () => {
    expect(render.liveLook({ brow: { url: "x", expiresAt: 10 } }, 20).expired).toBe(true);
  });
});

// Item 10: refreshing photo brows never moves them onto the wig.
describe("browRefreshSource", () => {
  const w = { id: "w", url: "u" };
  it("redraws photo brows on the photo and wig brows on the wig", () => {
    expect(render.browRefreshSource({ url: "x" }, w)).toBeUndefined();
    expect(render.browRefreshSource({ url: "x", wigId: "w" }, w)).toBe(w);
  });
});

// Item 11: the colour ring is a real radiogroup.
describe("radioKeyIndex", () => {
  it("moves with arrows (wrapping) and jumps with Home/End", () => {
    expect(browser.radioKeyIndex("ArrowRight", 11, 12)).toBe(0);
    expect(browser.radioKeyIndex("ArrowLeft", 0, 12)).toBe(11);
    expect(browser.radioKeyIndex("ArrowDown", 3, 12)).toBe(4);
    expect(browser.radioKeyIndex("Home", 5, 12)).toBe(0);
    expect(browser.radioKeyIndex("End", 5, 12)).toBe(11);
    expect(browser.radioKeyIndex("a", 5, 12)).toBe(-1);
  });
});
