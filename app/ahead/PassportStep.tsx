"use client";
import { useEffect, useRef, useState } from "react";
import { BROW_PRESETS, type Length } from "@/lib/catalog";
import { LENGTHS, browSampleProblem, type BrowPresetId, type Draft } from "@/lib/passport";
import { CappedError, StaleError } from "@/lib/render";
import { radioKeyIndex, samplePatch } from "@/lib/browser";
import { HAIR_RING, suggestShade } from "@/lib/hairChart";
import { PassportPage } from "./PassportPage";
import { Button, Frame, PersonaNote, Photo, ViewToggle } from "./ui";
import { PRIVACY } from "./Landing";
import { AnimatePresence, motion } from "motion/react";
import { motionTokens, springs, staggerChild, staggerParent } from "./motion";

export type { Draft };

type Tile = { state: "idle" | "running" | "done" | "error"; url?: string; error?: string; capped?: boolean };
const lengthLabel: Record<Length, string> = { short: "Short", mid: "Shoulder", long: "Long" };
const DEMO_PRIVACY = "This demo shows pre-rendered images of Maya. Nothing is uploaded and nothing is stored.";

export function PassportStep({
  photoUrl,
  holder,
  persona,
  draft,
  setDraft,
  renderBrow,
  onDemo,
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
  onDemo: () => void;
  onSave: (img: HTMLImageElement) => void;
  savedAt?: string;
  onDownload: () => void;
  onContinue: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [target, setTarget] = useState<"hair" | "brow">(draft.hairHex ? "brow" : "hair");
  const [tiles, setTiles] = useState<Record<string, Tile>>({});
  const [closeUp, setCloseUp] = useState(true);
  const [sampleError, setSampleError] = useState<string>();
  const docRef = useRef<HTMLElement>(null);

  // Saving stamps the page; bring it into view so the moment is seen. Only on a new
  // save, not when the screen remounts with a passport that was saved earlier.
  const savedOnMount = useRef(savedAt);
  useEffect(() => {
    if (!savedAt || savedAt === savedOnMount.current) return;
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
      // A brow tap that reads as skin is refused gently instead of saved as the brow colour.
      const problem = target === "brow" ? browSampleProblem(hex) : undefined;
      setSampleError(problem);
      if (problem) return;
      if (target === "hair") {
        // A tap only suggests a ring shade; the person confirms it on the ring below.
        setDraft({ ...draft, hairHex: suggestShade(hex).hex, hairAt: [fx, fy] });
        setTarget("brow");
      } else {
        setDraft({ ...draft, browHex: hex, browAt: [fx, fy] });
      }
    } catch {
      setSampleError("That spot couldn't be read. Try tapping a little to one side.");
    }
  }

  async function renderTile(id: BrowPresetId, hex: string) {
    setTiles((t) => ({ ...t, [id]: { state: "running" } }));
    try {
      const url = await renderBrow(id, hex);
      setTiles((t) => ({ ...t, [id]: { state: "done", url } }));
    } catch (err) {
      if (err instanceof StaleError) return; // a newer session owns this screen now
      const error = err instanceof Error ? err.message : "This one didn't render.";
      setTiles((t) => ({ ...t, [id]: { state: "error", error, capped: err instanceof CappedError } }));
    }
  }

  async function drawBrows() {
    const hex = draft.browHex;
    if (!hex) return;
    setDraft({ ...draft, browPreset: undefined });
    await Promise.all(BROW_PRESETS.map((p) => renderTile(p.id, hex)));
  }

  // An image that fails to load can't be chosen: you can't judge brows you can't see.
  function imageFailed(id: BrowPresetId) {
    setTiles((t) => ({ ...t, [id]: { state: "error", error: "This image didn't load." } }));
    if (draft.browPreset === id) setDraft({ ...draft, browPreset: undefined });
  }

  const ringRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const checkedRing = HAIR_RING.findIndex((s) => s.hex === draft.hairHex);
  const ringTab = checkedRing < 0 ? 0 : checkedRing;
  function ringKey(e: React.KeyboardEvent) {
    const next = radioKeyIndex(e.key, ringTab, HAIR_RING.length);
    if (next < 0) return;
    e.preventDefault();
    setDraft({ ...draft, hairHex: HAIR_RING[next].hex });
    ringRefs.current[next]?.focus();
  }

  const list = Object.values(tiles);
  const running = list.filter((t) => t.state === "running").length;
  const failed = list.filter((t) => t.state === "error");
  const done = list.filter((t) => t.state === "done").length;
  const anyTiles = list.length > 0;
  const firstError = failed[0]?.error;
  const announce = running
    ? `Drawing ${running} brow options`
    : !anyTiles
      ? ""
      : failed.length === 0
        ? "Brow options ready"
        : done === 0
          ? `None of the brow options rendered. ${firstError}`
          : `${done} brow options ready. ${failed.length} didn't render. ${firstError}`;
  const ready = !!(draft.hairHex && draft.browHex && draft.hairLength && draft.browPreset);
  const marker = (at: [number, number] | undefined, label: string) =>
    at && (
      <span
        aria-hidden
        className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center"
        style={{ left: `${at[0] * 100}%`, top: `${at[1] * 100}%` }}
      >
        <motion.span
          key={at.join()}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.snappy}
          className="size-7 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]"
        />
        <span className="mt-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">{label}</span>
      </span>
    );

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-14">
      <h1 tabIndex={-1} data-step-heading className="font-display text-4xl leading-tight tracking-[-0.01em] outline-none sm:text-5xl">
        {persona ? `${persona}'s Look Passport` : "Your Look Passport"}
      </h1>
      <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-ink-soft">
        {persona
          ? `${persona} tapped her hair and her brow; the page shows what was measured. Next, find her brow shape below and save the page.`
          : "Record your colours and your brow shape. This page is what every wig and brow is matched to later."}
      </p>
      {persona && <div className="mt-3"><PersonaNote name={persona} /></div>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
        {/* Sampler */}
        <section aria-labelledby="sample-h">
          <h2 id="sample-h" className="text-xl font-medium">
            {persona ? "Measured from her photo" : "Tap your hair, then your brow"}
          </h2>
          <div role="group" aria-label={persona ? "Re-measure" : "What are you tapping?"} className="mt-4 inline-flex rounded-full bg-tint p-1">
            {(["hair", "brow"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={target === t}
                onClick={() => setTarget(t)}
                className={`relative min-h-10 cursor-pointer rounded-full px-5 text-[15px] transition-colors duration-300 ease-calm ${target === t ? "text-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {target === t && <motion.span aria-hidden layoutId="sample-target" transition={springs.snappy} className="absolute inset-0 rounded-full bg-surface shadow-sm" />}
                <span className="relative">{t === "hair" ? "Hair" : "Brow"}</span>
              </button>
            ))}
          </div>
          <Frame className="mt-4 p-2">
            <div className="relative mx-auto w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={photoUrl}
                alt={`Photo of ${holder}. Tap to sample the ${target}.`}
                onClick={tap}
                crossOrigin="anonymous"
                className="block max-h-[520px] w-auto max-w-full cursor-crosshair rounded-[14px]"
              />
              {marker(draft.hairAt, "Hair")}
              {marker(draft.browAt, "Brow")}
            </div>
          </Frame>
          <p role="status" aria-live="polite" className={`mt-3 min-h-6 text-[14px] ${sampleError ? "text-danger" : "text-ink-soft"}`}>
            {sampleError ??
              (persona
                ? "Already measured. Tap the photo only if you want to measure again."
                : target === "hair"
                  ? "Tap a mid-length strand, away from shine."
                  : "Tap the fullest part of one brow.")}
          </p>
          <fieldset className="mt-5">
            <legend className="text-[15px] font-medium">Confirm {persona ? `${persona}'s` : "your"} hair shade on the colour ring</legend>
            <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-soft">
              A photo can&apos;t measure hair colour exactly; light changes it. {draft.hairHex ? `We marked the shade closest to ${persona ? "her" : "your"} tap.` : "Tap your hair, or pick a shade."} Choose the one that matches {persona ? "her" : "your"} hair in daylight.
            </p>
            {/* Roving tabindex: one tab stop; arrows move and select, Home/End jump. */}
            <div role="radiogroup" aria-label="Hair colour ring" onKeyDown={ringKey} className="mt-3 flex flex-wrap gap-2">
              {HAIR_RING.map((s, i) => {
                const on = draft.hairHex === s.hex;
                return (
                  <button
                    key={s.id}
                    ref={(el) => {
                      ringRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={i === ringTab ? 0 : -1}
                    onClick={() => setDraft({ ...draft, hairHex: s.hex })}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[13px] transition-colors ${on ? "border-cover bg-tint text-ink" : "border-rule text-ink-soft hover:border-ink-soft"}`}
                  >
                    <span aria-hidden className={`size-6 rounded-full ring-1 ring-black/10 ${on ? "ring-2 ring-cover ring-offset-2 ring-offset-surface" : ""}`} style={{ background: s.hex }} />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <details className="mt-4 text-[14px]">
            <summary className="cursor-pointer text-ink-soft">Can&apos;t tap the photo? Choose your brow colour instead</summary>
            <div className="mt-3 flex flex-wrap gap-6">
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
                  <span className="press inline-flex min-h-11 items-center rounded-full px-5 ring-1 ring-inset ring-rule hover:ring-ink-soft/50 peer-checked:bg-cover peer-checked:text-on-cover peer-checked:ring-cover peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-cover">
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
          {persona ? `Which brows are ${persona}'s?` : "Which brows are yours?"}
        </h2>
        <p className="mt-3 max-w-[60ch] leading-relaxed text-ink-soft">
          We draw three shapes on {persona ? "her" : "your"} photo in the brow colour {persona ? "she" : "you"} tapped. Choose the one where nothing seems to have changed. That one is {persona ? "her" : "your"} shape.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={drawBrows} disabled={!draft.browHex || running > 0}>
            {anyTiles ? "Draw them again" : persona ? "Show her brow options" : "Show my brow options"}
          </Button>
          {!draft.browHex && <span className="text-[14px] text-ink-soft">Tap your brow first.</span>}
          {anyTiles && <ViewToggle label="Brow view" closeUp={closeUp} onChange={setCloseUp} />}
        </div>
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>

        {anyTiles && (
          <motion.div role="radiogroup" aria-label="Brow shapes" variants={staggerParent} initial="hidden" animate="visible" className="mt-8 grid grid-cols-3 gap-2 sm:gap-5">
            {BROW_PRESETS.map((p) => {
              const t = tiles[p.id] ?? { state: "idle" };
              const chosen = draft.browPreset === p.id;
              return (
                <motion.div
                  key={p.id}
                  variants={staggerChild}
                  className={`group relative min-w-0 rounded-[14px] bg-surface p-1 ring-1 transition-[box-shadow,transform] duration-300 ease-calm sm:rounded-[20px] sm:p-1.5 ${chosen ? "shadow-[var(--shadow)] ring-2 ring-cover" : "ring-rule hover:ring-ink-soft/50 hover:shadow-[var(--shadow)]"}`}
                >
                  {chosen && (
                    <motion.span
                      aria-hidden
                      layoutId="brow-chosen"
                      transition={springs.settle}
                      className="absolute -right-1.5 -top-1.5 z-10 grid size-7 place-items-center rounded-full bg-cover text-on-cover shadow-[var(--shadow)] sm:-right-2 sm:-top-2 sm:size-8"
                    >
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <motion.path d="M3.5 8.5l3 3 6-7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: 0.1 }} />
                      </svg>
                    </motion.span>
                  )}
                  <div className={`relative overflow-hidden rounded-[10px] bg-tint sm:rounded-[14px] ${closeUp ? "aspect-[4/3]" : "aspect-[3/4]"} ${t.state === "running" || t.state === "idle" ? "shimmer" : ""}`}>
                    {t.state === "done" && t.url ? (
                      // develop lives on the wrapper: its transform fill would override the close-up zoom.
                      <div key={t.url} className="develop size-full">
                        <Photo src={t.url} alt={`${p.label} brows drawn on the photo${closeUp ? ", close-up of the brows" : ""}`} closeUp={closeUp} onFail={() => imageFailed(p.id)} />
                      </div>
                    ) : t.state === "error" ? (
                      // Kept short so it fits a 90px tile at 320px; the full reason is read out and shown below.
                      <div className="grid size-full place-items-center p-1.5 text-center">
                        <div className="min-w-0">
                          <p className="text-[12px] leading-snug text-danger sm:text-[14px]">Didn&apos;t render</p>
                          {t.capped ? (
                            <button type="button" onClick={onDemo} className="mt-1 min-h-11 cursor-pointer rounded-full px-2 text-[12px] font-medium underline underline-offset-4 sm:text-[14px]">
                              See Maya&apos;s demo
                            </button>
                          ) : (
                            <button type="button" onClick={() => draft.browHex && renderTile(p.id, draft.browHex)} className="mt-1 min-h-11 cursor-pointer rounded-full px-2 text-[12px] font-medium underline underline-offset-4 sm:text-[14px]">
                              Try again
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid size-full place-items-end p-2 text-center text-[12px] text-ink-soft sm:p-4 sm:text-[14px]">
                        <span className="w-full">Drawing</span>
                      </div>
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
                    <span className={`text-[12px] transition-colors duration-300 ease-calm sm:text-[14px] ${chosen ? "font-medium text-cover" : "text-ink-soft group-hover:text-ink"}`}>{chosen ? "Mine" : "Choose"}</span>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
        {firstError && !running && (
          <p className="mt-4 max-w-[60ch] text-[14px] leading-relaxed text-danger">{firstError}</p>
        )}
      </section>

      <section aria-label="Save" className="mt-14 flex flex-col gap-4 rounded-[20px] bg-tint/70 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[56ch] text-[14px] leading-relaxed text-ink-soft">
          {savedAt ? (persona ? `Saved for this demo. ${persona}'s passport is not stored in your browser.` : "Saved. Your passport is kept only in this browser. Download a copy to keep it somewhere safe.") : ready ? "Everything is recorded." : "To save, record the hair colour, brow colour, hair length and brow shape."}
          <span className="mt-1 block">{persona ? DEMO_PRIVACY : PRIVACY}</span>
        </p>
        {!savedAt && (
          <Button disabled={!ready} onClick={() => imgRef.current && onSave(imgRef.current)}>
            Save {persona ? "the" : "my"} passport
          </Button>
        )}
      </section>

      {/* After saving, the next step stays on screen while the stamp is admired. */}
      <AnimatePresence>
        {savedAt && (
          <motion.div
            key="next"
            initial={{ y: motionTokens.distance.lg }}
            animate={{ y: 0, transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth } }}
            exit={{ opacity: 0, transition: { duration: motionTokens.duration.fast } }}
            data-next-bar
            className="no-print sticky bottom-3 z-20 mt-6 flex items-center justify-between gap-2 rounded-full bg-surface/95 p-1.5 shadow-[var(--shadow)] ring-1 ring-rule/70 backdrop-blur sm:gap-3 sm:rounded-[20px] sm:p-3 sm:pl-6"
          >
            <p className="hidden text-[14px] text-ink-soft sm:block">Passport saved. Next: see {persona ? "her" : "your"} brows and wigs.</p>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="quiet" onClick={onDownload} aria-label="Download passport (JSON)" className="px-4 sm:px-6">
                <span className="sm:hidden">JSON</span>
                <span className="hidden sm:inline">Download passport (JSON)</span>
              </Button>
              <Button onClick={onContinue} className="flex-1 sm:flex-none">Continue to rebuild</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
