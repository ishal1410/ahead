# Ahead — UI build brief

Hackathon: YouCam API Skin AI & eCommerce VTO (Devpost), deadline Nov 2 2026 11:45am EST. Goal: 1st place. Judged equally on Technological Implementation, **Design ("a complete, coherent product experience — not just a technical proof of concept")**, Potential Impact, Quality of Idea.

Full product design (read it): `C:\Users\vp141\AppData\Local\Temp\claude\C--Users-vp141\304f02ed-55bd-4d69-a6f0-aac9b25791dd\scratchpad\ahead-design-superpowers.md`.
**Overrides from the 4-skill review (these win over the design doc):** brows + Match Card are the LEAD story, wigs are second. Name Nao-Art openly in a "Why Ahead" section: "Perfect Corp proved patients want wig try-on (Nao-Art, 2024). Ahead fixes the step before it: you can only match what you saved." Show a computed colour-match % everywhere a wig is shown. Hat try-on is kept. No scarf, no LLM, no accounts.

## Product in one line
Capture before. Rebuild after. Before chemotherapy, save your look (hair colour, brow shape + colour) in a "Look Passport"; later, see your own brows redrawn and wigs/hats matched to the hair you saved — on your own face — and print a Match Card for your wig fitter.

## Hard rules
- NEVER show, simulate, or describe hair loss / baldness. No before/after loss imagery. No medical claims ("cosmetic planning", not treatment).
- Tone: calm, warm, dignified, never pitying. Not clinical-cold, not "beauty-influencer" bubbly. No exclamation marks.
- Demo persona "Maya" is AI-generated and must be labelled "AI-generated persona" wherever she appears. Never call her a patient; she is "preparing for treatment".
- No brand names, no trademarks anywhere in the UI.
- Privacy line on landing + capture: "Your photo is sent to the YouCam API to render try-ons. Ahead keeps your Look Passport only in this browser."
- Accessibility: semantic HTML, labelled controls, visible focus, aria-live for render status, reduced-motion respected, AA contrast, works at 320px wide.

## Stack (already scaffolded at C:\Users\vp141\ahead)
Next.js 16.4 App Router + React 19 + Tailwind v4 + TypeScript. READ `node_modules/next/dist/docs/` for anything Next-specific (this Next has breaking changes vs older versions). `qrcode` npm package is installed. No other UI deps unless truly needed (no component libraries; motion via CSS). Fonts via `next/font/google`.

## Backend contracts (DONE — do not change lib/ or app/api/)
- `POST /api/upload` multipart field `image` → `{fileId}` or `{error}` (4xx/5xx).
- `POST /api/render` JSON `{feature:"wig"|"hat"|"brow", src:{fileId}|{url}, refId?, brow?:{preset,hex,thickness?,intensity?}}` → 202 `{taskId}`; 429 `{error, capped:true}` when the daily cap trips (→ show Maya demo fallback banner); other errors `{error}` with human copy.
- `GET /api/render/{feature}/{taskId}` → `{state:"running"}` | `{state:"success", url}` | `{state:"error", error}`. Poll every 2s, give up after 90s. Result URLs are valid ~2h.
- Chaining: pass a previous result as `src:{url}` (e.g. hat on top of the chosen wig render, brows on top of a wig render).
- `lib/catalog.ts`: `WIGS` (id,label,shade,hex,length,file), `HATS` (id,label,file), `BROW_PRESETS` (Straight1/SoftArch1/HighArch1). WIGS/HATS are empty right now — assets are being generated; build against the types and render an empty-state gracefully. Files will live under `/public/refs/`.
- `lib/color.ts`: `averageHex(rgba)` for tap-to-sample, `rankByColour(items, hex)` → items + `match` (0-100), `matchPercent`.

## Screens / flow (single page app with steps is fine; or routes)
1. **Landing** — headline "Capture before. Rebuild after." Sub: who it's for (people preparing for chemotherapy, and the people who help them). CTAs: "Start my Look Passport" and "See Maya's demo" (zero API calls). "How it works" (3 steps) + a panel naming each YouCam API used (Makeup VTO — eyebrows; AI Hairstyle VTO (hair transfer); AI Hat VTO). "Why Ahead" section with the Nao-Art line.
2. **Capture** — upload or camera (`<input type="file" accept="image/*" capture="user">`), guidance (face and shoulders in frame, hair down, brows visible, even light). Upload via /api/upload; keep a local object URL of the photo for display + sampling.
3. **Look Passport**
   a. Tap your hair, then tap your brow on the photo → canvas samples a 9x9 patch → `averageHex` → swatches shown with hex.
   b. Hair length: short / mid / long chips.
   c. "Which brows are yours?" → render the 3 BROW_PRESETS on the selfie (3 /api/render brow calls, using the sampled brow hex, intensity 80) → user picks the one that looks unchanged. Show progress per tile.
   d. Save → localStorage key `ahead.passport.v1` = `{version:1, savedAt ISO, hairHex, hairLength, brow:{preset, hex, thickness, intensity}, photoDataUrl (downscaled ≤512px jpeg)}` + "Download passport (JSON)".
4. **Rebuild** (tabs, one shared face stage)
   - **Brows (first tab — the lead)**: "Your brows, from your passport" → renders the saved recipe on the photo (or on the current wig render). Copy: "the guide you or a brow artist can redraw from."
   - **Wigs**: WIGS ranked by `rankByColour(WIGS, passport.hairHex)`, each card shows match %, shade, length; tap → hair-transfer render. **"Can you tell?" toggle**: original photo and wig render side by side, unlabelled for 2s, then reveal "Right is a wig — NN% colour match to the hair you saved."
   - **Headwear**: HATS; renders on the current wig render if one exists (chaining), else the photo.
5. **Match Card** — print-optimised (`@media print`, A5/Letter), plus "Download PDF" via `window.print()`. Contents: baseline photo, chosen wig render, hair hex + shade family + length + match %, brow preset name / thickness / hex as a drawing guide, chosen hat, QR code (qrcode lib) encoding the passport JSON minus the photo. Header "Show this to your wig fitter." Footer: "Cosmetic planning aid. Not medical advice."

## Demo mode (Maya) — zero units
`/public/demo/manifest.json` will hold `{ persona:{name,label,photo}, passport:{...}, renders:{ brow:{Straight1:url,...}, wig:{<wigId>:url}, hat:{<hatId>:url}, browOnWig?:url } }` with all images as static files under /public/demo/. Build the demo path to read this manifest and run the exact same UI with renders served from it (simulate a short 1.2s "rendering" state so the flow reads truthfully as "pre-rendered" — label it "Pre-rendered demo · no live API calls"). If the manifest is missing, show a polite placeholder. Also use the demo as the fallback when /api/render returns `capped:true`.

## Design direction
Use the design skills — invoke via the Skill tool: `high-end-visual-design`, `design-taste-frontend`, `frontend-design:frontend-design`, and `ui-ux-pro-max:ui-ux-pro-max` — and let them decide the visual system. Constraints only: warm, calm, editorial, premium; light theme first with a dark theme; generous whitespace; a signature visual element for the passport (it should feel like a real document/passport page); the "Can you tell?" reveal must be the most beautiful moment in the app. Avoid generic AI-template look (no purple gradients, no glassmorphism soup).

## Done means
`npx tsc --noEmit` clean, `npm run build` clean, `npm test` green, page renders with no console errors at 320/375/768/1440 (check with Playwright: `npx playwright` is NOT installed here — use `node` + the playwright package from `C:\Users\vp141\skincare-coach\node_modules\playwright` via `await import("file:///C:/Users/vp141/skincare-coach/node_modules/playwright/index.mjs")` or just run `npm run build` + curl). Do NOT call /api/render in testing (it spends paid units) — test flows with the demo manifest and mocked fetch only. Do not commit. Report what you built, screenshots paths, and any deviations.
