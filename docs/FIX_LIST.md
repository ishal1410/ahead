# Ahead — consolidated bug fix list (from 4 harsh testers, 2026-10-30)

Evidence folders: C:\Users\vp141\AppData\Local\Temp\claude\C--Users-vp141\304f02ed-55bd-4d69-a6f0-aac9b25791dd\scratchpad\bughunt\{qa,edge,judge}\

ALREADY FIXED by lead (do not redo): fileId/taskId validation rejecting '+' '/' (app/api/render/*), chained-URL host pinned. Colour measurement (lib/color.ts hairHexFromPixels, catalog hex values, Maya's passport hex, demo browOnWig renders) is being reworked by the lead — do NOT edit lib/color.ts, lib/catalog.ts, scripts/, public/demo/.

## Data-contract change you must support
`public/demo/manifest.json` → `renders.browOnWig` becomes a MAP `{ [wigId]: url }` (was a single string). Update `DemoManifest` type + `renderDemo` in lib/render.ts: brows-on-wig in demo = `renders.browOnWig[look.wig.id]`; if missing for that wig, draw brows on the photo (renders.brow[preset]) and caption it truthfully ("drawn on your photo"). Keep backward compatibility with a string value (treat as unknown wig → fall back to photo).

## P1
1. **Stale render lands in another session** (AheadApp.tsx:93-114, Rebuild.tsx:93-98): add a session epoch ref; ignore results from an old epoch; use functional setLook.
2. **Brow caption lies** (Rebuild.tsx ~97,232; judge #3, qa B4): "Drawn with the wig you chose" must only show when the stage image actually is brows-on-the-chosen-wig. In live mode, when a wig is chosen and the user clicks Draw my brows, the brow render MUST chain onto the wig URL (cache key must include the source URL — qa saw it reuse the photo render and send no POST). After a new wig is chosen, a previous brows-on-old-wig must be cleared (already partly done) and brows-on-photo must not be captioned as on-wig.
3. **Returning visitor sees empty passport** (AheadApp.tsx openSaved, qa B3, edge B5, find-bugs #8): fill draft from the saved passport (hairHex, hairLength, browHex, browPreset, thickness, intensity, marker positions if any) so the Passport page shows the saved values.
4. **Match Card contradicts itself** (MatchCard.tsx:108; judge #4, edge B3, qa B5, find-bugs #5): split into two clearly labelled groups: "Your saved hair" (swatch + hex + shadeFamily(hairHex) + saved length) and "Wig you chose" (label, its shade, its length, match %). Use ONE shade-naming function everywhere (Passport, Wigs tab, Card) so the same hex never gets two names. Fix the dangling comma "thickness as saved, ● #hex" (qa B10).
5. **Lead feature has no visible payoff** (judge #5/#6): brows at full-face tile size look identical. Show the three brow options as eye-area close-up crops (CSS object-position/scale on the same image — brows sit around 30-38% from the top of these portraits; make the crop window configurable in one constant), with a toggle/zoom to see the full face. Same for the Rebuild Brows stage: add a "Close-up" view of the brow area, and make the Match Card brow guide a proper eye-area crop at a usable size (qa B11: ~60px thumbnail is useless to a brow artist).

## P2
6. **Changing photo keeps old draft/passport/look** (find-bugs #7): reset draft, look, cache in confirmPhoto when the photo changes.
7. **In-flight render not deduped / remount re-enables buttons** (find-bugs #2): cache the in-flight promise keyed by (feature, source, params), not just the finished URL.
8. **Result URLs expire (~2h)** (find-bugs #3): store a timestamp with cached URLs; evict >100 min; if look.wig.url is expired when chaining or showing, re-render or show a "refresh this look" action instead of broken images.
9. **Poll timeout is sleep-sum not wall clock** (render.ts:49, find-bugs #4): use a Date.now() deadline (90s).
10. **Raw "Failed to fetch" copy + clipped at 375** (qa B7): map network errors to human copy; make error tiles wrap and keep "Try again" visible at 320px.
11. **"Missing photo." shown while photo is visible** (qa B8): if a render returns a bad-request about the source, re-upload once transparently (keep the original File/blob in memory), else say "We lost the connection to your photo — tap to upload it again."
12. **No-face photo accepted** (qa B6): when brow/wig render returns a face error, send the user back to Capture with the specific guidance message; also add a pre-check copy on Capture.
13. **Demo first screen confusing** (judge #7): in demo mode the passport section should read as Maya's already-captured passport ("Maya tapped her hair and brow; here is what was measured"), not an instruction to tap.
14. **Hero blank ~1s** (judge #8): first paint must show the headline, subcopy and CTAs immediately (entrance animation may only animate transform, never start at opacity 0 for primary content; keep reduced-motion behaviour).
15. **After save, next step below the fold; stamp overlaps text** (judge #9): after saving, keep "Continue to rebuild" visible (sticky action bar or scroll to the action, not the stamp); move/scale the stamp so it never covers field values or the MRZ.
16. **Wig click shows no rendering state; mobile stage off-screen** (judge #10): immediate visible pending state on the clicked card AND the stage; on mobile scroll the stage into view when a render starts/finishes.
17. **No browser history** (edge B4): push a history entry per step (?step=passport etc. or hash) so Back goes to the previous step and refresh restores the step when state allows (Passport/Rebuild/Card restore from saved passport; otherwise land on Capture/Landing gracefully).

## P3
18. Scroll-on-save effect re-runs on remount (PassportStep.tsx:54-58) — only on savedAt change.
19. "Can you tell?" captions readable by screen readers before reveal — aria-hidden until revealed (Rebuild.tsx:374-383).
20. capped banner not cleared by startLive/openSaved.
21. Demo uses live copy "This takes about half a minute" and PRIVACY line "Your photo is sent to the YouCam API" under the "no live API calls" badge (find-bugs #12, edge B7) — demo-specific copy.
22. sr-only status says "Brow options ready" when all failed (qa B9, edge B6) — announce failures; in capped state replace per-tile "Try again" with the Maya-demo fallback action.
23. Failed images have no fallback; a broken brow tile can be chosen (edge B8) — onError placeholder, disable choosing a tile whose image failed.
24. Landing specimen says "Saved: Not yet" though fully filled; brow swatch named just "Brow" (edge B9) — specimen shows a saved date; name brow colour with the shade function.
25. Reduced motion: Can-you-tell dialog still runs a 400ms fade — honour reduced motion.

## Rules
Keep all honesty labels, no hair-loss imagery, hats stay removed, a11y and print (one page) must keep passing. Do not call /api/render or /api/upload for real in tests (mock fetch / block). Run tsc, npm test, npm run build, and a Playwright walk of the Maya demo (1440 + 375, zero console errors) plus mocked live-path checks for items 2, 3, 6, 10, 11, 12, 22. Do NOT commit or deploy.
