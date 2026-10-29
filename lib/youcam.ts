// YouCam (Perfect Corp) S2S client for the three try-on features Ahead uses.
// Every feature follows the same verified flow: generic file init -> presigned PUT
// -> task create -> poll. Shapes were pinned against live calls on 2026-10-28/29
// (scripts/test-hair-transfer.mjs, scripts/test-brow-vto.mjs).

import sharp from "sharp";

const BASE = process.env.PERFECTCORP_BASE_URL || "https://yce-api-01.makeupar.com";

export type Feature = "wig" | "hat" | "brow";

// Task endpoints per feature. Hair transfer is the v2.1 API; the others are v2.0.
const TASK_PATH: Record<Feature, string> = {
  wig: "/s2s/v2.1/task/hair-transfer",
  hat: "/s2s/v2.0/task/hat",
  brow: "/s2s/v2.0/task/makeup-vto",
};

export function isFeature(v: unknown): v is Feature {
  return v === "wig" || v === "hat" || v === "brow";
}

function auth() {
  const key = process.env.PERFECTCORP_API_KEY;
  if (!key) throw new Error("PERFECTCORP_API_KEY is not configured");
  return { Authorization: `Bearer ${key}` };
}

// Caps decoded pixels so a tiny-on-disk decompression bomb can't OOM the instance
// (the byte cap in the route bounds bytes, not pixels).
const SHARP_INPUT = { limitInputPixels: 40_000_000 } as const;

// Hair transfer requires jpg with the long side <= 1024; the other features accept
// that too, so every upload is normalized once to the strictest spec.
export async function normalizeImage(buf: Buffer): Promise<Buffer> {
  return sharp(buf, SHARP_INPUT)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// Upload one image and return its file_id. The file API is generic across features.
export async function uploadImage(jpg: Buffer): Promise<string> {
  const initRes = await fetch(`${BASE}/s2s/v2.0/file`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ files: [{ content_type: "image/jpg", file_name: "image.jpg", file_size: jpg.length }] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!initRes.ok) throw new Error(`file init failed: ${initRes.status} ${await initRes.text().catch(() => "")}`.trim());
  const file = (await initRes.json())?.data?.files?.[0];
  const req = file?.requests?.[0];
  if (!file?.file_id || !req?.url) throw new Error("file init returned no upload target");
  if (!String(req.url).startsWith("https://")) throw new Error("upload url is not https");

  // The S3 signature covers the prescribed headers; omitting them 403s.
  const put = await fetch(req.url, {
    method: "PUT",
    headers: req.headers ?? { "Content-Type": "image/jpg" },
    body: new Uint8Array(jpg),
    signal: AbortSignal.timeout(20000),
  });
  if (!put.ok) throw new Error(`upload failed: ${put.status}`);
  return file.file_id as string;
}

// A source image is either a fresh upload (file id) or a previous YouCam result
// (chaining: a wig render becomes the input to the hat or brow try-on).
export type Source = { fileId: string } | { url: string };

function srcFields(src: Source) {
  return "fileId" in src ? { src_file_id: src.fileId } : { src_file_url: src.url };
}

export interface BrowRecipe {
  preset: string;    // shape label from YouCam's eyebrows.json, e.g. "SoftArch1"
  thickness: number; // -100..100, relative to the detected brow
  hex: string;       // "#RRGGBB"
  intensity: number; // 0..100
}

export function buildTaskBody(feature: Feature, src: Source, opts: { refFileId?: string; brow?: BrowRecipe; gender?: string }) {
  if (feature === "wig") return { ...srcFields(src), ref_file_id: opts.refFileId };
  if (feature === "hat") {
    // gender + style are required by the hat API; style only shapes the generated
    // outfit context, so one neutral style keeps results consistent.
    return { ...srcFields(src), ref_file_id: opts.refFileId, gender: opts.gender ?? "female", style: "style_warm_cozy" };
  }
  const b = opts.brow!;
  return {
    ...srcFields(src),
    effects: [{
      category: "eyebrows",
      pattern: { type: "shape", name: b.preset, curvature: 0, thickness: b.thickness, definition: 60 },
      palettes: [{ color: b.hex, colorIntensity: b.intensity, texture: "matte" }],
    }],
    version: "1.0",
  };
}

export async function startTask(feature: Feature, body: object): Promise<string> {
  const res = await fetch(`${BASE}${TASK_PATH[feature]}`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`task create failed: ${res.status} ${await res.text().catch(() => "")}`.trim());
  const taskId = (await res.json())?.data?.task_id;
  if (typeof taskId !== "string") throw new Error("task create returned no task_id");
  return taskId;
}

export type TaskState =
  | { state: "running" }
  | { state: "success"; url: string }
  | { state: "error"; error: string };

// Docs disagree on the success shape: the example uses results.url, the schema
// table results[].download_url. Accept both.
export function resultUrl(results: unknown): string | null {
  if (!results) return null;
  if (Array.isArray(results)) {
    const r = results[0] as Record<string, unknown> | undefined;
    const u = r?.url ?? r?.download_url;
    return typeof u === "string" ? u : null;
  }
  const u = (results as Record<string, unknown>).url ?? (results as Record<string, unknown>).download_url;
  return typeof u === "string" ? u : null;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

// One poll tick. Transient failures read as "running" so the browser keeps
// polling instead of discarding a task whose unit is already spent.
export async function pollTask(feature: Feature, taskId: string): Promise<TaskState> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${TASK_PATH[feature]}/${encodeURIComponent(taskId)}`, {
      headers: auth(),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { state: "running" };
  }
  if (!res.ok) {
    if (RETRYABLE.has(res.status)) return { state: "running" };
    return { state: "error", error: `poll ${res.status}` };
  }
  let data: Record<string, unknown> | undefined;
  try {
    data = (await res.json())?.data;
  } catch {
    return { state: "running" };
  }
  const st = data?.task_status;
  if (st === "success") {
    const url = resultUrl(data?.results);
    return url ? { state: "success", url } : { state: "error", error: "success without a result url" };
  }
  if (st === "error") return { state: "error", error: String(data?.error ?? "task_error") };
  return { state: "running" };
}

// Map upstream error codes to copy a person can act on.
export function friendlyError(raw: string): string {
  if (/face|landmark|shoulder|pose|angle/i.test(raw)) return "We couldn't read the face clearly. Try a front-facing photo with your face and shoulders in frame and even light.";
  if (/hair_too_short/i.test(raw)) return "This style needs a little visible hair in the photo. Try the photo you saved before treatment.";
  if (/CreditInsufficiency/i.test(raw)) return "Live try-on is paused right now. Maya's demo still works.";
  if (/nsfw/i.test(raw)) return "That photo couldn't be processed. Please use a regular portrait.";
  return "The try-on didn't finish. Please try again.";
}
