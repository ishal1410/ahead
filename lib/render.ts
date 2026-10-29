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

// Thrown when the server's daily spend cap trips; the UI offers Maya's demo instead.
export class CappedError extends Error {}

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
  const res = await fetchFn("/api/upload", { method: "POST", body: form });
  const body = await json(res);
  if (!res.ok || typeof body.fileId !== "string") throw new Error(String(body.error ?? "Upload failed. Please try again."));
  return body.fileId;
}

export async function renderLive(
  job: RenderJob,
  { fetchFn = fetch, sleep = wait, intervalMs = 2000, timeoutMs = 90000 }: { fetchFn?: Fetch; sleep?: (ms: number) => Promise<void>; intervalMs?: number; timeoutMs?: number } = {},
): Promise<string> {
  const start = await fetchFn("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  const started = await json(start);
  if (start.status === 429 && started.capped) throw new CappedError(String(started.error ?? "Live try-on is paused for today."));
  if (!start.ok || typeof started.taskId !== "string") throw new Error(String(started.error ?? "The try-on could not start."));

  const pollUrl = `/api/render/${job.feature}/${encodeURIComponent(started.taskId)}`;
  for (let elapsed = 0; elapsed < timeoutMs; elapsed += intervalMs) {
    await sleep(intervalMs);
    const res = await fetchFn(pollUrl);
    const s = await json(res);
    if (s.state === "success" && typeof s.url === "string") return s.url;
    if (s.state === "error" || !res.ok) throw new Error(String(s.error ?? "The try-on did not finish."));
  }
  throw new Error("This is taking longer than usual. Please try again.");
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
    browOnWig?: string;
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

// Same job shape as live; answered from the manifest after a short, honest pause.
export async function renderDemo(
  m: DemoManifest,
  job: { feature: Feature; refId?: string; brow?: BrowRequest; onWig?: boolean },
  sleep = wait,
): Promise<string> {
  await sleep(1200);
  const r = m.renders;
  const url =
    job.feature === "brow"
      ? (job.onWig && r.browOnWig) || (job.brow && r.brow[job.brow.preset])
      : job.refId
        ? (job.feature === "wig" ? r.wig : r.hat)[job.refId]
        : undefined;
  if (!url) throw new Error("This look isn't part of the pre-rendered demo.");
  return url;
}
