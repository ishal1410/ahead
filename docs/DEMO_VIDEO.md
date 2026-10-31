# Ahead: demo video plan

**Runtime target:** about 2:20 (rules: 1 to 3 minutes).
**Format:** silent, burned-in captions (no music, so no copyright risk). 1920x1080, H.264, with a silent AAC track.
**Footage:** one continuous Playwright take of the live site, https://ahead-beta.vercel.app, on the AI-generated photo. Everything on screen is the deployed app. The recording script lives outside the repo at `scratchpad/video/record.mjs` (same approach as ClauseCatcher's `tools/demo_video/record.py`).
**Live spend:** 3 eyebrow renders (Makeup VTO), 1 wig render (hair transfer, 2 units), 1 Hair Color render, 1 eyebrow render on the recoloured wig. About 7 units, all three YouCam APIs live on screen. "Can you tell?", the fitting list and the Match Card cost nothing.

## How to record

1. **Rehearse (0 units):** `MOCK=1 node record.mjs <dir>`. Renders are answered with the real pre-rendered YouCam outputs from `public/demo/`, so every beat, selector and frame can be checked. Look at every beat screenshot it saves.
2. **Live take, once:** `node record.mjs <dir>`. If any render fails, stop. Do not press "Try again"; check units first.
3. **Recordly (optional polish):** `HEADED=1 START_DELAY=10 node record.mjs <dir>` opens a visible 1600x900 window with a 10 s countdown. Press Record in Recordly on that window before the countdown ends; Recordly adds its zoom and cursor polish. The script still writes its own video and `markers.json`, so the ffmpeg cut works either way. (Recordly cannot be started from a script: it has no global hotkeys.)

## Rules this video follows

| Official rule | How |
|---|---|
| 1 to 3 minutes | about 2:20 |
| Must explain the YouCam APIs used | B3 shows the "Three YouCam APIs, one look" panel; B4, B6, B7 and B8 caption each API as it runs live; the end card names all three |
| Must show the project working | B4 to B8 are live calls on the deployed site, badged "LIVE YouCam API call" |
| No third-party trademarks or copyrighted music | Silent. No wig, retailer or brand names. No organisation names in frame: B2 shows "How it works" (not the cited fact cards), the source is a caption badge ("Source: cancer.org"), and the Match Card footer is never scrolled into view. The "Why Ahead" section is never shown |
| Sensitive topic | No hair loss is shown or simulated. The face is AI-generated and labelled. |

## Beat sheet and captions

Captions are bottom-centre, at most 15 characters per second. Timings below are targets on the cut timeline; set the final ones from the live take's `markers.json`. Render waits are sped up and badged with their real duration (from the markers, never estimated).

| # | Cut time | Screen (marker) | Caption |
|---|---|---|---|
| B1 | 0:00–0:07 | Landing hero (`B1`) | Ahead: capture before, rebuild after. / For people preparing for chemotherapy. |
| B2 | 0:07–0:16 | "How it works", 4 steps (`B2`) | Chemo hair loss usually starts 2 to 3 weeks after the first cycle. / Cancer experts advise photos of your hair before it changes. — badge "Source: cancer.org" |
| B3 | 0:16–0:26 | "Three YouCam APIs, one look" (`B3`) | Three YouCam APIs, chained into one look. |
| B4 | 0:26–0:52 | Photo + consent, passport taps, ring, brow tiles (`B4`…`B4_brows_done`) | A live run on an AI-generated face. / Tap the hair, confirm the shade on the colour ring. / YouCam Makeup VTO draws three brow shapes, live. / Pick the one where nothing seems to change. |
| B5 | 0:52–0:57 | Save (`B5`) | Saved as a Look Passport, only in this browser. |
| B6 | 0:57–1:12 | Wigs ranked, live hair transfer of the honey blonde wig (`B6`…`B6_wig_done`) | Wigs ranked by colour-ring match to the saved hair. / YouCam hair transfer puts the wig on her face, live. |
| B7 | 1:12–1:24 | Live Hair Color (`B7_start`…`B7_done`) | YouCam AI Hair Color recolours it towards the saved shade. |
| B8 | 1:24–1:38 | Brows on the recoloured wig, close-up then full face (`B8`…) | Chained: wig, then Hair Color, then her saved brows. |
| B9 | 1:38–1:54 | "Can you tell?" question then reveal (`B9`, `B9_reveal`) | A blind check before buying. (reveal: no caption, the screen carries it) |
| B10 | 1:54–2:00 | Fitting list 3 of 3 (`B10`) | Shortlist up to three wigs for the fitting. |
| B11 | 2:00–2:13 | Match Card top, then "Ask your fitter for" (`B11`) | The Match Card: shade, brow guide and wigs to ask for. |
| B12 | 2:13–2:23 | End card (still) | — |

Badges (top-right): "Source: cancer.org" over B2; "LIVE YouCam API call · AI-generated face" from B4 to B8; "Real wait N s, shown faster" on each sped-up render wait.

**Facts used (docs/research/EVIDENCE.md, SUPPORTED only):** "2 to 3 weeks after the first cycle" (row 2, ACS); "photos of your current hairstyle" before hair loss (row 5a, ACS). No other statistics.

**"Can you tell?" honesty:** the script guesses the wig side, so the reveal reads "You spotted it." The honey wig's straight texture is visible and Hair Color changes colour only; the video never claims anyone was fooled.

### End card (B12, 10 s, 1920x1080 still)

```
Ahead
Capture before. Rebuild after.

Built on three YouCam APIs
Makeup VTO · eyebrows
AI Hairstyle VTO · hair transfer
AI Hair Color · full mode

Try it   ahead-beta.vercel.app
Code     github.com/ishal1410/ahead

Cosmetic planning aid. Not medical advice. All faces are AI-generated.
```

Background `#F2F1EC`, ink `#1F2A24`, accent `#2F4A3E`, serif headings, rendered with Playwright `page.setContent` + screenshot.

## Cut (ffmpeg, `C:\Users\vp141\tools\ffmpeg\bin\ffmpeg.exe`)

1. Trim each beat from the raw `.webm` using `markers.json`; speed render waits with `setpts=PTS/k` so each lands at about 4 s.
2. Scale to 1920x1080 (`scale=1920:1080:flags=lanczos`, same 16:9) at 30 fps, concat, append the end card (`-loop 1 -t 10`).
3. Burn `captions.ass` (styles `Bottom` and `Badge`) timed on the cut timeline.
4. Add a silent track: `-f lavfi -i anullsrc=r=48000:cl=stereo -shortest`.
5. Check: duration under 3:00, one frame per beat looks right, captions readable at phone size.

## Upload

YouTube is preferred by the rules (Vimeo allowed; set privacy to "Anyone"). The video must be public.
