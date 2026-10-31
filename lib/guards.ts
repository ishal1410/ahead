// Request guards copied from GlowRead (skincare-coach/lib/requestGuards.ts), where they are unit-tested.

// Verify real image magic bytes rather than trusting the client-supplied MIME.
// Returns the canonical MIME, or null if the bytes are not a supported image.
export function sniffImageMime(buf: Uint8Array): string | null {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}
// Kill switch: LIVE_OFF=1 stops every upstream call; the UI falls back to Maya's demo.
export function liveOff(): Response | null {
  return process.env.LIVE_OFF === "1"
    ? Response.json({ error: "Live try-on is paused. Maya's demo still works.", capped: true }, { status: 429 })
    : null;
}

export interface HeaderBag { get(name: string): string | null }

// Identity used for rate limiting. ONLY platform-set headers are trusted:
// `x-forwarded-for` is client-writable, so a caller can rotate it to mint a
// fresh bucket on every request and walk straight past a per-IP limit (verified
// against this app). Platform headers (`x-vercel-forwarded-for`, `x-real-ip`)
// are stripped from the inbound request and re-set by the edge, so they can't
// be forged. XFF is only a last resort, and even then we take the RIGHTMOST
// entry (the hop nearest us). Whatever this returns, the global cap in
// RateLimiter is what actually bounds spend.
export function clientIdentity(headers: HeaderBag): string {
  const platform = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip");
  if (platform) {
    const first = platform.split(",")[0]?.trim();
    if (first) return first;
  }
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "local";
}

export type RateVerdict = { allowed: true } | { allowed: false; reason: "client" | "global" };

export interface RateLimiterOptions {
  windowMs: number;
  perClient: number;
  global: number;      // hard ceiling across ALL identities in the window
  maxClients?: number; // memory bound on tracked identities
}

// Sliding-window limiter with two ceilings. The per-client cap keeps one user
// polite; the GLOBAL cap is the denial-of-wallet defense, because it holds even
// when the caller rotates its identity. In-memory and per-instance (a real
// deploy should front it with a shared store, e.g. Upstash).
export class RateLimiter {
  private readonly windowMs: number;
  private readonly perClient: number;
  private readonly globalMax: number;
  private readonly maxClients: number;
  private readonly hits = new Map<string, number[]>();
  private globalHits: number[] = [];

  constructor(opts: RateLimiterOptions) {
    this.windowMs = opts.windowMs;
    this.perClient = opts.perClient;
    this.globalMax = opts.global;
    this.maxClients = opts.maxClients ?? 5000;
  }

  size(): number {
    return this.hits.size;
  }

  check(id: string, now: number): RateVerdict {
    const cutoff = now - this.windowMs;

    const recent = (this.hits.get(id) ?? []).filter((t) => t > cutoff);
    recent.push(now);
    this.hits.set(id, recent);

    this.globalHits = this.globalHits.filter((t) => t > cutoff);
    this.globalHits.push(now);

    this.evict(cutoff);

    if (recent.length > this.perClient) return { allowed: false, reason: "client" };
    if (this.globalHits.length > this.globalMax) return { allowed: false, reason: "global" };
    return { allowed: true };
  }

  // Bound memory WITHOUT wiping live buckets. The old `hits.clear()` let a
  // flood of throwaway identities reset every bucket — including one that was
  // currently blocked. Instead: drop identities whose hits have all aged out,
  // then the quietest/least-recent ones, so a client at its limit survives.
  private evict(cutoff: number): void {
    if (this.hits.size <= this.maxClients) return;

    for (const [key, times] of this.hits) {
      if (times.length === 0 || times[times.length - 1] <= cutoff) this.hits.delete(key);
    }
    if (this.hits.size <= this.maxClients) return;

    const byExpendability = [...this.hits.entries()].sort(
      (a, b) => a[1].length - b[1].length || (a[1].at(-1) ?? 0) - (b[1].at(-1) ?? 0)
    );
    for (const [key] of byExpendability) {
      if (this.hits.size <= this.maxClients) return;
      this.hits.delete(key);
    }
  }
}
