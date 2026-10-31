import { describe, expect, it } from "vitest";
import { RateLimiter } from "./guards";

describe("RateLimiter", () => {
  it("a client past its own limit does not use up the shared budget", () => {
    const rl = new RateLimiter({ windowMs: 1000, perClient: 2, global: 3 });
    for (let i = 0; i < 50; i++) rl.check("spammer", 1);
    expect(rl.check("judge", 2)).toEqual({ allowed: true });
  });

  it("enforces per-client and global limits exactly", () => {
    const rl = new RateLimiter({ windowMs: 1000, perClient: 2, global: 3 });
    expect(rl.check("a", 1).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(true);
    expect(rl.check("a", 1)).toEqual({ allowed: false, reason: "client" });
    expect(rl.check("b", 1).allowed).toBe(true);
    expect(rl.check("c", 1)).toEqual({ allowed: false, reason: "global" });
    expect(rl.check("c", 1002).allowed).toBe(true); // window passed
  });
});
