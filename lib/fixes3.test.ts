// Regression tests for the wrong-order test + checklist audit fixes. Each failed before its fix.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as passport from "./passport";
import * as render from "./render";

// Never reach YouCam: every upstream call is a spy.
vi.mock("@/lib/youcam", async (orig) => {
  const real = await orig<typeof import("./youcam")>();
  return {
    ...real,
    uploadImage: vi.fn(async () => "file1"),
    normalizeImage: vi.fn(async (b: Buffer) => b),
    startTask: vi.fn(async () => "task1"),
    pollTask: vi.fn(async () => ({ state: "running" })),
  };
});
import * as youcam from "./youcam";
import { POST as renderPOST } from "../app/api/render/route";
import { POST as uploadPOST } from "../app/api/upload/route";
import { GET as pollGET } from "../app/api/render/[feature]/[taskId]/route";

// 1(b): plausibility of a brow / hair tap.
describe("tap plausibility", () => {
  it("rejects a bluish-grey sweater as a brow", () => {
    expect(passport.browSampleProblem("#7E8487")).toBeTruthy();
    expect(passport.browSampleProblem("#3A4A6A")).toBeTruthy(); // blue
  });
  it("rejects a light neutral grey as a brow", () => {
    expect(passport.browSampleProblem("#8A8886")).toBeTruthy();
  });
  it("still accepts real brows, including near-black and the demo brow", () => {
    for (const hex of ["#564843", "#3A2A20", "#2A2627", "#1E1E20", "#6B5040"]) expect(passport.browSampleProblem(hex)).toBeUndefined();
  });
  it("still rejects skin", () => {
    expect(passport.browSampleProblem("#E8C4A8")).toBe(passport.BROW_TOO_LIGHT);
  });
  const wall = ["#C9CCCF", "#CACDD0", "#C8CBCE", "#C9CCD0", "#3A2F2A", "#2C3E50", "#C7CACD", "#CBCED1"];
  it("rejects a hair tap that matches the photo's background", () => {
    expect(passport.hairSampleProblem("#C8CCCF", wall)).toBe(passport.HAIR_IS_BACKGROUND);
  });
  it("accepts a hair tap unlike the background, even if one edge patch is hair", () => {
    expect(passport.hairSampleProblem("#3B302B", wall)).toBeUndefined();
    expect(passport.hairSampleProblem("#3B302B", [])).toBeUndefined();
  });
});

// 2: the brow colour picker's pre-filled default can be accepted as-is.
describe("brow colour picker", () => {
  it("confirming the default records it", () => {
    const d = passport.confirmBrowPick({ hairHex: "#5C3420", browAt: [0.4, 0.3] }, passport.BROW_PICK_DEFAULT);
    expect(d.browHex).toBe("#3A2A20");
    expect(d.browAt).toBeUndefined(); // no tap point for a picked colour
    expect(d.hairHex).toBe("#5C3420");
  });
});

// 3: an unsaved draft survives a reload.
describe("unsaved draft", () => {
  const rec = { photoDataUrl: "data:image/jpeg;base64,AAAA", draft: { hairHex: "#5C3420", browHex: "#3A2A20", hairAt: [0.5, 0.2] } };
  it("round-trips", () => {
    expect(passport.parseDraftState(JSON.stringify(rec))).toEqual(rec);
  });
  it("rejects junk and strips bad fields", () => {
    expect(passport.parseDraftState(null)).toBeNull();
    expect(passport.parseDraftState("{")).toBeNull();
    expect(passport.parseDraftState(JSON.stringify({ ...rec, photoDataUrl: "https://x/y.jpg" }))).toBeNull();
    const bad = passport.parseDraftState(JSON.stringify({ ...rec, draft: { hairHex: "red", browPreset: "Nope", hairLength: "mid", hairAt: [3, 3] } }));
    expect(bad?.draft).toEqual({ hairLength: "mid" });
  });
  it("delete clears every stored key", () => {
    const store = (keys: string[]) => {
      const m = new Map(keys.map((k) => [k, "x"]));
      return { removeItem: (k: string) => void m.delete(k), m };
    };
    const local = store([passport.STORAGE_KEY]);
    const session = store([passport.SESSION_KEY, passport.DRAFT_KEY]);
    passport.forgetStored(local, session);
    expect(local.m.size + session.m.size).toBe(0);
  });
});

// 8: kill switch.
describe("LIVE_OFF kill switch", () => {
  beforeEach(() => vi.stubEnv("LIVE_OFF", "1"));
  afterEach(() => vi.unstubAllEnvs());
  it("render returns 429 capped before any upstream call", async () => {
    const res = await renderPOST(new Request("http://x/api/render", { method: "POST", body: JSON.stringify({ feature: "brow", src: { fileId: "a" }, brow: { preset: "SoftArch1", hex: "#3A2A20" } }) }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Live try-on is paused. Maya's demo still works.", capped: true });
    expect(youcam.startTask).not.toHaveBeenCalled();
  });
  it("upload returns 429 capped before any upstream call", async () => {
    const res = await uploadPOST(new Request("http://x/api/upload", { method: "POST", body: "x", headers: { "content-length": "1" } }));
    expect(res.status).toBe(429);
    expect((await res.json()).capped).toBe(true);
    expect(youcam.uploadImage).not.toHaveBeenCalled();
  });
  it("the client turns a paused upload into the demo fallback", async () => {
    const f = (async () => new Response(JSON.stringify({ error: "Live try-on is paused. Maya's demo still works.", capped: true }), { status: 429 })) as unknown as typeof fetch;
    await expect(render.uploadPhoto(new Blob(["x"]), f)).rejects.toBeInstanceOf(render.CappedError);
  });
});

// 9: the poll route has its own limiter.
describe("poll route rate limit", () => {
  it("stops one client after 600 polls an hour", async () => {
    const req = () => new Request("http://x/api/render/wig/t1", { headers: { "x-real-ip": "9.9.9.9" } });
    const ctx = { params: Promise.resolve({ feature: "wig", taskId: "t1" }) } as never;
    let last = 0;
    for (let i = 0; i < 601; i++) last = (await pollGET(req(), ctx)).status;
    expect(last).toBe(429);
    expect(youcam.pollTask).toHaveBeenCalledTimes(600);
  });
});
