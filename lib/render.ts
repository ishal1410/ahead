// Browser-side client for the try-on API, plus the pre-rendered demo (Maya).
// No DOM here: fetch and sleep are injectable so the polling logic is unit-tested.

import type { HatRef, WigRef, Length } from "./catalog";
import type { BrowPresetId } from "./passport";

export type Feature = "wig" | "hat" | "brow";
export type Source = { fileId: string } | { url: string };
export interface BrowRequest { preset: BrowPresetId; hex: string; thickness?: number; intensity?: number }
export interface RenderJob { feature: Feature; src: Source; refId?: string; brow?: BrowRequest }

type Fetch = typeof fetch;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// What went wrong, in a form the UI can act on (not just show).
export type RenderErrorKind = "capped" | "source" | "face" | "network" | "other";
export class RenderError extends Error {
  kind: RenderErrorKind;
  constructor(message: string, kind: RenderErrorKind = "other") {
    super(message);
    this.kind = kind;
  }
}
// Thrown when the server's daily spend cap trips; the UI offers Maya's demo instead.
export class CappedError extends RenderError {
  constructor(message: string) {
    super(message, "capped");
  }
}
// A result that arrived after the person started over; callers drop it silently.
export class StaleError extends Error {
  constructor() {
    super("This result belongs to an earlier session.");
  }
}

export const NETWORK_COPY = "We couldn't reach Ahead. Check your connection and try again.";
export const LOST_PHOTO_COPY = "We lost the connection to your photo. Please upload it again.";

// fetch rejects (TypeError "Failed to fetch") only when the network itself failed.
async function call(fetchFn: Fetch, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetchFn(url, init);
  } catch {
    throw new RenderError(NETWORK_COPY, "network");
  }
}

const kindOf = (msg: string): RenderErrorKind => (/face/i.test(msg) ? "face" : "other");

async function json(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function uploadPhoto(blob: Blob, fetchFn: Fetch = fetch): Promise<string> {
  const form = new FormData();
  form.append("image", blob, "photo.jpg");
  const res = await call(fetchFn, "/api/upload", { method: "POST", body: form });
  const body = await json(res);
  if (!res.ok || typeof body.fileId !== "string") throw new RenderError(String(body.error ?? "Upload failed. Please try again."));
  return body.fileId;
}

export interface LiveOptions { fetchFn?: Fetch; sleep?: (ms: number) => Promise<void>; intervalMs?: number; timeoutMs?: number; now?: () => number }

export async function renderLive(
  job: RenderJob,
  { fetchFn = fetch, sleep = wait, intervalMs = 2000, timeoutMs = 90000, now = Date.now }: LiveOptions = {},
): Promise<string> {
  const start = await call(fetchFn, "/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  const started = await json(start);
  if (start.status === 429 && started.capped) throw new CappedError(String(started.error ?? "Live try-on is paused for today."));
  if (start.status === 400 && /photo/i.test(String(started.error))) throw new RenderError(String(started.error), "source");
  if (!start.ok || typeof started.taskId !== "string") {
    const msg = String(started.error ?? "The try-on could not start.");
    throw new RenderError(msg, kindOf(msg));
  }

  // Wall clock, not a sum of sleeps: a throttled background tab sleeps far longer than asked.
  const deadline = now() + timeoutMs;
  const pollUrl = `/api/render/${job.feature}/${encodeURIComponent(started.taskId)}`;
  while (now() < deadline) {
    await sleep(intervalMs);
    const res = await call(fetchFn, pollUrl);
    const s = await json(res);
    if (s.state === "success" && typeof s.url === "string") return s.url;
    if (s.state === "error" || !res.ok) {
      const msg = String(s.error ?? "The try-on did not finish.");
      throw new RenderError(msg, kindOf(msg));
    }
  }
  throw new RenderError("This is taking longer than usual. Please try again.");
}

// A try-on on the original photo. If the server no longer accepts the uploaded
// photo, upload it again once (fileId(true)) before asking the person to.
export async function renderFromPhoto(
  job: Omit<RenderJob, "src">,
  fileId: (fresh: boolean) => Promise<string>,
  opts?: LiveOptions,
): Promise<string> {
  try {
    return await renderLive({ ...job, src: { fileId: await fileId(false) } }, opts);
  } catch (e) {
    if (!(e instanceof RenderError && e.kind === "source")) throw e;
  }
  try {
    return await renderLive({ ...job, src: { fileId: await fileId(true) } }, opts);
  } catch (e) {
    if (e instanceof RenderError && e.kind === "source") throw new RenderError(LOST_PHOTO_COPY, "source");
    throw e;
  }
}

// Result URLs are signed for ~2h; treat them as gone after 100 minutes.
export const RESULT_TTL_MS = 100 * 60 * 1000;
export const isExpired = (expiresAt: number | undefined, now = Date.now()) => expiresAt !== undefined && now >= expiresAt;

// One cache for every try-on in a session: the in-flight promise is shared (two
// clicks, or a remounted screen, never spend twice), entries expire with their
// URLs, failures are not kept, and reset() makes anything still running stale.
export function createRenderCache<T>({ now = Date.now, ttlMs = RESULT_TTL_MS }: { now?: () => number; ttlMs?: number } = {}) {
  const entries = new Map<string, { expiresAt: number; promise: Promise<T> }>();
  let epoch = 0;
  return {
    reset() {
      epoch++;
      entries.clear();
    },
    run(key: string, fn: () => Promise<T>): Promise<{ value: T; expiresAt: number }> {
      const mine = epoch;
      let entry = entries.get(key);
      if (!entry || now() >= entry.expiresAt) {
        const fresh = { expiresAt: now() + ttlMs, promise: fn() };
        entries.set(key, fresh);
        fresh.promise.catch(() => entries.get(key) === fresh && entries.delete(key));
        entry = fresh;
      }
      const { expiresAt, promise } = entry;
      return promise.then(
        (value) => {
          if (epoch !== mine) throw new StaleError();
          return { value, expiresAt };
        },
        (err) => {
          throw epoch !== mine ? new StaleError() : err;
        },
      );
    },
  };
}

// /public/demo/manifest.json. `wigs`/`hats` are optional: they let the demo show
// cards before the live catalogue is filled; when lib/catalog has entries, those win.
export interface DemoManifest {
  persona: { name: string; label: string; photo: string };
  passport: { hairHex: string; hairLength: Length; brow: { preset: BrowPresetId; hex: string; thickness?: number; intensity?: number } };
  renders: {
    brow: Partial<Record<BrowPresetId, string>>;
    wig: Record<string, string>;
    hat: Record<string, string>;
    // Brows drawn on each wig render, by wig id. A plain string is the legacy
    // single render whose wig is unknown, so it is never shown as "on your wig".
    browOnWig?: Record<string, string> | string;
  };
  wigs?: WigRef[];
  hats?: HatRef[];
}

export async function loadManifest(fetchFn: Fetch = fetch): Promise<DemoManifest | null> {
  try {
    const res = await fetchFn("/demo/manifest.json", { cache: "no-store" });
    if (!res.ok) return null;
    const m = await res.json();
    return m?.persona?.photo && m?.passport && m?.renders ? (m as DemoManifest) : null;
  } catch {
    return null;
  }
}

export function demoBrowOnWig(m: DemoManifest, wigId: string | undefined): string | undefined {
  const map = m.renders.browOnWig;
  return wigId && map && typeof map === "object" ? map[wigId] : undefined;
}

// Same job shape as live; answered from the manifest after a short, honest pause.
// Brows on a wig the demo has no render for are drawn on the photo instead.
export async function renderDemo(
  m: DemoManifest,
  job: { feature: Feature; refId?: string; brow?: BrowRequest; wigId?: string },
  sleep = wait,
): Promise<string> {
  await sleep(1200);
  const r = m.renders;
  const url =
    job.feature === "brow"
      ? demoBrowOnWig(m, job.wigId) ?? (job.brow && r.brow[job.brow.preset])
      : job.refId
        ? (job.feature === "wig" ? r.wig : r.hat)[job.refId]
        : undefined;
  if (!url) throw new Error("This look isn't part of the pre-rendered demo.");
  return url;
}
