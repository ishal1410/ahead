# Ahead — round-2 fix list (2026-10-30)

Evidence: C:\Users\vp141\AppData\Local\Temp\claude\C--Users-vp141\304f02ed-55bd-4d69-a6f0-aac9b25791dd\scratchpad\bughunt2\{qa,judge}\
Round-1 fixes were confirmed working on prod. Lead already changed data (do not touch): lib/hairChart.ts gained a "copper" ring shade; lib/catalog.ts auburn-long → "Long layered copper"/Copper #A4441E, caramel-bob → "Medium brown bob with fringe".
You own app/ahead/*, app/globals.css, lib/render.ts, lib/passport.ts, lib/browser.ts and their tests. Do NOT edit lib/hairChart.ts, lib/catalog.ts, lib/color.ts, app/api/, public/demo/, scripts/.

## P0 / P1
1. **"Can you tell?" is not a test** (judge #1): make it a real guess. Randomise which side the wig is on; ask "Which one is the wig?" with two large tappable/keyboard choices; then reveal (correct/incorrect, both labelled, the ring-match sentence). Reduced motion respected; screen-reader friendly (no spoiler before the guess); works at 320px. Keep it the most beautiful moment in the app.
2. **Back/Forward replaces the demo with the saved passport** (code review #1, AheadApp.tsx:120-121): in onPop only call restoreSaved when there is no session; otherwise navigate within the current session.
3. **False brow caption** (judge #3): "Shown on the photo: the demo has no brows pre-rendered on this wig" appears although renders.browOnWig[wigId] exists for all 9 wigs. Fix the condition; caption must always match the stage image.
4. **Rendered look lost on reload** (qa N1): persist the current look (wig id + render URL + expiresAt, brows + wigId + URL + expiresAt) with the session (sessionStorage or alongside the passport) so ?step=rebuild / ?step=card reloads restore it; expired URLs must still be handled by the existing expiry logic.

## P2
5. **Upload race takes over the demo** (code review #2, AheadApp.tsx:211-223): capture a session/step token before `await uploadPhoto`; bail if it changed.
6. **Old passports not on the ring** (code review #3, qa N2): in parsePassport (or draftFromPassport) snap hairHex to suggestShade(hex).hex from lib/hairChart so the ring shows a selection and ranking/Card say "same shade" consistently. Add a test with a legacy hex like #6B4A35 / #5D3521.
7. **Skin tap accepted as brow** (qa N4): reject brow samples that are implausibly light for a brow (e.g. Lab L above ~60 or a near-skin sample) with a gentle message ("That looks like skin — tap the darkest part of the brow"); and do not name brow colours with the hair ring name — brow colour shows its hex + a simple descriptor (e.g. "Dark brown brow") or just the swatch; avoid "Honey blonde" for a brow.
8. **Demo copy speaks as "you"** (judge #5): in Maya demo mode use "Maya's"/"her" everywhere ("Maya's baseline photo", "Closest to Maya's hair first", "Make Maya's Match Card", "Maya's Match Card", "Confirm Maya's hair shade").
9. **"Expired" banner false positive** (code review #4, Rebuild.tsx:75): use isExpired(look.brow.expiresAt), not !brow.
10. **Refresh moves photo-brows onto the wig** (code review #5, Rebuild.tsx:139-142): pass onUrl only when look.brow.wigId is set.

## P3
11. **Colour ring keyboard** (code review #6, qa N3): proper radiogroup — roving tabindex (only checked or first is tabbable), Arrow keys move + select, Home/End.
12. **"Colour" printed twice** on the Match Card (judge #7): "Colour | Colour | #564843".
13. **Mobile: Saved stamp covers the passport photo** (judge #8, m-01-land.png): shrink/offset so the face stays visible.
14. **Brow close-up on wig render is soft** (judge #6): use a less aggressive crop for the stage close-up (or render at higher source resolution if available); do not upscale beyond ~2x.

## From the edge tester (bughunt2\edge\)
15. **P2 Refresh on the demo's Match Card becomes the user's saved card** (h-demo-refresh-swaps-to-saved.png, AheadApp.tsx:102-112): remember which session a step belongs to (e.g. ?demo=1 or session kind in sessionStorage) so a refresh restores the demo, never the saved passport. Same root cause family as item 2 — fix both together.
16. **P3 Rebuild brow colour row reads "Colour #3B2A1E" (screen readers hear "Colour Colour")** while Passport/Card name it — same fix as items 7/12 (one brow-colour descriptor everywhere).
17. **P3 Sticky "Continue to rebuild" bar is ~120px at 375px and hides ring options** (st-375-scroll600.png, PassportStep.tsx:367-381): make it compact on small screens (single line, ≤64px) and only stick once the passport is saved.

## Rules
Root-cause fixes (superpowers:systematic-debugging), keep design system and motion, a11y + print one page must still pass. Add tests that fail first for items 2, 4, 5, 6, 7, 9, 10, 11 where unit-testable. Never call /api/render or /api/upload for real (mock). Verify: kill ALL leftover `next start/dev` node processes first, `rm -rf .next`, then tsc, npm test, npm run build, `next start`, and update + run the Playwright walk (scratchpad\fixpass\walk.mjs — copy to scratchpad\fixpass2\ and extend for items 1-4, 6-8, 11), deleting old results before running. Look at the screenshots. Kill servers you start. Do NOT commit or deploy. Report under 400 words.
