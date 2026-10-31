"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { HatRef, WigRef } from "@/lib/catalog";
import { browLabel, browTone, qrPayload, shadeFamily, wigShade, type Passport } from "@/lib/passport";
import { fittingList, liveLook, type Look } from "@/lib/render";
import { rankByColour } from "@/lib/color";
import { Button, Photo } from "./ui";
import { motion } from "motion/react";
import { motionTokens, staggerChild, staggerParent } from "./motion";

// The card assembles piece by piece, like a document being laid out on a desk.
const piece = staggerChild;
const photo = {
  hidden: { opacity: 0, y: motionTokens.distance.md, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth } },
};

const lengthName = { short: "Short", mid: "Shoulder length", long: "Long" } as const;

function Dot({ hex }: { hex: string }) {
  return <span aria-hidden className="inline-block size-3.5 shrink-0 rounded-full align-middle ring-1 ring-black/10" style={{ background: hex }} />;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={staggerParent}>
      <motion.h3 variants={piece} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft print:text-[9px]">{title}</motion.h3>
      <dl className="mt-1 divide-y divide-rule/70 print:mt-0">{children}</dl>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div variants={piece} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5 print:grid-cols-[5.5rem_1fr] print:gap-2 print:py-[2px]">
      <dt className="text-[13px] text-ink-soft print:text-[10.5px]">{label}</dt>
      <dd className="text-[15px] print:text-[11.5px]">{children}</dd>
    </motion.div>
  );
}

export function MatchCard({
  passport,
  photoUrl,
  holder,
  persona,
  look,
  wigs,
  hats,
  onBack,
}: {
  passport: Passport;
  photoUrl: string;
  holder: string;
  persona?: string;
  look: Look;
  wigs: WigRef[];
  hats: HatRef[];
  onBack: () => void;
}) {
  const [qr, setQr] = useState<string>();
  // Expired signed URLs are never printed as broken images.
  const { wig: lookWig, brow: lookBrow } = liveLook(look);
  const wig = lookWig && wigs.find((w) => w.id === lookWig.id);
  const hat = look.hat && hats.find((h) => h.id === look.hat!.id);
  const whose = persona ? `${holder}'s` : "your";
  // Shortlist in ring-match order, so "first one out of stock? ask for the next" reads top-down.
  // The pictured wig is always on it, so the list replaces the "wig chosen" rows (one A5 page).
  const fitting = fittingList(look.fitting, wigs);
  const shortlist = fitting.length ? rankByColour(wigs, passport.hairHex).filter((w) => fitting.includes(w.id) || w.id === wig?.id) : [];

  useEffect(() => {
    // Same ids as the printed list (shortlist plus the pictured wig), so card and QR agree.
    QRCode.toDataURL(qrPayload(passport, shortlist.map((w) => w.id)), { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#1c2420", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitting is derived; its ids are the real dependency
  }, [passport, shortlist.map((w) => w.id).join()]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-14">
      <div className="no-print flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 tabIndex={-1} data-step-heading className="font-display text-4xl leading-tight tracking-[-0.01em] outline-none sm:text-5xl">
            {persona ? `${holder}'s` : "Your"} Match Card
          </h1>
          <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            Print it, or save it as a PDF from the print dialog, and bring it to {persona ? "her" : "your"} wig fitter.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="quiet" onClick={onBack}>Back to rebuild</Button>
          <Button onClick={() => window.print()}>Download PDF</Button>
        </div>
      </div>

      <motion.article variants={staggerParent} initial="hidden" animate="visible" aria-label="Match Card" className="print-area guilloche mx-auto mt-10 print:mt-0 max-w-[620px] overflow-hidden rounded-[20px] shadow-[var(--shadow)] ring-1 ring-rule/70">
        <motion.header variants={piece} className="bg-cover px-6 py-5 text-on-cover print:px-5 print:py-3">
          <p className="text-[13px] opacity-80">{persona ? `Ahead Match Card for ${holder}, an AI-generated persona` : "Ahead Match Card"}</p>
          <h2 className="mt-1 font-display text-[28px] leading-tight print:text-[22px]">Show this to your wig fitter.</h2>
        </motion.header>

        <motion.div variants={staggerParent} className="grid grid-cols-2 gap-3 p-6 print:mx-auto print:w-[34%] print:gap-2 print:px-0 print:py-2">
          <motion.figure variants={photo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt={`${holder} before treatment`} className="aspect-[3/4] w-full rounded-[14px] object-cover ring-1 ring-rule" />
            <figcaption className="mt-2 text-[12px] text-ink-soft print:mt-1 print:text-[9.5px] print:leading-tight">Saved before treatment</figcaption>
          </motion.figure>
          <motion.figure variants={photo}>
            {lookWig ? (
              <div className="aspect-[3/4] w-full overflow-hidden rounded-[14px] ring-1 ring-rule">
                <Photo src={lookWig.url} alt={`${holder} wearing the chosen wig`} />
              </div>
            ) : (
              <div className="grid aspect-[3/4] w-full place-items-center rounded-[14px] border border-dashed border-rule p-4 text-center text-[13px] text-ink-soft">
                {look.wig ? "This try-on has expired. Refresh it in Rebuild." : "No wig chosen yet"}
              </div>
            )}
            <figcaption className="mt-2 text-[12px] text-ink-soft print:mt-1 print:text-[9.5px] print:leading-tight">{wig ? wig.label : "Chosen wig"}</figcaption>
          </motion.figure>
        </motion.div>

        <div className="grid gap-6 px-6 pb-6 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto] print:gap-4 print:px-5 print:pb-3">
          <motion.div variants={staggerParent} className="grid gap-5 print:gap-1.5">
            <Group title={persona ? "Saved hair" : "Your saved hair"}>
              <Row label="Colour">
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Dot hex={passport.hairHex} />
                  <span>{shadeFamily(passport.hairHex)}</span>
                  <span className="font-mono text-ink-soft">{passport.hairHex}</span>
                </span>
              </Row>
              <Row label="Length">{lengthName[passport.hairLength]}</Row>
            </Group>
            {wig && lookWig && !shortlist.length && (
              <Group title={persona ? "Wig chosen" : "Wig you chose"}>
                <Row label="Wig">{wig.label}</Row>
                <Row label="Shade">
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Dot hex={lookWig.dyed ? passport.hairHex : wig.hex} />
                    <span>{wigShade(lookWig.dyed ? { hex: passport.hairHex } : wig)}, {lengthName[wig.length].toLowerCase()}</span>
                    <span className="text-ink-soft">· {lookWig.dyed ? "recoloured towards the saved shade" : lookWig.match === 100 ? "same ring shade as the saved hair" : `approx. ${lookWig.match}% ring match to the saved hair`}</span>
                  </span>
                </Row>
              </Group>
            )}
            <Group title="Brow guide">
              <Row label="Shape">{browLabel(passport.brow.preset)}</Row>
              <Row label="Colour">
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Dot hex={passport.brow.hex} />
                  <span>{browTone(passport.brow.hex)}</span>
                  <span className="font-mono text-ink-soft">{passport.brow.hex}</span>
                </span>
              </Row>
              {passport.brow.thickness !== 0 && <Row label="Thickness">{passport.brow.thickness}</Row>}
              {hat && <Row label="Headwear">{hat.label}</Row>}
            </Group>
          </motion.div>
          <motion.div variants={photo} className="flex flex-col items-center gap-2 sm:w-36 print:w-28">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code with the passport recipe, without the photo" className="size-32 rounded-[10px] bg-white p-1.5 ring-1 ring-rule print:size-24" />
            ) : (
              <div className="size-32 rounded-[10px] bg-tint" />
            )}
            <p className="text-center text-[11px] leading-snug text-ink-soft">Scan for the recipe. The photo is not included.</p>
          </motion.div>
        </div>

        {shortlist.length > 0 && (
          // Full card width, so each wig fits one printed line without crowding the QR.
          <motion.div variants={staggerParent} className="px-6 pb-6 print:px-5 print:pb-2">
            <Group title="Ask your fitter for">
              {shortlist.map((w, i) => (
                <motion.div key={w.id} variants={piece} className="grid grid-cols-[1.5rem_1fr] gap-2 py-2.5 print:grid-cols-[1rem_1fr] print:py-[2px]">
                  <dt className="text-[13px] text-ink-soft print:text-[10.5px]">{i + 1}.</dt>
                  <dd className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] print:gap-x-1.5 print:text-[10.5px]">
                    <span>{w.label}</span>
                    <span className="text-ink-soft">·</span>
                    <Dot hex={w.id === wig?.id && lookWig?.dyed ? passport.hairHex : w.hex} />
                    <span>{wigShade(w.id === wig?.id && lookWig?.dyed ? { hex: passport.hairHex } : w)}</span>
                    <span className="text-ink-soft">
                      · {w.id === wig?.id && lookWig?.dyed ? "recoloured towards the saved shade" : w.match === 100 ? "same ring shade" : `approx. ${w.match}%`}
                      {w.id === wig?.id ? ", pictured" : ""}
                    </span>
                  </dd>
                </motion.div>
              ))}
            </Group>
          </motion.div>
        )}

        {lookBrow && (
          <motion.figure variants={piece} className="border-t border-dashed border-rule px-6 py-4 print:flex print:items-center print:gap-3 print:px-5 print:py-2">
            {/* An eye-area crop a brow artist can actually read, not a thumbnail. */}
            <div className="aspect-[5/2] w-full overflow-hidden rounded-[14px] ring-1 ring-rule print:w-[48%] print:shrink-0">
              <Photo src={lookBrow.url} alt={`Close-up of the saved brows drawn on ${whose} face, as a drawing guide`} closeUp />
            </div>
            <figcaption className="mt-2 text-[13px] leading-relaxed text-ink-soft print:mt-0 print:text-[10.5px]">
              Brow drawing guide: {browLabel(passport.brow.preset).toLowerCase()} in {passport.brow.hex}, drawn on {whose} face{lookBrow.wigId ? " with the chosen wig" : ""}.
            </figcaption>
          </motion.figure>
        )}

        <motion.section variants={piece} aria-label="Bring to your fitting" className="border-t border-rule px-6 py-4 print:px-5 print:py-1.5">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft print:text-[9px]">Bring to your fitting</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-snug print:mt-0.5 print:space-y-0 print:text-[10px] print:leading-tight">
            <li>A lock of hair cut from the top front, compared in natural light</li>
            <li>Photos of your current hairstyle</li>
            <li>Ask your doctor for a prescription for a &ldquo;cranial prosthesis&rdquo;. Some insurers cover part or all of the cost.</li>
          </ul>
                    <p className="mt-2 text-[12px] text-ink-soft print:mt-0.5 print:text-[9px]">
            Advice from the American Cancer Society (cancer.org, &ldquo;Wigs for Hair Loss&rdquo;).
            {shortlist.length > 0 && <> Fitting-list styles are AI-generated references, not products for sale. Prices and stock are your fitter&apos;s.</>} Cosmetic planning aid. Not medical advice.
          </p>
        </motion.section>
      </motion.article>
    </main>
  );
}
