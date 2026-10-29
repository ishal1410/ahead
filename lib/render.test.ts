import { describe, it, expect } from "vitest";
import { renderLive, renderDemo, CappedError, type DemoManifest } from "./render";
import { parsePassport, qrPayload, mrzLines, shadeFamily, type Passport } from "./passport";

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const noSleep = async () => {};

function fakeFetch(...responses: Response[]) {
  const calls: string[] = [];
  const fn = (async (url: string) => {
    calls.push(url);
    const r = responses.shift();
    if (!r) throw new Error("unexpected fetch");
    return r;
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const job = { feature: "brow" as const, src: { fileId: "f1" }, brow: { preset: "Straight1" as const, hex: "#3B2A1E" } };

describe("renderLive", () => {
  it("starts a task and polls until success", async () => {
    const { fn, calls } = fakeFetch(reply(202, { taskId: "t1" }), reply(200, { state: "running" }), reply(200, { state: "success", url: "https://x/r.jpg" }));
    expect(await renderLive(job, { fetchFn: fn, sleep: noSleep })).toBe("https://x/r.jpg");
    expect(calls).toEqual(["/api/render", "/api/render/brow/t1", "/api/render/brow/t1"]);
  });

  it("raises CappedError on the daily cap", async () => {
    const { fn } = fakeFetch(reply(429, { error: "limit", capped: true }));
    await expect(renderLive(job, { fetchFn: fn, sleep: noSleep })).rejects.toBeInstanceOf(CappedError);
  });

  it("surfaces the server's human error copy", async () => {
    const { fn } = fakeFetch(reply(202, { taskId: "t1" }), reply(200, { state: "error", error: "No face found." }));
    await expect(renderLive(job, { fetchFn: fn, sleep: noSleep })).rejects.toThrow("No face found.");
  });

  it("gives up after the timeout", async () => {
    const running = Array.from({ length: 5 }, () => reply(200, { state: "running" }));
    const { fn } = fakeFetch(reply(202, { taskId: "t1" }), ...running);
    await expect(renderLive(job, { fetchFn: fn, sleep: noSleep, intervalMs: 2000, timeoutMs: 10000 })).rejects.toThrow(/longer than usual/);
  });
});

describe("renderDemo", () => {
  const m: DemoManifest = {
    persona: { name: "Maya", label: "AI-generated persona", photo: "/demo/p.jpg" },
    passport: { hairHex: "#5A3A22", hairLength: "mid", brow: { preset: "SoftArch1", hex: "#3B2A1E" } },
    renders: { brow: { SoftArch1: "/demo/b.jpg" }, wig: { w1: "/demo/w1.jpg" }, hat: {}, browOnWig: "/demo/bw.jpg" },
  };
  it("serves renders from the manifest and prefers brows-on-wig when asked", async () => {
    expect(await renderDemo(m, { feature: "brow", brow: { preset: "SoftArch1", hex: "#000000" } }, noSleep)).toBe("/demo/b.jpg");
    expect(await renderDemo(m, { feature: "brow", brow: { preset: "SoftArch1", hex: "#000000" }, onWig: true }, noSleep)).toBe("/demo/bw.jpg");
    expect(await renderDemo(m, { feature: "wig", refId: "w1" }, noSleep)).toBe("/demo/w1.jpg");
    await expect(renderDemo(m, { feature: "hat", refId: "nope" }, noSleep)).rejects.toThrow();
  });
});

describe("passport", () => {
  const p: Passport = {
    version: 1, savedAt: "2026-10-29T00:00:00.000Z", hairHex: "#5A3A22", hairLength: "mid",
    brow: { preset: "SoftArch1", hex: "#3B2A1E", thickness: 0, intensity: 80 }, photoDataUrl: "data:image/jpeg;base64,AAAA",
  };
  it("round-trips through storage and rejects tampered data", () => {
    expect(parsePassport(JSON.stringify(p))).toEqual(p);
    expect(parsePassport(JSON.stringify({ ...p, hairHex: "red" }))).toBeNull();
    expect(parsePassport(JSON.stringify({ ...p, photoDataUrl: "javascript:alert(1)" }))).toBeNull();
    expect(parsePassport("{not json")).toBeNull();
  });
  it("keeps the photo out of the QR payload", () => {
    const q = JSON.parse(qrPayload(p));
    expect(q.photoDataUrl).toBeUndefined();
    expect(q.hairHex).toBe("#5A3A22");
  });
  it("writes fixed-width MRZ lines that encode the recipe", () => {
    const [a, b] = mrzLines(p);
    expect(a).toHaveLength(36);
    expect(a.startsWith("P<AHD<HAIR<5A3A22<MID")).toBe(true);
    expect(b.startsWith("BROW<SOFTARCH1<3B2A1E<T0<I80")).toBe(true);
  });
  it("names broad shade families", () => {
    expect(shadeFamily("#151210")).toBe("Soft black");
    expect(shadeFamily("#D8B878")).toBe("Blonde");
    expect(shadeFamily("#5A3A22")).toMatch(/brown|auburn/i);
  });
});
