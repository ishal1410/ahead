// Start one try-on (wig, hat, or brows). Returns a task id the browser polls.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildTaskBody, startTask, uploadImage, normalizeImage, isFeature, friendlyError, type Source, type BrowRecipe } from "@/lib/youcam";
import { findRef, isBrowPreset } from "@/lib/catalog";
import { clientIdentity, RateLimiter } from "@/lib/guards";

// Every successful task spends 1-2 units. The global cap is the real spend bound
// (per-instance, so it is best-effort on serverless); when it trips, the UI falls
// back to Maya's pre-rendered demo.
const limiter = new RateLimiter({ windowMs: 24 * 60 * 60 * 1000, perClient: 16, global: 60 });

// Chained sources must be a previous YouCam result, never an arbitrary URL we
// would hand upstream on a caller's behalf.
function isYouCamResult(u: unknown): u is string {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".amazonaws.com");
  } catch {
    return false;
  }
}

function parseSource(raw: unknown): Source | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.fileId === "string" && /^[\w.-]{1,256}$/.test(r.fileId)) return { fileId: r.fileId };
  if (isYouCamResult(r.url)) return { url: r.url };
  return null;
}

function parseBrow(raw: unknown): BrowRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isBrowPreset(r.preset)) return null;
  if (typeof r.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(r.hex)) return null;
  const clamp = (v: unknown, lo: number, hi: number, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;
  return { preset: r.preset as string, hex: r.hex, thickness: clamp(r.thickness, -100, 100, 0), intensity: clamp(r.intensity, 0, 100, 80) };
}

async function uploadRef(file: string): Promise<string> {
  // ponytail: re-uploads the reference on every call (~1s); cache file ids if latency matters
  const buf = await readFile(path.join(process.cwd(), "public", file));
  return uploadImage(await normalizeImage(buf));
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const feature = body.feature;
  if (!isFeature(feature)) return Response.json({ error: "Unknown try-on." }, { status: 400 });
  const src = parseSource(body.src);
  if (!src) return Response.json({ error: "Missing photo." }, { status: 400 });

  let opts: { refFileId?: string; brow?: BrowRecipe } = {};
  let refFile: string | undefined;
  if (feature === "brow") {
    const brow = parseBrow(body.brow);
    if (!brow) return Response.json({ error: "Invalid brow recipe." }, { status: 400 });
    opts = { brow };
  } else {
    const ref = typeof body.refId === "string" ? findRef(feature, body.refId) : undefined;
    if (!ref) return Response.json({ error: "Unknown style." }, { status: 400 });
    refFile = ref.file;
  }

  const verdict = limiter.check(clientIdentity(req.headers), Date.now());
  if (!verdict.allowed) {
    return Response.json(
      { error: verdict.reason === "global" ? "Live try-on has reached today's limit. Maya's demo still works." : "You've reached the try-on limit for today.", capped: true },
      { status: 429 },
    );
  }

  try {
    if (refFile) opts.refFileId = await uploadRef(refFile);
    const taskId = await startTask(feature, buildTaskBody(feature, src, opts));
    return Response.json({ taskId }, { status: 202 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("render start failed", msg);
    return Response.json({ error: friendlyError(msg) }, { status: 502 });
  }
}
