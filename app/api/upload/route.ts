// Upload a selfie once; the returned file id is reused by every try-on that
// starts from the original photo.
import { normalizeImage, uploadImage } from "@/lib/youcam";
import { sniffImageMime, clientIdentity, RateLimiter } from "@/lib/guards";

const MAX_BYTES = 10 * 1024 * 1024;
// Uploads are free upstream; this only stops the endpoint being used as a relay.
const limiter = new RateLimiter({ windowMs: 60 * 60 * 1000, perClient: 20, global: 300 });

export async function POST(req: Request) {
  if (!limiter.check(clientIdentity(req.headers), Date.now()).allowed) {
    return Response.json({ error: "Too many uploads. Please wait a little and try again." }, { status: 429 });
  }
  const len = Number(req.headers.get("content-length"));
  if (!len || len > MAX_BYTES + 64 * 1024) {
    return Response.json({ error: "Please upload a photo under 10 MB." }, { status: 413 });
  }

  let file: File | null;
  try {
    file = (await req.formData()).get("image") as File | null;
  } catch {
    return Response.json({ error: "Please upload a photo." }, { status: 400 });
  }
  if (!file || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "Please upload a photo." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImageMime(buf)) {
    return Response.json({ error: "Please upload a JPEG, PNG, or WebP photo." }, { status: 400 });
  }

  let jpg: Buffer;
  try {
    jpg = await normalizeImage(buf);
  } catch {
    return Response.json({ error: "That image couldn't be read. Please try another photo." }, { status: 400 });
  }

  try {
    return Response.json({ fileId: await uploadImage(jpg) });
  } catch (e) {
    console.error("upload failed", e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
