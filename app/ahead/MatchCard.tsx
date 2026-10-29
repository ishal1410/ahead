"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { HatRef, WigRef } from "@/lib/catalog";
import { browLabel, qrPayload, shadeFamily, type Passport } from "@/lib/passport";
import type { Look } from "./Rebuild";
import { Button } from "./ui";

const lengthName = { short: "Short", mid: "Shoulder length", long: "Long" } as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5">
      <dt className="text-[13px] text-ink-soft">{label}</dt>
      <dd className="text-[15px]">{children}</dd>
    </div>
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
  const wig = look.wig && wigs.find((w) => w.id === look.wig!.id);
  const hat = look.hat && hats.find((h) => h.id === look.hat!.id);

  useEffect(() => {
    QRCode.toDataURL(qrPayload(passport), { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#1c2420", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(undefined));
  }, [passport]);

  return (
    <main id="main" className="rise mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-14">
      <div className="no-print flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 tabIndex={-1} data-step-heading className="font-display text-4xl leading-tight tracking-[-0.01em] outline-none sm:text-5xl">
            Your Match Card
          </h1>
          <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            Print it, or save it as a PDF from the print dialog, and bring it to your wig fitter.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="quiet" onClick={onBack}>Back to rebuild</Button>
          <Button onClick={() => window.print()}>Download PDF</Button>
        </div>
      </div>

      <article aria-label="Match Card" className="print-area guilloche mx-auto mt-10 max-w-[620px] overflow-hidden rounded-[20px] shadow-[var(--shadow)] ring-1 ring-rule/70">
        <header className="bg-cover px-6 py-5 text-on-cover">
          <p className="text-[13px] opacity-80">Ahead Match Card for {holder}{persona ? ", an AI-generated persona" : ""}</p>
          <h2 className="mt-1 font-display text-[28px] leading-tight">Show this to your wig fitter.</h2>
        </header>

        <div className="grid grid-cols-2 gap-3 p-6">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt={`${holder} before treatment`} className="aspect-[3/4] w-full rounded-[14px] object-cover ring-1 ring-rule" />
            <figcaption className="mt-2 text-[12px] text-ink-soft">Saved before treatment</figcaption>
          </figure>
          <figure>
            {look.wig ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={look.wig.url} alt={`${holder} wearing the chosen wig`} className="aspect-[3/4] w-full rounded-[14px] object-cover ring-1 ring-rule" />
            ) : (
              <div className="grid aspect-[3/4] w-full place-items-center rounded-[14px] border border-dashed border-rule p-4 text-center text-[13px] text-ink-soft">
                No wig chosen yet
              </div>
            )}
            <figcaption className="mt-2 text-[12px] text-ink-soft">{wig ? wig.label : "Chosen wig"}</figcaption>
          </figure>
        </div>

        <div className="grid gap-6 px-6 pb-6 sm:grid-cols-[1fr_auto]">
          <dl className="divide-y divide-rule/70">
            <Row label="Hair colour">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="size-4 rounded-full ring-1 ring-black/10" style={{ background: passport.hairHex }} />
                <span className="font-mono">{passport.hairHex}</span>
              </span>
            </Row>
            <Row label="Shade family">{wig?.shade ?? shadeFamily(passport.hairHex)}</Row>
            <Row label="Length">{lengthName[passport.hairLength]}</Row>
            {look.wig && <Row label="Colour match">{look.wig.match}% to the saved colour</Row>}
            <Row label="Brow guide">
              {browLabel(passport.brow.preset)}, thickness {passport.brow.thickness === 0 ? "as saved" : passport.brow.thickness},{" "}
              <span className="inline-flex items-center gap-1.5 align-middle">
                <span aria-hidden className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: passport.brow.hex }} />
                <span className="font-mono">{passport.brow.hex}</span>
              </span>
            </Row>
            {hat && <Row label="Headwear">{hat.label}</Row>}
          </dl>
          <div className="flex flex-col items-center gap-2 sm:w-36">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code with the passport recipe, without the photo" className="size-32 rounded-[10px] bg-white p-1.5 ring-1 ring-rule" />
            ) : (
              <div className="size-32 rounded-[10px] bg-tint" />
            )}
            <p className="text-center text-[11px] leading-snug text-ink-soft">Scan for the recipe. The photo is not included.</p>
          </div>
        </div>

        {look.brow && (
          <div className="flex items-center gap-4 border-t border-dashed border-rule px-6 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.brow.url} alt="Saved brows drawn on the photo, as a drawing guide" className="h-20 w-16 rounded-[10px] object-cover ring-1 ring-rule" />
            <p className="text-[13px] leading-relaxed text-ink-soft">Brow drawing guide: the saved shape and colour, drawn on {persona ? `${holder}'s` : "your"} face.</p>
          </div>
        )}

        <footer className="border-t border-rule px-6 py-3 text-[12px] text-ink-soft">Cosmetic planning aid. Not medical advice.</footer>
      </article>
    </main>
  );
}
