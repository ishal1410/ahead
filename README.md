# Ahead — capture before, rebuild after

Ahead helps people preparing for chemotherapy save their look while their hair is still theirs to describe, then rebuild it later on their own face.

1. **Capture** one photo (face and shoulders, hair down, brows visible).
2. **Look Passport**: tap your hair and your brow to record their colours, choose your hair length, and pick your brow shape from three shapes drawn on your own face.
3. **Rebuild**: see your saved brows redrawn, and wigs ranked by colour match to the hair you saved, rendered on your face.
4. **Match Card**: a printable card (with a QR code of the recipe) to hand to your wig fitter or brow artist.

Built for the YouCam API Skin AI & eCommerce VTO Hackathon.

## YouCam APIs used

Two YouCam try-on APIs plus the File API:

| API | Endpoint | Where |
|---|---|---|
| Makeup VTO — `eyebrows` category | `POST /s2s/v2.0/task/makeup-vto` | Draws three brow shapes in the tapped brow colour; later redraws the saved recipe, including on top of a wig render |
| AI Hairstyle VTO (hair transfer) | `POST /s2s/v2.1/task/hair-transfer` | Renders each wig reference on the user's face |
| File API | `POST /s2s/v2.0/file` + presigned PUT | Uploads the selfie once; the file id is reused across try-ons |

Renders chain: a wig result URL is passed as `src_file_url` to the eyebrow try-on, so brows are drawn on the full look.

## Why not just wig try-on?

Perfect Corp and Nao-Art launched medical-wig try-on in Japan (2024). Ahead fixes the step before it: you can only match what you saved. Wigs are ranked by CIE76 ΔE between the hair colour the person tapped before treatment and each wig's ring shade (set by eye, like a retailer colour code), and the brow shape and colour become a reusable recipe.

## Run it

```bash
npm install
cp .env.example .env.local   # then set PERFECTCORP_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # colour maths + render client tests
```

"See Maya's demo" runs the whole flow from pre-rendered results in `public/demo/` and makes **no API calls**. Maya is an AI-generated persona.

## Privacy and honesty

- Photos pass through Ahead's server to the YouCam API to render try-ons and are not kept there. The Look Passport, including the photo, stays only in this browser (localStorage + optional JSON download). There are no accounts and no database.
- Ahead never simulates or shows hair loss. It is a cosmetic planning aid, not medical advice.
- Every face and wig image in this repo is AI-generated; prompts are logged in [`assets-src/PROVENANCE.md`](assets-src/PROVENANCE.md).

## Evidence

The landing-page facts and product claims, with verdicts and exact quotes, are in [`docs/research/EVIDENCE.md`](docs/research/EVIDENCE.md).

## Limits

- Maya is an AI-generated persona.
- Wig ring shades are set by eye from product photos.
- Colour read from a photo is approximate; bring a real lock of hair to the fitting.
- Not medical advice.

## Safeguards

Per-client and global daily caps on paid try-ons, magic-byte image checks, a decoded-pixel cap against decompression bombs, and chained sources restricted to YouCam result URLs.

## License

MIT — see [LICENSE](LICENSE).
