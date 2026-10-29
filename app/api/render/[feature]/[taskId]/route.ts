// One poll tick for a running try-on. Always returns quickly; the browser loops.
import { pollTask, isFeature, friendlyError } from "@/lib/youcam";

export async function GET(_req: Request, ctx: RouteContext<"/api/render/[feature]/[taskId]">) {
  const { feature, taskId } = await ctx.params;
  if (!isFeature(feature) || !/^[\w-]{1,256}$/.test(taskId)) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const s = await pollTask(feature, taskId);
  if (s.state === "error") return Response.json({ state: "error", error: friendlyError(s.error) });
  return Response.json(s);
}
