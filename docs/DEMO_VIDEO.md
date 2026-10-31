# Ahead: demo video script

**Runtime:** 2:25 (allowed 1:00 to 3:00; target band 1:45 to 2:30).
**Format:** silent, captions only (no voice, no music, no presenter). 1920x1080, H.264, uploaded to Vimeo with privacy set to "Anyone".
**Source footage:** one Playwright run against https://ahead-beta.vercel.app that records the browser. Captions, speed-ups and the end card are added with ffmpeg (`C:\Users\vp141\tools\ffmpeg\bin\ffmpeg.exe`).
**Live spend:** one upload (File API), 3 eyebrow renders (Makeup VTO) and 1 wig render (hair transfer, 2 units). Everything after 1:20 is Maya's pre-rendered demo and makes no API calls.

## Rules this script follows

| Official rule (youcam-r2-rules.txt) | How the video meets it |
|---|---|
| 1 to 3 minutes | 2:25 |
| Must explain the YouCam API used | B3 names both APIs over the landing "Two YouCam APIs, one look" panel. B4, B6 and B9 caption each API at the moment it runs. B11 names both again. |
| Must show the project functioning | B4 to B6 show real live calls on the deployed site, marked "LIVE YouCam API call". B7 to B10 show the full flow end to end. |
| No third-party trademarks or copyrighted music | The video is silent. No wig, hat or retailer brands appear. The landing "Why Ahead" section, which names Nao-Art, is never shown. The only third-party names on screen are source citations in small print (see Risk 3). |

Caption rules: every caption is at most 15 characters per second. The "s" column is its time on screen, and cps = chars / s. Only facts marked SUPPORTED in `docs/research/EVIDENCE.md` appear in captions.

---

## Beat sheet

| # | Time | Beat | Screen | Criterion it serves |
|---|---|---|---|---|
| B1 | 0:00 to 0:08 | Hook | Landing hero "Capture before. Rebuild after." | Quality of Idea |
| B2 | 0:08 to 0:20 | Problem, 2 sourced facts | Landing "Why before" section | Potential Impact |
| B3 | 0:20 to 0:30 | The two YouCam APIs | Landing "Two YouCam APIs, one look" | Technological Implementation (rule: explain the API) |
| B4 | 0:30 to 0:56 | **Live:** capture, Look Passport (colour ring, brow close-ups from 3 live renders) | Capture, then "Your Look Passport" | Tech Implementation + Design |
| B5 | 0:56 to 1:02 | Save the passport (stamp) | Save bar | Design |
| B6 | 1:02 to 1:20 | **Live:** wigs ranked by colour, one real hair-transfer render | Rebuild, Wigs tab | Tech Implementation + Quality of Idea |
| B7 | 1:20 to 1:28 | Switch to Maya's pre-rendered demo | Landing, then "Maya's Look Passport" | Design (complete flow) |
| B8 | 1:28 to 1:48 | "Can you tell?" guess and reveal | Can you tell? dialog | Potential Impact (wow moment, about 60% of runtime) |
| B9 | 1:48 to 2:02 | Brows drawn on the wig, close-up (chained renders) | Rebuild, Brows tab, Stage close-up | Tech Implementation + Quality of Idea |
| B10 | 2:02 to 2:15 | Match Card and "Bring to your fitting" | Maya's Match Card | Potential Impact + Design |
| B11 | 2:15 to 2:25 | Closing frame | Generated end card | Tech Implementation (APIs named) |

---

## Captions (burned in)

Bottom-centre captions. The **corner badge** is a second ASS style, top-right, and stays up for its whole range.

| # | Start | End | s | Caption | chars | cps |
|---|---|---|---|---|---|---|
| B1 | 0:00.0 | 0:04.0 | 4.0 | Ahead: capture before, rebuild after. | 37 | 9.3 |
| B1 | 0:04.0 | 0:08.0 | 4.0 | For people preparing for chemotherapy. | 38 | 9.5 |
| B2 | 0:08.0 | 0:14.0 | 6.0 | Chemo hair loss usually starts 2 to 3 weeks after the first cycle. | 66 | 11.0 |
| B2 | 0:14.0 | 0:20.0 | 6.0 | Cancer experts advise: take photos and match your wig before hair loss. | 71 | 11.8 |
| B3 | 0:20.0 | 0:25.0 | 5.0 | YouCam Makeup VTO (eyebrows) draws brow shapes on your face. | 60 | 12.0 |
| B3 | 0:25.0 | 0:30.0 | 5.0 | YouCam AI Hairstyle VTO (hair transfer) puts each wig on you. | 61 | 12.2 |
| B4 | 0:30.0 | 0:35.0 | 5.0 | A live run. This face is AI-generated, not a real person. | 57 | 11.4 |
| B4 | 0:35.0 | 0:40.0 | 5.0 | Tap the hair, then a brow. Both colours are measured. | 53 | 10.6 |
| B4 | 0:40.0 | 0:45.0 | 5.0 | Confirm the hair shade on the colour ring. | 42 | 8.4 |
| B4 | 0:45.0 | 0:51.0 | 6.0 | Three brow shapes, drawn live in her brow colour. | 49 | 8.2 |
| B4 | 0:51.0 | 0:56.0 | 5.0 | Pick the one where nothing seems to change. | 43 | 8.6 |
| B5 | 0:56.0 | 1:02.0 | 6.0 | Saved as a Look Passport, kept only in this browser. | 52 | 8.7 |
| B6 | 1:02.0 | 1:08.0 | 6.0 | Wigs ranked by colour match to the saved hair. | 46 | 7.7 |
| B6 | 1:08.0 | 1:20.0 | 12.0 | A real hair-transfer render on her photo. | 41 | 3.4 |
| B7 | 1:20.0 | 1:28.0 | 8.0 | Now Maya's pre-rendered demo, so the rest is quick. | 51 | 6.4 |
| B8 | 1:28.0 | 1:34.0 | 6.0 | One is her own hair. One is a wig. Which is which? | 50 | 8.3 |
| B8 | 1:34.0 | 1:48.0 | 14.0 | (no caption: let the on-screen reveal read) | - | - |
| B9 | 1:48.0 | 1:55.0 | 7.0 | Her saved brows, redrawn on top of the wig. | 43 | 6.1 |
| B9 | 1:55.0 | 2:02.0 | 7.0 | Chained: the wig result feeds the eyebrow try-on. | 49 | 7.0 |
| B10 | 2:02.0 | 2:08.0 | 6.0 | The Match Card: show it to the wig fitter. | 42 | 7.0 |
| B10 | 2:08.0 | 2:15.0 | 7.0 | Plus what to bring: a lock of hair, photos, a prescription. | 59 | 8.4 |
| B11 | 2:15.0 | 2:25.0 | 10.0 | (the end card carries the text) | - | - |

Corner badges (top-right, second ASS style):

| Start | End | Badge | chars |
|---|---|---|---|
| 0:08.0 | 0:20.0 | Source: cancer.org | 18 |
| 0:30.0 | 1:20.0 | LIVE YouCam API call · AI-generated face | 40 |
| 0:46.0 | 0:50.0 | Real wait about 25 s, shown faster | 34 (it sits under the LIVE badge) |
| 1:10.0 | 1:14.0 | Real wait about 30 s, shown faster | 34 |
| 1:20.0 | 2:15.0 | Pre-rendered demo · AI-generated persona | 40 |

Fill in the "Real wait" numbers from the run's `markers.json` (the gap between `*_start` and `*_done`). Never estimate them.

**Where each fact comes from (EVIDENCE.md, all SUPPORTED):**
- "2 to 3 weeks after the first cycle" is row 2 (ACS, verbatim: "it usually starts about 2 to 3 weeks after the first cycle").
- "take photos and match your wig before hair loss" is row 5a (ACS, verbatim: "fit and match your wig before you lose your hair" / "Take photos of your current hairstyle").
- No other statistics appear in captions. "Colour ring" names Ahead's own tool. It is not called an industry standard (row 5c is MISSING).

### End card (B11, 10 s, static 1920x1080)

```
Ahead
Capture before. Rebuild after.

Built on two YouCam APIs
Makeup VTO · eyebrows
AI Hairstyle VTO · hair transfer

Try it   ahead-beta.vercel.app
Code     github.com/ishal1410/ahead

Cosmetic planning aid. Not medical advice. All faces are AI-generated.
```

Make it as `endcard.html`: background `#F2F1EC`, ink `#1F2A24`, accent `#2F4A3E`, matching the site, with system serif headings. Screenshot it at 1920x1080 with Playwright (`page.setContent`, then `page.screenshot`). It holds about 20 words over 10 s.

---

## Pre-flight checklist

Do every item, in order, before the one live recording.

1. **Units:** the YouCam dashboard balance is at least 20 units (memory: about 518 on the old key). Do not redeem a code.
2. **Deploy is current:** `https://ahead-beta.vercel.app` shows "Two YouCam APIs, one look" and the Rebuild tabs are only Brows and Wigs (the headwear tab is removed).
3. **Server key set:** Vercel has `PERFECTCORP_API_KEY` set for Production. The daily caps have not tripped today. If one trips, the live run shows a banner with "See Maya's demo"; stop and record tomorrow.
4. **Clean browser:** run in a fresh Playwright context (no localStorage, so the landing page shows no saved-passport link, and no sessionStorage).
5. **Dry run first:** run `record.mjs` with `DRY=1`. That mode fulfils `/api/upload` locally with `{fileId:"dry-run"}` and aborts `/api/render`, so nothing reaches the server. Check that every selector resolves and the taps land: the hair tap must suggest a ring shade and the brow tap must not show the skin warning. Verified 2026-10-30: the hair tap at (0.16, 0.52) suggested "Medium brown", and the brow tap at (0.40, 0.395) read `#504A46` with no warning.
6. **Spend once:** the live run is `DRY=0`, **once**. If a brow tile shows "Didn't render" or the wig fails, **do not** press "Try again" or "Draw them again". Stop, check the units, and decide before spending more.
7. **Never during the live run:** "Draw my brows" or "Draw my brows on this wig" in live mode (the 4th brow render is over budget), a second wig, or "Refresh this look".
8. **Screen:** 1600x900 viewport, recordVideo 1600x900, deviceScaleFactor 1, default (not reduced) motion, light theme (`colorScheme: "light"`).
9. **No stray UI:** headless Chromium, so there are no OS notifications, extensions or bookmarks bar in frame.
10. **Fake cursor:** inject a visible cursor dot (below). Playwright video does not draw the pointer, and the taps in B4 must be visible.
11. **Shown on screen:** "Maya" is labelled AI-generated (site banner + badge). No hair loss is shown. The "Why Ahead" section (Nao-Art) never enters the frame.
12. **After recording:** check `markers.json` has every marker, then cut. The rules require the upload to be publicly viewable; on Vimeo set privacy to "Anyone".

---

## Recording script (Playwright actions per beat)

Playwright comes from `C:\Users\vp141\skincare-coach\node_modules\playwright` (not installed in `ahead`). Save the script as `scratchpad\video\record.mjs`, outside the repo. Every action logs a marker `{name, t}` in seconds since the page was created (when video recording starts) to `markers.json`. The cut uses those markers.

```js
const { chromium } = await import("file:///C:/Users/vp141/skincare-coach/node_modules/playwright/index.mjs");
const DRY = process.env.DRY === "1";
const MAYA = "C:/Users/vp141/ahead/public/demo/maya.jpg";
const out = process.argv[2] ?? ".";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, colorScheme: "light",
  recordVideo: { dir: out, size: { width: 1600, height: 900 } } });
// Visible cursor dot (Playwright video has no pointer).
await ctx.addInitScript(() => addEventListener("DOMContentLoaded", () => {
  const d = Object.assign(document.createElement("div"), { id: "__cur" });
  d.style.cssText = "position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(47,74,62,.55);border:2px solid #fff;pointer-events:none;transition:transform .12s";
  document.body.append(d);
  addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; }, true);
  addEventListener("mousedown", () => (d.style.transform = "scale(.7)"), true);
  addEventListener("mouseup", () => (d.style.transform = ""), true);
}));
if (DRY) await ctx.route("**/api/**", (r) => r.request().url().includes("/api/upload") ? r.fulfill({ json: { fileId: "dry-run" } }) : r.abort());
const p = await ctx.newPage();
const t0 = Date.now(), markers = [];
const mark = (name) => { markers.push({ name, t: (Date.now() - t0) / 1000 }); console.log(name); };
const hold = (ms) => p.waitForTimeout(ms);
const glide = async (loc) => { const bb = await loc.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 20 }); };
const click = async (loc) => { await loc.scrollIntoViewIfNeeded(); await glide(loc); await hold(250); await loc.click(); };
const scrollTo = (loc) => loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
// ... beats below, in order ...
await import("node:fs").then((fs) => fs.writeFileSync(`${out}/markers.json`, JSON.stringify(markers, null, 2)));
await ctx.close(); await b.close();   // the video file is written on close
```

### B1: Hook (0:00 to 0:08)
```js
await p.goto("https://ahead-beta.vercel.app", { waitUntil: "networkidle" });
mark("B1"); await hold(8000);                        // hero: "Capture before. Rebuild after."
```

### B2: Problem (0:08 to 0:20)
```js
mark("B2"); await scrollTo(p.getByRole("heading", { name: "Why before" })); await hold(12000);
```
On screen: the three fact cards with their sources. Caption: the two ACS facts.

### B3: The two APIs (0:20 to 0:30)
```js
mark("B3"); await scrollTo(p.getByRole("heading", { name: "Two YouCam APIs, one look" })); await hold(10000);
```
On screen: "Makeup VTO, eyebrows" and "AI Hairstyle VTO, hair transfer", plus the "Photo, Wig, Brows on the wig" chain.

### B4: Live capture and Look Passport (0:30 to 0:56)
```js
await p.evaluate(() => scrollTo({ top: 0 }));
mark("B4"); await click(p.getByRole("button", { name: "Start my Look Passport" }).first());
await p.locator('input[type="file"]').setInputFiles(MAYA);              // label: "Take or choose a photo"
await hold(1200);
await click(p.getByRole("button", { name: "Use this photo" }));         // POST /api/upload (File API)
await p.getByRole("heading", { name: "Your Look Passport" }).waitFor({ timeout: 30000 });
mark("B4_passport");
const photo = p.getByRole("img", { name: /Tap to sample/ });
const tapAt = async (fx, fy) => { const bb = await photo.boundingBox();
  await p.mouse.move(bb.x + bb.width * fx, bb.y + bb.height * fy, { steps: 25 }); await hold(300);
  await photo.click({ position: { x: bb.width * fx, y: bb.height * fy } }); await hold(1200); };
await tapAt(0.16, 0.52);                                                // hair (verified in dry run)
await tapAt(0.40, 0.395);                                               // brow (verified, no skin warning)
mark("B4_ring");
await click(p.getByRole("radiogroup", { name: "Hair colour ring" }).getByRole("radio", { name: "Chestnut" }));
await click(p.getByText("Shoulder", { exact: true }));                  // "Hair length today"
await hold(1500);
mark("B4_brows_start");
await click(p.getByRole("button", { name: "Show my brow options" }));   // 3 LIVE Makeup VTO renders
await p.waitForFunction(() => document.querySelectorAll('[aria-label="Brow shapes"] button[role=radio]:not([disabled])').length === 3,
  null, { timeout: 120000 });
mark("B4_brows_done"); await hold(2500);                                // tiles are close-ups by default ("Close-up" pressed)
await click(p.getByRole("radio", { name: /^Soft arch/ })); await hold(1500);
```
**Speed-up:** cut `B4_brows_start + 2 s` to `B4_brows_done` down to about 4 s (badge: "Real wait about N s, shown faster"). **If it fails:** a tile showing "Didn't render" ends the live take (pre-flight item 6).

### B5: Save the passport (0:56 to 1:02)
```js
mark("B5"); await click(p.getByRole("button", { name: "Save my passport" }));
await hold(4500);                                                       // page scrolls to the stamped passport
```

### B6: Live wig render (1:02 to 1:20)
```js
mark("B6"); await click(p.getByRole("button", { name: "Continue to rebuild" }));
await click(p.getByRole("tab", { name: "Wigs" })); await hold(4000);   // ranked list with % match
mark("B6_wig_start");
await click(p.getByRole("button", { name: /^Shoulder-length chestnut waves/ }));  // 1 LIVE hair transfer (2 units)
await p.getByText("On your photo").waitFor({ timeout: 120000 });
mark("B6_wig_done"); await hold(5000);                                  // the stage shows the wig render on her face
```
The top-ranked wig is "Shoulder-length chestnut waves" ("Same ring shade") after Chestnut is confirmed on the ring. Do **not** click "Can you tell?", the Brows tab buttons or another wig here.
**Speed-up:** `B6_wig_start + 2 s` to `B6_wig_done` down to about 4 s.

### B7: Switch to Maya's demo (1:20 to 1:28)
```js
mark("B7"); await click(p.getByRole("button", { name: "Ahead", exact: true }));
await click(p.getByRole("button", { name: "See Maya's demo" }).first());
await p.getByRole("heading", { name: "Maya's Look Passport" }).waitFor();
await click(p.getByRole("button", { name: "Show her brow options" }));
await p.waitForFunction(() => document.querySelectorAll('[aria-label="Brow shapes"] button[role=radio]:not([disabled])').length === 3);
await hold(1500);
await click(p.getByRole("radio", { name: /^Soft arch/ }));
await click(p.getByRole("button", { name: "Save the passport" })); await hold(1200);
await click(p.getByRole("button", { name: "Continue to rebuild" }));
```
The site's own banner "Pre-rendered demo · no live API calls" stays in frame. Jump-cut this beat to 8 s.

### B8: "Can you tell?" (1:28 to 1:48), the wow moment
```js
await click(p.getByRole("tab", { name: "Wigs" }));
await click(p.getByRole("button", { name: /^Shoulder-length chestnut waves/ }));
await p.getByText("On her photo").waitFor();
mark("B8"); await click(p.getByRole("button", { name: "Can you tell?" }));
await hold(6000);                                                       // the question, both portraits unlabelled
// Guess the own-hair side, so the reveal reads "You couldn't tell."
const srcs = await p.locator("dialog [data-choice] img").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
const side = srcs[0].includes("maya.jpg") ? "Left" : "Right";
await click(p.getByRole("button", { name: new RegExp(`^${side} portrait`) }));
mark("B8_reveal"); await hold(10000);                                   // "WIG" / "OWN HAIR, SAVED BEFORE" + sentence
await click(p.getByRole("dialog").getByRole("button", { name: "Close" }));
```
Staging: hold the unlabelled pair for 6 s with only the question caption, then reveal with **no caption** for 10 s so the on-screen verdict ("You couldn't tell." / "Same colour-ring shade as the hair Maya saved.") carries the beat.

### B9: Brows on the wig, close-up (1:48 to 2:02)
```js
mark("B9"); await click(p.getByRole("tab", { name: "Brows" }));
await click(p.getByRole("button", { name: "Draw my brows on this wig" }));
await p.getByText("Drawn with the wig she chose.").waitFor();
await click(p.getByRole("group", { name: "Stage view" }).getByRole("button", { name: "Close-up" }));
await hold(5000);
await click(p.getByRole("group", { name: "Stage view" }).getByRole("button", { name: "Full face" }));
await hold(4000);
```

### B10: Match Card (2:02 to 2:15)
```js
mark("B10"); await click(p.getByRole("button", { name: "Make Maya's Match Card" }));
await p.getByRole("heading", { name: "Show this to your wig fitter." }).waitFor(); await hold(5000);
await scrollTo(p.getByRole("region", { name: "Bring to your fitting" })); await hold(6000);
mark("END");
```
Do not click "Download PDF" (it opens the print dialog).

### B11: End card (2:15 to 2:25)
This is not part of the recording. It is the 10 s still from `endcard.png`, joined on in the cut.

---

## Cut (ffmpeg)

1. **Trim and speed per beat** using `markers.json`. Each beat is one segment: `-ss <start> -to <end>`, plus `setpts=PTS/<k>` on the two wait segments. Pick k so each wait lands at about 4 s.
2. **Scale** each segment to 1920x1080 (`scale=1920:1080:flags=lanczos`, 1600x900 is the same 16:9 ratio) at 30 fps, then concat. Add the end card with `-loop 1 -t 10 -i endcard.png`.
3. **Burn captions** from `captions.ass` (two styles: `Bottom` with Alignment=2, 44 px, white on a 60% dark box; `Badge` with Alignment=9, 30 px). Write the ASS timings from the caption tables above, against the **cut** timeline.
4. **Silent track:** add `-f lavfi -i anullsrc=r=48000:cl=stereo -shortest`. Some players and hosts dislike files with no audio stream, and this adds no music.

```bash
FF=/c/Users/vp141/tools/ffmpeg/bin/ffmpeg.exe
# one segment (example: the B4 brow wait at 6x)
$FF -ss 41.2 -to 66.8 -i raw.webm -vf "setpts=PTS/6,scale=1920:1080:flags=lanczos,fps=30" -an -c:v libx264 -crf 18 seg04b.mp4
# join, then burn captions and add silence
$FF -f concat -safe 0 -i segs.txt -c copy joined.mp4
$FF -i joined.mp4 -f lavfi -i anullsrc=r=48000:cl=stereo -vf "ass=captions.ass" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest ahead-demo.mp4
```

Check the result: `ffprobe` duration between 2:15 and 2:30, a frame from each beat looks right, and every caption is readable at phone size.

---

## Risks

1. **The live render fails or is slow.** The wait is shown sped up with its real duration stated. If a render fails, do not retry past the budget. The live take is only B4 to B6, so a fallback can show the "Didn't render" state honestly and continue with Maya. Losing the live take costs the "not faked" proof, so try to get one clean take.
2. **The guess order is random.** The script reads each portrait's `src` before guessing, so the reveal is always "You couldn't tell." The guess is the script's, made as a viewer would. The caption never claims a person was fooled.
3. **Third-party names.** The "Why before" cards show their source credits ("American Cancer Society", "Mayo Clinic Breast Disease Registry, PubMed"), and the Match Card shows "Advice from the American Cancer Society (cancer.org…)". These are factual citations, not branding. If you want zero third-party names, shorten B2 to only the "2 to 3 weeks" card, zoomed in (`page.locator('li', { hasText: '2 to 3 weeks' }).screenshot` as a still), and crop the Match Card footer in B10. Never show "Why Ahead" (Perfect Corp / Nao-Art).
4. **Sensitive topic.** No hair loss is shown or simulated anywhere, and the tone stays calm. B11 states "Cosmetic planning aid. Not medical advice."
