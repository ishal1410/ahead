# Vibe Coding Checklist audit — Ahead (2026-10-30)

Source: praneethkalluri.com/vibe-coding-checklist (50 items). Repo HEAD + live https://ahead-beta.vercel.app.
Totals: **PASS 12 · FAIL 18 · N/A 20**. (USER) = only the owner can do it (dashboard/legal).

## Git history secret scan
`git log -p --all -S` for `sk_`, `sk-`, `pk_`, `PERFECTCORP_API_KEY=`, `Bearer `, `pollinations`, and a generic `key|token|secret|password = "<16+ chars>"` regex (6 commits).
Result: **no secret values in history.** `sk_` hits are `task_status` code; `PERFECTCORP_API_KEY=` is the empty line in `.env.example`; `Bearer` hits read `process.env`; generic hits are header names in `next.config.ts`. `.gitignore` ignores `.env*` (keeps `!.env.example`).

## Ranked FAILs (highest risk first)

| # | Item | Risk | Minimal fix |
|---|------|------|-------------|
| 44 | Applicable laws (BIPA / GDPR Art 9 / CCPA) | Face photos go to YouCam for face/landmark processing. If that counts as face geometry, Illinois BIPA needs written informed consent + a public retention/destruction policy before collection ($1k-5k per violation, private right of action). For EU users it may be GDPR special-category data (Art 9 explicit consent). Only an inline note exists (`app/ahead/Landing.tsx:8`). | Add a consent checkbox gating `/api/upload` ("I consent to my photo being processed by Perfect Corp/YouCam to render try-ons; not stored by Ahead"), name the processor + retention in a policy. Or block IL/EU. (USER for legal call) |
| 43 | Privacy policy + terms | `/privacy` returns 404; no terms. | Add `/privacy` and `/terms` pages (processor = Perfect Corp, no server storage, localStorage, contact, not-medical-advice, AI persona). |
| 9/10 | Keys pasted in chat / rotate before live | Pollinations key was pasted into chat. Not used by the deployed app, but it counts as leaked. Unknown whether the YouCam key ever appeared in chat or logs. | Rotate the Pollinations key in its dashboard and update local `.env.local`. Rotate the YouCam key before judging if it was ever shown anywhere. (USER) |
| 27/26 | Per-user cap / hard spend cap | `RateLimiter` is in memory per instance (`lib/guards.ts:43-47`). Render caps are 16 per client and 60 global per day (`app/api/render/route.ts:12`), and they reset on every cold start or new instance. Each instance can burn up to 60 tasks x 2 units = 120 units/day, and there is no ceiling across instances. In practice the hard stop is the prepaid balance (~518 units), so a scripted caller could drain it in one day. | Move the limiter to a free shared store (Upstash Redis free tier, `@upstash/ratelimit`), or keep a daily counter in Vercel KV/Edge Config. Turn off any auto-recharge on the YouCam account. (USER: check billing) |
| 11 | Separate dev/prod keys | `.env.local` uses the same YouCam key as Production, so local test runs and scripts spend the prod balance, and a leak from the laptop is a prod leak. | Get a second YouCam key (or a sandbox) for local use. (USER) |
| 29/49 | Billing alerts / alerts to phone | No low-balance or error-spike alerts. | Set a YouCam low-credit email alert if offered, plus Vercel usage notifications forwarded to your phone. (USER) |
| 48 | Maintenance mode without redeploy | No kill switch for live renders. | In `app/api/render/route.ts`: `if (process.env.LIVE_OFF) return 429 {capped:true}`. The UI already falls back to the demo. Changing an env var still needs a redeploy on Vercel, so Edge Config is the true no-deploy option. |
| 45 | Real delete | No button to erase the Look Passport. Nothing calls `localStorage.removeItem` (only sessionStorage, `AheadApp.tsx:150`). | Add "Delete my passport" that calls `localStorage.removeItem(STORAGE_KEY)`. |
| 42 | Human review of sensitive-data flow | Face photos with a paid key, never reviewed by a human. | One-hour review by a developer. (USER) |
| 36/38 | Error tracking / 30-day logs | Only `console.error` to Vercel runtime logs (`upload/route.ts:43`, `render/route.ts:91`). Hobby-plan retention is short (about 1 hour). | Sentry free tier, or a log drain. |
| 34 | Health + uptime | `/api/health` returns 404. | Add `app/api/health/route.ts` returning `ok`, then point free UptimeRobot at it. (USER: monitor signup) |
| 30 | Staging | Preview deployments, if Production-scoped env is copied, would share the prod key. | Scope `PERFECTCORP_API_KEY` to Production only in Vercel (Preview gets the dev key). |
| 47 | Disaster runbook | None. | A half-page doc: rotate the YouCam key, flip `LIVE_OFF`, redeploy. |
| 50 | Shared access / renewals | Single owner for Vercel, GitHub and YouCam. | Store credentials in a password manager and share with one trusted person. (USER) |

## PASS (evidence)
- 12 `.env*` ignored (`.gitignore`), history clean (above).
- 22 Server validation: `parseSource`/`parseBrow`/feature/ref allowlist (`app/api/render/route.ts:29-47,62-75`); taskId regex (`app/api/render/[feature]/[taskId]/route.ts:8`); chained URL pinned to the YouCam bucket host (SSRF-safe, `render/route.ts:16-26`).
- 23 Upload cap 10 MB plus content-length precheck and magic-byte sniff (`app/api/upload/route.ts:7,15-17,30`; `lib/guards.ts:5-11`).
- 24 Rate limits on upload/render, with a non-spoofable identity (`lib/guards.ts:22-34`). The serverless ceiling is covered under 27.
- 25 No user content is shown to other users. React escapes the holder name (`MatchCard.tsx:93`).
- 28 Client poll loop has a 90 s deadline (`lib/render.ts:72,88-90`), and requests are deduplicated so the same inputs never spend twice (`AheadApp.tsx:192`).
- 31 Generic errors only (`lib/youcam.ts:167-173`). Live malformed POST returns `{"error":"Bad request."}`.
- 32 API sends no `Access-Control-Allow-Origin` (tested with a foreign Origin). The static `*` on HTML is Vercel's default and harmless.
- 33 HSTS preload served live.
- 37 Photos and keys are never logged. Only the error message is logged.
- 39 Git in use. 41 README "Privacy and honesty" section.
- Health/persona disclosure (asked for in the brief): "Not medical advice" (`Landing.tsx:236`, README:42,54); AI persona disclosed (`Landing.tsx:130`, `ui.tsx:42`, `MatchCard.tsx:93`).

Note: the poll route (`/api/render/[feature]/[taskId]`) has no rate limit. It relays GETs to YouCam with our key. Polling appears to be free, but it should share the render limiter.

## N/A (20)
1-8 (no database) · 13-16 (no accounts/sessions) · 17-21 (no admin panel) · 35 (no email sent) · 40 (process item, can't be verified from the repo) · 46 (no analytics or non-essential cookies, only localStorage for the user's own data).
