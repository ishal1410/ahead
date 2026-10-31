# Asset provenance

All faces and wig references are AI-generated with Pollinations (model `zimage`, Z-Image Turbo). No real people, no stock, no shop photos.

| File | Seed | Prompt |
|---|---|---|
| assets-src/maya-z.jpg (Maya) | 7 | Photorealistic candid portrait photograph of a 40-year-old woman with shoulder-length wavy chestnut brown hair worn down, natural full dark brown eyebrows, faint smile lines, real skin texture with pores, no makeup, grey crew-neck sweater, facing the camera straight on, head and shoulders, plain warm grey wall, soft window light, 85mm lens, documentary style |
| public/refs/wig-chestnut-wave.jpg | 101 | Photorealistic studio portrait photograph of a woman wearing a shoulder-length wavy chestnut brown wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-espresso-straight.jpg | 102 | Photorealistic studio portrait photograph of a woman wearing a shoulder-length straight dark espresso brown wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-auburn-long.jpg | 103 | Photorealistic studio portrait photograph of a woman wearing a long softly layered auburn red wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-caramel-bob.jpg | 104 | Photorealistic studio portrait photograph of a woman wearing a chin-length caramel brown bob wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-black-pixie.jpg | 105 | Photorealistic studio portrait photograph of a woman wearing a short soft black pixie cut wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-ash-blonde-bob.jpg | 106 | Photorealistic studio portrait photograph of a woman wearing a chin-length ash blonde bob wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-honey-long.jpg | 107 | Photorealistic studio portrait photograph of a woman wearing a long straight honey blonde wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-silver-short.jpg | 108 | Photorealistic studio portrait photograph of a woman wearing a short layered silver grey wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |
| public/refs/wig-soft-chestnut.jpg | 109 | Photorealistic studio portrait photograph of a woman wearing a shoulder-length softly wavy light chestnut brown with warm golden highlights wig, hair fully visible, facing the camera straight on, head and shoulders, plain light grey background, soft even light, neutral expression, natural skin, plain grey top, 85mm lens |

## Derived files

| File | Made from | How |
|---|---|---|
| public/demo/maya.jpg | assets-src/maya-z.jpg | Resized to 1024px long side (scripts/render-demo.mjs) |
| public/demo/brow-*.jpg | public/demo/maya.jpg | YouCam Makeup VTO (eyebrows), live API output (scripts/render-demo.mjs `brow:<preset>`) |
| public/demo/wig-*.jpg | maya.jpg + public/refs/wig-*.jpg | YouCam hair transfer, live API output (`wigbrow:<id>`) |
| public/demo/brow-on-wig-*.jpg | public/demo/wig-*.jpg | YouCam Makeup VTO on the wig render (`wigbrow:<id>`) |
| public/demo/dyed-*.jpg | public/demo/wig-*.jpg | YouCam AI Hair Color to Maya's saved ring shade (`dye:<id>`) |
| public/demo/brow-on-dyed-*.jpg | public/demo/dyed-*.jpg | YouCam Makeup VTO on the recoloured wig (`dye:<id>`) |
