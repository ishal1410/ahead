"use client";
import { useEffect, useRef, useState } from "react";
import type { HatRef, WigRef } from "@/lib/catalog";
import { rankByColour } from "@/lib/color";
import { browLabel, shadeFamily, type Passport } from "@/lib/passport";
import { Button, Frame, PersonaNote, Swatch } from "./ui";
import { AnimatePresence, motion } from "motion/react";
import { CountUp, motionTokens, springs, staggerChild, staggerParent } from "./motion";

const panelMotion = {
  initial: { opacity: 0, y: motionTokens.distance.sm },
  animate: { opacity: 1, y: 0, transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth } },
  exit: { opacity: 0, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } },
};

export interface Look {
  wig?: { id: string; url: string; match: number };
  hat?: { id: string; url: string; onWig: boolean };
  brow?: { url: string; onWig: boolean };
}

type Tab = "brows" | "wigs" | "headwear";
const TABS: { id: Tab; label: string }[] = [
  { id: "brows", label: "Brows" },
  { id: "wigs", label: "Wigs" },
  // Headwear tab removed: YouCam's hat API generates a full-body fashion scene
  // (new outfit, city backdrop, small face), not a head-and-shoulders try-on.
];

const pub = (file: string) => "/" + file.replace(/^\/+/, "");
const lengthName = { short: "Short", mid: "Shoulder", long: "Long" } as const;

export function Rebuild({
  passport,
  photoUrl,
  holder,
  persona,
  wigs,
  hats,
  look,
  setLook,
  render,
  onCard,
}: {
  passport: Passport;
  photoUrl: string;
  holder: string;
  persona?: string;
  wigs: WigRef[];
  hats: HatRef[];
  look: Look;
  setLook: (l: Look) => void;
  render: (feature: "wig" | "hat" | "brow", opts: { refId?: string; onUrl?: string }) => Promise<string>;
  onCard: () => void;
}) {
  const [tab, setTab] = useState<Tab>("brows");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [tellOpen, setTellOpen] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ brows: null, wigs: null, headwear: null });
  const ranked = rankByColour(wigs, passport.hairHex);

  const stage =
    tab === "brows" ? look.brow?.url ?? look.wig?.url ?? photoUrl : tab === "wigs" ? look.wig?.url ?? photoUrl : look.hat?.url ?? look.wig?.url ?? photoUrl;
  const stageCaption =
    tab === "brows" && look.brow
      ? `Your saved brows, ${browLabel(passport.brow.preset).toLowerCase()}, drawn ${look.brow.onWig ? "with your wig" : "on your photo"}`
      : tab === "headwear" && look.hat
        ? `${hats.find((h) => h.id === look.hat!.id)?.label ?? "Headwear"}${look.hat.onWig ? ", over your wig" : ""}`
        : look.wig && tab !== "brows"
          ? `${wigs.find((w) => w.id === look.wig!.id)?.label ?? "Wig"}, ${look.wig.match}% colour match to the hair you saved`
          : "Your baseline photo";

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That try-on didn't finish. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const drawBrows = () =>
    run("brow", async () => {
      const onUrl = look.wig?.url;
      const url = await render("brow", { onUrl });
      setLook({ ...look, brow: { url, onWig: !!onUrl } });
    });

  const tryWig = (w: WigRef & { match: number }) =>
    run(`wig:${w.id}`, async () => {
      const url = await render("wig", { refId: w.id });
      // A new wig makes brows/hats drawn on the old one stale.
      setLook({ wig: { id: w.id, url, match: w.match }, brow: look.brow?.onWig ? undefined : look.brow, hat: look.hat?.onWig ? undefined : look.hat });
    });

  const tryHat = (h: HatRef) =>
    run(`hat:${h.id}`, async () => {
      const onUrl = look.wig?.url;
      const url = await render("hat", { refId: h.id, onUrl });
      setLook({ ...look, hat: { id: h.id, url, onWig: !!onUrl } });
    });

  function onTabKey(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  }

  const status = busy
    ? busy === "brow"
      ? "Drawing your brows. This takes about half a minute."
      : busy.startsWith("wig")
        ? "Fitting the wig to your photo. This takes about half a minute."
        : "Trying the headwear on. This takes about half a minute."
    : error ?? "";

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 tabIndex={-1} data-step-heading className="font-display text-4xl leading-tight tracking-[-0.01em] outline-none sm:text-5xl">
            Rebuild your look
          </h1>
          <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-ink-soft">Everything here starts from the passport {persona ? `${holder} saved` : "you saved"}.</p>
          {persona && <div className="mt-2"><PersonaNote name={persona} /></div>}
        </div>
        <Button onClick={onCard}>Make my Match Card</Button>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        {/* Shared face stage */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Frame className="p-2">
            <div className="relative grid overflow-hidden rounded-[14px] bg-tint">
              {/* Each new render develops over the last one: same frame, no jump. */}
              <AnimatePresence initial={false} mode="sync">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img
                  key={stage}
                  src={stage}
                  alt={stageCaption}
                  className="col-start-1 row-start-1 mx-auto block max-h-[620px] w-auto max-w-full"
                  initial={{ opacity: 0, scale: 1.015, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: motionTokens.duration.crawl, ease: motionTokens.easing.smooth } }}
                  exit={{ opacity: 0, transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth } }}
                />
              </AnimatePresence>
              <AnimatePresence>
                {busy && (
                  <motion.div
                    key="busy"
                    className="shimmer absolute inset-0 grid place-items-end bg-paper/35 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
                  >
                    <span className="relative mx-auto inline-flex items-center gap-2.5 rounded-full bg-surface px-4 py-2 text-[14px] shadow-[var(--shadow)]">
                      <span aria-hidden className="breathe size-1.5 rounded-full bg-cover" />
                      Rendering
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={stageCaption} {...panelMotion} className="px-3 pb-2 pt-3 text-[14px] text-ink-soft">
                {stageCaption}
              </motion.p>
            </AnimatePresence>
          </Frame>
          <p role="status" aria-live="polite" className={`mt-3 min-h-6 text-[14px] ${error && !busy ? "text-danger" : "text-ink-soft"}`}>
            {status}
          </p>
        </div>

        <div>
          <div role="tablist" aria-label="Rebuild" onKeyDown={onTabKey} className="inline-flex rounded-full bg-tint p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`relative min-h-10 cursor-pointer rounded-full px-5 text-[15px] transition-colors duration-300 ease-calm ${tab === t.id ? "text-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {tab === t.id && <motion.span aria-hidden layoutId="rebuild-tab" transition={springs.snappy} className="absolute inset-0 rounded-full bg-surface shadow-sm" />}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-8">
            <AnimatePresence mode="wait" initial={false}>
            {tab === "brows" && (
              <motion.div key="brows" {...panelMotion}>
                <h2 className="font-display text-3xl tracking-[-0.01em]">Your brows, from your passport</h2>
                <p className="mt-3 max-w-[50ch] leading-relaxed text-ink-soft">
                  Your saved shape and colour, drawn on your face. This is the guide you or a brow artist can redraw from.
                </p>
                <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
                  <div>
                    <dt className="text-[13px] text-ink-soft">Shape</dt>
                    <dd className="mt-1 text-lg">{browLabel(passport.brow.preset)}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-ink-soft">Thickness</dt>
                    <dd className="mt-1 text-lg">{passport.brow.thickness === 0 ? "As saved" : passport.brow.thickness}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Colour</dt>
                    <dd><Swatch hex={passport.brow.hex} label="Colour" /></dd>
                  </div>
                </dl>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button onClick={drawBrows} disabled={!!busy}>
                    {look.brow ? "Draw them again" : "Draw my brows"}
                  </Button>
                  <span className="text-[14px] text-ink-soft">{look.wig ? "Drawn with the wig you chose." : "Choose a wig first to see them together."}</span>
                </div>
              </motion.div>
            )}

            {tab === "wigs" && (
              <motion.div key="wigs" {...panelMotion}>
                <h2 className="font-display text-3xl tracking-[-0.01em]">Closest to your hair first</h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-ink-soft">
                  <Swatch hex={passport.hairHex} label={`Saved: ${shadeFamily(passport.hairHex)}, ${lengthName[passport.hairLength].toLowerCase()}`} size="sm" />
                </div>

                {look.wig && (
                  <div className="mt-6">
                    <Button variant="quiet" onClick={() => setTellOpen(true)}>Can you tell?</Button>
                  </div>
                )}

                {ranked.length === 0 ? (
                  <div className="mt-8 rounded-[20px] border border-dashed border-rule p-8">
                    <p className="font-display text-2xl">The wig collection is on its way</p>
                    <p className="mt-2 max-w-[44ch] leading-relaxed text-ink-soft">
                      Wigs will appear here ranked by how closely they match the colour you saved. Your passport is ready for them.
                    </p>
                  </div>
                ) : (
                  <motion.ul variants={staggerParent} initial="hidden" animate="visible" className="mt-8 grid gap-4 sm:grid-cols-2">
                    {ranked.map((w) => {
                      const chosen = look.wig?.id === w.id;
                      const loading = busy === `wig:${w.id}`;
                      return (
                        <motion.li key={w.id} variants={staggerChild} className="h-full">
                          <button
                            type="button"
                            onClick={() => tryWig(w)}
                            disabled={!!busy}
                            aria-pressed={chosen}
                            className={`press group relative flex h-full w-full cursor-pointer gap-4 rounded-[20px] bg-surface p-2 text-left ring-1 disabled:cursor-wait ${chosen ? "shadow-[var(--shadow)] ring-2 ring-cover" : "ring-rule hover:shadow-[var(--shadow)] hover:ring-ink-soft/50"}`}
                          >
                            <span className={`block aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-[14px] bg-tint ${loading ? "shimmer" : ""}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={pub(w.file)} alt="" className="size-full object-cover transition-transform duration-500 ease-calm group-hover:scale-[1.04]" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1 pr-2">
                              <span>
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-medium leading-snug">{w.label}</span>
                                  {chosen && (
                                    <motion.span layoutId="wig-chosen" transition={springs.settle} className="rounded-full bg-tint px-2 py-0.5 text-[12px] text-cover">
                                      On your photo
                                    </motion.span>
                                  )}
                                </span>
                                <span className="mt-1 block text-[14px] text-ink-soft">
                                  {w.shade}, {lengthName[w.length].toLowerCase()}
                                  {w.length === passport.hairLength && ", your length"}
                                </span>
                              </span>
                              <span className="block">
                                <span className="flex items-baseline gap-1.5">
                                  <span className="font-display text-3xl leading-none">{w.match}%</span>
                                  <span className="text-[13px] text-ink-soft">colour match</span>
                                </span>
                                <span aria-hidden className="mt-2.5 block h-[3px] overflow-hidden rounded-full bg-tint">
                                  <motion.span
                                    className="block h-full origin-left rounded-full bg-cover"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: w.match / 100 }}
                                    transition={{ duration: motionTokens.duration.crawl, ease: motionTokens.easing.smooth, delay: 0.25 }}
                                  />
                                </span>
                              </span>
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                )}
              </motion.div>
            )}

            {tab === "headwear" && (
              <motion.div key="headwear" {...panelMotion}>
                <h2 className="font-display text-3xl tracking-[-0.01em]">Headwear</h2>
                <p className="mt-3 max-w-[50ch] leading-relaxed text-ink-soft">
                  {look.wig ? "Tried on over the wig you chose, so you see the full look." : "Tried on your photo. Choose a wig first to see them together."}
                </p>
                {hats.length === 0 ? (
                  <div className="mt-8 rounded-[20px] border border-dashed border-rule p-8">
                    <p className="font-display text-2xl">Hats are on their way</p>
                    <p className="mt-2 max-w-[44ch] leading-relaxed text-ink-soft">Soft hats and caps will appear here, ready to try on with your look.</p>
                  </div>
                ) : (
                  <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {hats.map((h) => {
                      const chosen = look.hat?.id === h.id;
                      return (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => tryHat(h)}
                            disabled={!!busy}
                            aria-pressed={chosen}
                            className={`w-full cursor-pointer rounded-[20px] bg-surface p-2 text-left ring-1 transition-[box-shadow,transform] duration-300 ease-calm active:scale-[0.99] disabled:cursor-wait ${chosen ? "ring-2 ring-cover" : "ring-rule hover:ring-ink-soft"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pub(h.file)} alt="" className={`aspect-square w-full rounded-[14px] object-cover ${busy === `hat:${h.id}` ? "breathe" : ""}`} />
                            <span className="block px-2 py-2 font-medium">{h.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </section>
        </div>
      </div>

      {tellOpen && look.wig && (
        <CanYouTell photoUrl={photoUrl} wigUrl={look.wig.url} match={look.wig.match} whose={persona ? `${holder} saved` : "you saved"} onClose={() => setTellOpen(false)} />
      )}
    </main>
  );
}

// The most important moment: two portraits, unlabelled, then the reveal.
function CanYouTell({ photoUrl, wigUrl, match, whose, onClose }: { photoUrl: string; wigUrl: string; match: number; whose: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
    const t = setTimeout(() => setRevealed(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const sentence = `Right is a wig. ${match}% colour match to the hair ${whose}.`;
  const words = sentence.split(" ");
  const label = (text: string, i: number) => (
    <motion.figcaption
      initial={false}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: motionTokens.distance.xs }}
      transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth, delay: i * 0.12 }}
      className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft sm:text-[12px]"
    >
      {text}
    </motion.figcaption>
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="tell-h"
      className="m-auto max-h-[100dvh] w-full max-w-5xl overflow-y-auto bg-paper p-0 text-ink backdrop:backdrop-blur-sm sm:rounded-[20px]"
    >
      <div className="guilloche px-4 py-8 sm:px-10 sm:py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="tell-h" className="font-display text-4xl tracking-[-0.01em] sm:text-5xl">
              Can you tell?
            </h2>
            {/* the two quiet seconds, measured by a hairline */}
            <span aria-hidden className="mt-4 block h-px w-28 overflow-hidden bg-rule">
              <span className="measure block h-full bg-cover" />
            </span>
          </div>
          <Button variant="quiet" onClick={() => ref.current?.close()}>Close</Button>
        </div>

        {/* Width capped by viewport height so title, portraits and the reveal line share one screen. */}
        <div className="mx-auto mt-8 grid max-w-[max(18rem,calc((100dvh-21rem)*1.45))] grid-cols-2 gap-3 sm:gap-8">
          {[photoUrl, wigUrl].map((src, i) => (
            <figure key={src} className="develop" style={{ animationDelay: `${i * 180}ms` }}>
              <div
                className={`rounded-[20px] bg-surface p-1.5 shadow-[var(--shadow)] ring-1 transition-[box-shadow] duration-[900ms] ease-calm sm:p-2.5 ${revealed && i ? "ring-2 ring-cover" : "ring-rule/70"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={revealed ? (i ? "Wearing the matched wig" : "Original photo, before treatment") : "Portrait"} className="aspect-[3/4] w-full rounded-[14px] object-cover" />
              </div>
              {label(i ? "Wig" : "Own hair, saved before", i)}
            </figure>
          ))}
        </div>

        <p aria-live="polite" className="sr-only">
          {revealed ? sentence : ""}
        </p>
        {/* Visual reveal: the line arrives word by word, the match counts up. */}
        <motion.p
          aria-hidden
          initial="hidden"
          animate={revealed ? "visible" : "hidden"}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
          className="mx-auto mt-10 min-h-[2.6em] max-w-[30ch] text-balance text-center font-display text-2xl leading-snug sm:text-[34px]"
        >
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block whitespace-pre"
              variants={{
                hidden: { opacity: 0, y: motionTokens.distance.sm, filter: "blur(4px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth } },
              }}
            >
              {w === `${match}%` ? (
                <span className="text-cover">
                  <CountUp to={match} start={revealed} />%
                </span>
              ) : (
                w
              )}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          ))}
        </motion.p>
      </div>
    </dialog>
  );
}
