"use client";
import { useEffect, useRef, useState } from "react";
import { BROW_PRESETS, type Length } from "@/lib/catalog";
import { LENGTHS, type BrowPresetId } from "@/lib/passport";
import { samplePatch } from "@/lib/browser";
import { PassportPage } from "./PassportPage";
import { Button, Frame, PersonaNote } from "./ui";
import { PRIVACY } from "./Landing";

export interface Draft {
  hairHex?: string;
  browHex?: string;
  hairLength?: Length;
  browPreset?: BrowPresetId;
  hairAt?: [number, number];
  browAt?: [number, number];
}

type Tile = { state: "idle" | "running" | "done" | "error"; url?: string; error?: string };
const lengthLabel: Record<Length, string> = { short: "Short", mid: "Shoulder", long: "Long" };

export function PassportStep({
  photoUrl,
  holder,
  persona,
  draft,
  setDraft,
  renderBrow,
  onSave,
  savedAt,
  onDownload,
  onContinue,
}: {
  photoUrl: string;
  holder: string;
  persona?: string;
  draft: Draft;
  setDraft: (d: Draft) => void;
  renderBrow: (preset: BrowPresetId, hex: string) => Promise<string>;
  onSave: (img: HTMLImageElement) => void;
  savedAt?: string;
  onDownload: () => void;
  onContinue: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [target, setTarget] = useState<"hair" | "brow">(draft.hairHex ? "brow" : "hair");
  const [tiles, setTiles] = useState<Record<string, Tile>>({});
  const [sampleError, setSampleError] = useState<string>();
  const docRef = useRef<HTMLElement>(null);

  // Saving stamps the page; bring it into view so the moment is seen.
  useEffect(() => {
    if (!savedAt) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    docRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  }, [savedAt]);

  function tap(e: React.MouseEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const r = img.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    try {
      const hex = samplePatch(img, fx, fy);
      setSampleError(undefined);
      if (target === "hair") {
        setDraft({ ...draft, hairHex: hex, hairAt: [fx, fy] });
        setTarget("brow");
      } else {
        setDraft({ ...draft, browHex: hex, browAt: [fx, fy] });
      }
    } catch {
      setSampleError("That spot couldn't be read. Try tapping a little to one side.");
    }
  }

  async function drawBrows() {
    const hex = draft.browHex;
    if (!hex) return;
    setDraft({ ...draft, browPreset: undefined });
    await Promise.all(
      BROW_PRESETS.map(async (p) => {
        setTiles((t) => ({ ...t, [p.id]: { state: "running" } }));
        try {
          const url = await renderBrow(p.id, hex);
          setTiles((t) => ({ ...t, [p.id]: { state: "done", url } }));
        } catch (err) {
          setTiles((t) => ({ ...t, [p.id]: { state: "error", error: err instanceof Error ? err.message : "This one didn't render." } }));
        }
      }),
    );
  }

  async function retry(id: BrowPresetId) {
    if (!draft.browHex) return;
    setTiles((t) => ({ ...t, [id]: { state: "running" } }));
    try {
      const url = await renderBrow(id, draft.browHex);
      setTiles((t) => ({ ...t, [id]: { state: "done", url } }));
    } catch (err) {
      setTiles((t) => ({ ...t, [id]: { state: "error", error: err instanceof Error ? err.message : "This one didn't render." } }));
    }
  }

  const running = Object.values(tiles).filter((t) => t.state === "running").length;
  const anyTiles = Object.keys(tiles).length > 0;
  const ready = !!(draft.hairHex && draft.browHex && draft.hairLength && draft.browPreset);
  const marker = (at: [number, number] | undefined, label: string) =>
    at && (
      <span
        aria-hidden
        className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center"
        style={{ left: `${at[0] * 100}%`, top: `${at[1] * 100}%` }}
      >
        <span className="size-7 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
        <span className="mt-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">{label}</span>
      </span>
    );

  return (
    <main id="main" className="rise mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-14">
      <h1 tabIndex={-1} data-step-heading className="font-display text-4xl leading-tight tracking-[-0.01em] outline-none sm:text-5xl">
        Your Look Passport
      </h1>
      <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-ink-soft">
        Record your colours and your brow shape. This page is what every wig and brow is matched to later.
      </p>
      {persona && <div className="mt-3"><PersonaNote name={persona} /></div>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
        {/* Sampler */}
        <section aria-labelledby="sample-h">
          <h2 id="sample-h" className="text-xl font-medium">
            Tap your hair, then your brow
          </h2>
          <div role="group" aria-label="What are you tapping?" className="mt-4 inline-flex rounded-full bg-tint p-1">
            {(["hair", "brow"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={target === t}
                onClick={() => setTarget(t)}
                className={`min-h-10 cursor-pointer rounded-full px-5 text-[15px] transition-colors duration-300 ease-calm ${target === t ? "bg-surface shadow-sm" : "text-ink-soft"}`}
              >
                {t === "hair" ? "Hair" : "Brow"}
              </button>
            ))}
          </div>
          <Frame className="mt-4 p-2">
            <div className="relative mx-auto w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={photoUrl}
                alt={`Photo of ${holder}. Tap to sample your ${target}.`}
                onClick={tap}
                crossOrigin="anonymous"
                className="block max-h-[520px] w-auto max-w-full cursor-crosshair rounded-[14px]"
              />
              {marker(draft.hairAt, "Hair")}
              {marker(draft.browAt, "Brow")}
            </div>
          </Frame>
          <p role="status" aria-live="polite" className={`mt-3 min-h-6 text-[14px] ${sampleError ? "text-danger" : "text-ink-soft"}`}>
            {sampleError ?? (target === "hair" ? "Tap a mid-length strand, away from shine." : "Tap the fullest part of one brow.")}
          </p>
          <details className="mt-2 text-[14px]">
            <summary className="cursor-pointer text-ink-soft">Can't tap the photo? Choose the colours instead</summary>
            <div className="mt-3 flex flex-wrap gap-6">
              <label className="flex items-center gap-3">
                <input type="color" value={draft.hairHex ?? "#4a3022"} onChange={(e) => setDraft({ ...draft, hairHex: e.target.value.toUpperCase() })} className="size-10 cursor-pointer rounded-full" />
                Hair colour
              </label>
              <label className="flex items-center gap-3">
                <input type="color" value={draft.browHex ?? "#3a2a20"} onChange={(e) => setDraft({ ...draft, browHex: e.target.value.toUpperCase() })} className="size-10 cursor-pointer rounded-full" />
                Brow colour
              </label>
            </div>
          </details>
        </section>

        {/* The document fills in as you go */}
        <section ref={docRef} aria-labelledby="doc-h" className="lg:pt-12">
          <h2 id="doc-h" className="sr-only">Passport page</h2>
          <PassportPage
            f={{
              holder,
              photoUrl,
              hairHex: draft.hairHex,
              hairLength: draft.hairLength,
              browHex: draft.browHex,
              browPreset: draft.browPreset,
              thickness: 0,
              intensity: 80,
              savedAt,
            }}
          />
          <fieldset className="mt-8">
            <legend className="text-xl font-medium">Hair length today</legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <label key={l} className="cursor-pointer">
                  <input type="radio" name="length" value={l} checked={draft.hairLength === l} onChange={() => setDraft({ ...draft, hairLength: l })} className="peer sr-only" />
                  <span className="inline-flex min-h-11 items-center rounded-full px-5 ring-1 ring-inset ring-rule transition-colors duration-300 ease-calm peer-checked:bg-cover peer-checked:text-on-cover peer-checked:ring-cover peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-cover">
                    {lengthLabel[l]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      </div>

      {/* Brow match */}
      <section aria-labelledby="brow-h" className="mt-16 border-t border-rule pt-12">
        <h2 id="brow-h" className="font-display text-3xl tracking-[-0.01em] sm:text-4xl">
          Which brows are yours?
        </h2>
        <p className="mt-3 max-w-[60ch] leading-relaxed text-ink-soft">
          We draw three shapes on your photo in the brow colour you tapped. Choose the one where nothing seems to have changed. That one is your shape.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={drawBrows} disabled={!draft.browHex || running > 0}>
            {anyTiles ? "Draw them again" : "Show my brow options"}
          </Button>
          {!draft.browHex && <span className="text-[14px] text-ink-soft">Tap your brow first.</span>}
        </div>
        <p aria-live="polite" className="sr-only">
          {running > 0 ? `Drawing ${running} brow options` : anyTiles ? "Brow options ready" : ""}
        </p>

        {anyTiles && (
          <div role="radiogroup" aria-label="Brow shapes" className="mt-8 grid grid-cols-3 gap-2 sm:gap-5">
            {BROW_PRESETS.map((p) => {
              const t = tiles[p.id] ?? { state: "idle" };
              const chosen = draft.browPreset === p.id;
              return (
                <div key={p.id} className={`rounded-[14px] p-1 sm:rounded-[20px] sm:p-1.5 ring-1 transition-[box-shadow] duration-300 ease-calm ${chosen ? "ring-2 ring-cover" : "ring-rule"}`}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[10px] bg-tint sm:rounded-[14px]">
                    {t.state === "done" && t.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.url} alt={`${p.label} brows drawn on your photo`} className="develop size-full object-cover" />
                    ) : t.state === "error" ? (
                      <div className="grid size-full place-items-center p-4 text-center">
                        <div>
                          <p className="text-[14px] text-danger">{t.error}</p>
                          <Button variant="quiet" className="mt-3" onClick={() => retry(p.id)}>
                            Try again
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="breathe grid size-full place-items-center p-2 text-center text-[12px] text-ink-soft sm:text-[14px]">Drawing</div>
                    )}
                  </div>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    disabled={t.state !== "done"}
                    onClick={() => setDraft({ ...draft, browPreset: p.id })}
                    className="mt-1 flex min-h-11 w-full cursor-pointer flex-col items-start justify-center rounded-full px-2 text-left disabled:cursor-default disabled:opacity-50 sm:mt-1.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                  >
                    <span className="text-[14px] font-medium sm:text-base">{p.label}</span>
                    <span className={`text-[12px] sm:text-[14px] ${chosen ? "text-cover" : "text-ink-soft"}`}>{chosen ? "Mine" : "Choose"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Save" className="mt-14 flex flex-col gap-4 rounded-[20px] bg-tint/70 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[56ch] text-[14px] leading-relaxed text-ink-soft">
          {savedAt ? (persona ? `Saved for this demo. ${persona}'s passport is not stored in your browser.` : "Saved. Your passport is kept only in this browser. Download a copy to keep it somewhere safe.") : ready ? "Everything is recorded." : "To save, record your hair colour, brow colour, hair length and brow shape."}
          <span className="mt-1 block">{PRIVACY}</span>
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {savedAt ? (
            <>
              <Button variant="quiet" onClick={onDownload}>Download passport (JSON)</Button>
              <Button onClick={onContinue}>Continue to rebuild</Button>
            </>
          ) : (
            <Button disabled={!ready} onClick={() => imgRef.current && onSave(imgRef.current)}>
              Save my passport
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
