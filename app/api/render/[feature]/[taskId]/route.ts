// One poll tick for a running try-on. Always returns quickly; the browser loops.
import { pollTask, isFeature, friendlyError } from "@/lib/youcam";
import { clientIdentity, RateLimiter } from "@/lib/guards";

// A render polls every 2 s for up to 90 s (~45 polls), so 600/hour is ~13 renders per
// client. This only stops the route being an unlimited relay for our key.
const limiter = new RateLimiter({ windowMs: 60 * 60 * 1000, perClient: 600, global: 6000 });

export async function GET(req: Request, ctx: RouteContext<"/api/render/[feature]/[taskId]">) {
  const { feature, taskId } = await ctx.params;
  // Task ids are base64-like; allow '+', '/' and '=' like file ids (the client
  // URL-encodes the segment, and pollTask re-encodes it upstream).
  if (!isFeature(feature) || !/^[A-Za-z0-9+/=_.-]{1,512}$/.test(taskId)) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  if (!limiter.check(clientIdentity(req.headers), Date.now()).allowed) {
    return Response.json({ error: "Too many checks on this try-on. Please wait a little and try again." }, { status: 429 });
  }
  const s = await pollTask(feature, taskId);
  if (s.state === "error") return Response.json({ state: "error", error: friendlyError(s.error) });
  return Response.json(s);
}
