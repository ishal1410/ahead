// Regression tests for docs/FIX_LIST.md logic items. Each one failed before its fix.
import { describe, it, expect } from "vitest";
import * as render from "./render";
import * as passport from "./passport";
import type { DemoManifest } from "./render";
import type { Passport } from "./passport";

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const noSleep = async () => {};
const job = { feature: "brow" as const, src: { fileId: "f1" }, brow: { preset: "Straight1" as const, hex: "#3B2A1E" } };

function fakeFetch(...responses: (Response | Error)[]) {
  const bodies: string[] = [];
  const fn = (async (_url: string, init?: RequestInit) => {
    if (init?.body && typeof init.body === "string") bodies.push(init.body);
    const r = responses.shift();
    if (!r) throw new Error("unexpected fetch");
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  return { fn, bodies };
}

// Item 9: the poll deadline is wall clock, not a sum of sleeps.
describe("renderLive wall-clock deadline", () => {
  it("gives up once 90s of real time has passed, however long each sleep took", async () => {
    let t = 0;
    let polls = 0;
    const running = Array.from({ length: 60 }, () => reply(200, { state: "running" }));
    const { fn } = fakeFetch(reply(202, { taskId: "t1" }), ...running);
    const counted = (async (u: string, i?: RequestInit) => {
      if (u.startsWith("/api/render/")) polls++;
      return fn(u, i);
    }) as unknown as typeof fetch;
    // Each sleep actually takes 40s (a throttled background tab), not the 2s asked for.
    const slowSleep = async () => void (t += 40_000);
    await expect(
      render.renderLive(job, { fetchFn: counted, sleep: slowSleep, intervalMs: 2000, timeoutMs: 90_000, now: () => t } as Parameters<typeof render.renderLive>[1]),
    ).rejects.toThrow(/longer than usual/);
    expect(polls).toBeLessThanOrEqual(3);
  });
});

// Item 10: network failures read as human copy, never "Failed to fetch".
describe("network errors", () => {
  it("maps a fetch TypeError to plain language", async () => {
    const { fn } = fakeFetch(new TypeError("Failed to fetch"));
    const err = await render.renderLive(job, { fetchFn: fn, sleep: noSleep }).catch((e) => e);
    expect(err.message).not.toMatch(/failed to fetch/i);
    expect(err.message).toMatch(/connection/i);
  });
  it("does the same for uploads", async () => {
    const { fn } = fakeFetch(new TypeError("Failed to fetch"));
    const err = await render.uploadPhoto(new Blob(["x"]), fn).catch((e) => e);
    expect(err.message).toMatch(/connection/i);
  });
});

// Items 11 + 12: errors carry a kind the UI can act on.
describe("error kinds", () => {
  it("flags a rejected source photo and a face error", async () => {
    const a = fakeFetch(reply(400, { error: "Missing photo." }));
    const e1 = await render.renderLive(job, { fetchFn: a.fn, sleep: noSleep }).catch((e) => e);
    expect(e1).toBeInstanceOf(render.RenderError);
    expect(e1.kind).toBe("source");
    const b = fakeFetch(reply(202, { taskId: "t1" }), reply(200, { state: "error", error: "We couldn't read the face clearly. Try a front-facing photo." }));
    const e2 = await render.renderLive(job, { fetchFn: b.fn, sleep: noSleep }).catch((e) => e);
    expect(e2.kind).toBe("face");
  });

  it("re-uploads the photo once when the server lost it, then succeeds", async () => {
    const { fn, bodies } = fakeFetch(
      reply(400, { error: "Missing photo." }),
      reply(202, { taskId: "t2" }),
      reply(200, { state: "success", url: "https://x/ok.jpg" }),
    );
    const asked: boolean[] = [];
    const fileId = async (fresh: boolean) => (asked.push(fresh), fresh ? "f2" : "f1");
    const { feature, brow } = job;
    expect(await render.renderFromPhoto({ feature, brow }, fileId, { fetchFn: fn, sleep: noSleep })).toBe("https://x/ok.jpg");
    expect(asked).toEqual([false, true]);
    expect(JSON.parse(bodies[1]).src).toEqual({ fileId: "f2" });
  });

  it("asks the person to upload again when the re-upload is rejected too", async () => {
    const { fn } = fakeFetch(reply(400, { error: "Missing photo." }), reply(400, { error: "Missing photo." }));
    const { feature, brow } = job;
    const err = await render.renderFromPhoto({ feature, brow }, async () => "f", { fetchFn: fn, sleep: noSleep }).catch((e) => e);
    expect(err.kind).toBe("source");
    expect(err.message).toMatch(/upload it again/i);
  });
});

// Items 1, 7, 8: one cache that dedupes in-flight work, drops stale sessions, and expires URLs.
describe("render cache", () => {
  it("shares one in-flight promise for the same key", async () => {
    const c = render.createRenderCache<string>();
    let calls = 0;
    let done!: (v: string) => void;
    const fn = () => (calls++, new Promise<string>((r) => (done = r)));
    const a = c.run("k", fn);
    const b = c.run("k", fn);
    done("u");
    expect((await a).value).toBe("u");
    expect((await b).value).toBe("u");
    expect(calls).toBe(1);
  });

  it("rejects results that land after the session was reset (epoch guard)", async () => {
    const c = render.createRenderCache<string>();
    let done!: (v: string) => void;
    const p = c.run("k", () => new Promise<string>((r) => (done = r)));
    c.reset();
    done("old-session-url");
    await expect(p).rejects.toBeInstanceOf(render.StaleError);
  });

  it("evicts URLs older than 100 minutes and re-renders", async () => {
    let t = 0;
    const c = render.createRenderCache<string>({ now: () => t });
    let calls = 0;
    const fn = async () => `u${++calls}`;
    const first = await c.run("k", fn);
    expect(first.expiresAt).toBe(100 * 60 * 1000);
    t = 99 * 60 * 1000;
    expect((await c.run("k", fn)).value).toBe("u1");
    t = 101 * 60 * 1000;
    expect((await c.run("k", fn)).value).toBe("u2");
  });

  it("does not cache failures", async () => {
    const c = render.createRenderCache<string>();
    let calls = 0;
    await c.run("k", async () => (calls++, Promise.reject(new Error("x")))).catch(() => {});
    await c.run("k", async () => (calls++, "ok"));
    expect(calls).toBe(2);
  });

  it("knows when a stored URL has expired", () => {
    expect(render.isExpired(1000, 999)).toBe(false);
    expect(render.isExpired(1000, 1000)).toBe(true);
    expect(render.isExpired(undefined, 1e15)).toBe(false); // demo files never expire
  });
});

// Data contract: renders.browOnWig is a map by wig id; a string means "unknown wig".
describe("demo brows on wig", () => {
  const base: DemoManifest = {
    persona: { name: "Maya", label: "AI-generated persona", photo: "/demo/p.jpg" },
    passport: { hairHex: "#5A3A22", hairLength: "mid", brow: { preset: "SoftArch1", hex: "#3B2A1E" } },
    renders: { brow: { SoftArch1: "/demo/b.jpg" }, wig: { w1: "/demo/w1.jpg", w2: "/demo/w2.jpg" }, hat: {}, browOnWig: { w1: "/demo/bw1.jpg" } },
  };
  const brow = { preset: "SoftArch1" as const, hex: "#000000" };
  it("looks up the brows for the chosen wig", async () => {
    expect(await render.renderDemo(base, { feature: "brow", brow, wigId: "w1" }, noSleep)).toBe("/demo/bw1.jpg");
    expect(render.demoBrowOnWig(base, "w1")).toBe("/demo/bw1.jpg");
  });
  it("draws on the photo when that wig has no brows-on-wig render", async () => {
    expect(await render.renderDemo(base, { feature: "brow", brow, wigId: "w2" }, noSleep)).toBe("/demo/b.jpg");
    expect(render.demoBrowOnWig(base, "w2")).toBeUndefined();
  });
  it("treats a legacy single-string browOnWig as an unknown wig", async () => {
    const legacy = { ...base, renders: { ...base.renders, browOnWig: "/demo/brow-on-wig.jpg" } } as DemoManifest;
    expect(await render.renderDemo(legacy, { feature: "brow", brow, wigId: "w1" }, noSleep)).toBe("/demo/b.jpg");
    expect(render.demoBrowOnWig(legacy, "w1")).toBeUndefined();
  });
});

const saved: Passport = {
  version: 1, savedAt: "2026-10-29T00:00:00.000Z", hairHex: "#5A3A22", hairLength: "long",
  brow: { preset: "HighArch1", hex: "#3B2A1E", thickness: 0, intensity: 80 }, photoDataUrl: "data:image/jpeg;base64,AAAA",
};

// Item 3: a returning visitor's passport fills the draft.
describe("draftFromPassport", () => {
  it("carries every saved value, and marker positions when present", () => {
    expect(passport.draftFromPassport(saved)).toEqual({ hairHex: "#5A3A22", hairLength: "long", browHex: "#3B2A1E", browPreset: "HighArch1" });
    expect(passport.draftFromPassport({ ...saved, hairAt: [0.5, 0.2], browAt: [0.4, 0.35] })).toMatchObject({ hairAt: [0.5, 0.2], browAt: [0.4, 0.35] });
  });
  it("drops tampered marker positions from storage", () => {
    const p = passport.parsePassport(JSON.stringify({ ...saved, hairAt: [5, "x"], browAt: [0.4, 0.35] }));
    expect(p?.hairAt).toBeUndefined();
    expect(p?.browAt).toEqual([0.4, 0.35]);
  });
});

// Item 4: one shade-naming function; a wig is named from its hex, not a second vocabulary.
describe("shade naming single source", () => {
  it("names a wig with the same function as the saved hair", () => {
    const w = { id: "x", label: "x", shade: "Honey blonde", hex: "#5A3A22", length: "mid" as const, file: "/x.jpg" };
    expect(passport.wigShade(w)).toBe(passport.shadeFamily("#5A3A22"));
  });
});
