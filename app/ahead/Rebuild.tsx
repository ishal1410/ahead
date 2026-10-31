"use client";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { HatRef, WigRef } from "@/lib/catalog";
import { rankByColour } from "@/lib/color";
import { browLabel, browTone, shadeFamily, wigShade, type Passport } from "@/lib/passport";
import { StaleError, browRefreshSource, liveLook, type Look } from "@/lib/render";
import { Button, Frame, PersonaNote, Photo, Swatch, ViewToggle } from "./ui";
import { AnimatePresence, motion } from "motion/react";
import { CountUp, motionTokens, springs, staggerChild, staggerParent } from "./motion";

const panelMotion = {
  initial: { opacity: 0, y: motionTokens.distance.sm },
  animate: { opacity: 1, y: 0, transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth } },
  exit: { opacity: 0, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } },
};

export type { Look };
export interface Rendered { url: string; onWig: boolean; expiresAt?: number }
type RenderFn = (feature: "wig" | "hat" | "brow" | "color", opts: { refId?: string; onUrl?: string; wigId?: string; dyed?: boolean }) => Promise<Rendered>;

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
  setLook: Dispatch<SetStateAction<Look>>;
  render: RenderFn;
  onCard: () => void;
}) {
  const [tab, setTab] = useState<Tab>("brows");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [tellOpen, setTellOpen] = useState(false);
  const [closeUp, setCloseUp] = useState(true);
  const [stageFailed, setStageFailed] = useState<string>();
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ brows: null, wigs: null, headwear: null });
  const stageRef = useRef<HTMLDivElement>(null);
  const ranked = rankByColour(wigs, passport.hairHex);
  const demo = !!persona;

  // Signed result URLs expire; an expired one is never shown or chained, it is refreshed.
  const { wig, brow, hat, expired } = liveLook(look);
  // Maya's demo speaks about her, never as "you".
  const whose = persona ? `${persona}'s` : "your";
  const Whose = persona ? `${persona}'s` : "Your";
  const her = persona ? "her" : "your";
  const browsOnWig = !!(brow?.wigId && wig);
  const wigLabel = (id: string) => wigs.find((w) => w.id === id)?.label ?? "Wig";

  const showBrowCrop = tab === "brows" && !!brow && closeUp;
  const stage =
    tab === "brows" ? brow?.url ?? wig?.url ?? photoUrl : tab === "wigs" ? wig?.url ?? photoUrl : hat?.url ?? wig?.url ?? photoUrl;
  const stageCaption =
    tab === "brows" && brow
      ? `${Whose} saved brows, ${browLabel(passport.brow.preset).toLowerCase()}, drawn ${browsOnWig ? `with the ${wigLabel(brow.wigId!).toLowerCase()}` : `on ${her} photo`}`
      : tab === "headwear" && hat
        ? `${hats.find((h) => h.id === hat.id)?.label ?? "Headwear"}${hat.onWig ? ", over your wig" : ""}`
        : wig?.dyed && tab !== "brows"
          ? `${wigLabel(wig.id)}, recoloured to the ${shadeFamily(passport.hairHex).toLowerCase()} ring shade ${persona ? "she" : "you"} saved`
        : wig && tab !== "brows"
          ? `${wigLabel(wig.id)}, ${wig.match === 100 ? "the same colour-ring shade as" : `${wig.match}% colour-ring match to`} the hair ${persona ? "she" : "you"} saved`
          : tab === "brows" && wig
            ? `${wigLabel(wig.id)}, brows not drawn on it yet`
            : `${Whose} baseline photo`;

  // On narrow screens the stage sits above the list: bring it into view when a render starts and lands.
  function revealStage() {
    const el = stageRef.current;
    if (!el || window.matchMedia("(min-width: 1024px)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    // After the pending state has laid out: a scroll started in the same frame is cancelled by scroll anchoring.
    requestAnimationFrame(() => requestAnimationFrame(revealStage));
    try {
      await fn();
      requestAnimationFrame(revealStage);
    } catch (e) {
      if (e instanceof StaleError) return; // a newer session owns the screen
      setError(e instanceof Error ? e.message : "That try-on didn't finish. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  // Hair Color API on a wig render: the same wig, in the saved ring shade.
  async function dyed(w: NonNullable<Look["wig"]>, undyedUrl: string): Promise<NonNullable<Look["wig"]>> {
    const r = await render("color", { onUrl: undyedUrl, wigId: w.id });
    return { ...w, url: r.url, dyed: true, expiresAt: r.expiresAt };
  }

  // Re-render the chosen wig when its URL has expired, so brows chain onto a live image.
  async function freshWig(): Promise<Look["wig"]> {
    if (!look.wig) return undefined;
    if (wig) return wig;
    const r = await render("wig", { refId: look.wig.id });
    let next: NonNullable<Look["wig"]> = { ...look.wig, url: r.url, expiresAt: r.expiresAt };
    if (look.wig.dyed) next = await dyed(next, r.url);
    setLook((l) => ({ ...l, wig: next }));
    return next;
  }

  async function browsOn(w: Look["wig"]) {
    const r = await render("brow", { onUrl: w?.url, wigId: w?.id, dyed: w?.dyed });
    // Only brows that really sit on the wig render are recorded as on the wig.
    setLook((l) => ({ ...l, brow: { url: r.url, wigId: r.onWig ? w?.id : undefined, expiresAt: r.expiresAt } }));
  }

  const drawBrows = () => run("brow", async () => browsOn(await freshWig()));

  const refresh = () =>
    run("refresh", async () => {
      const w = await freshWig();
      // Brows drawn on the photo stay on the photo; only wig brows are redrawn on the wig.
      if (look.brow) await browsOn(browRefreshSource(look.brow, w));
    });

  const tryWig = (w: WigRef & { match: number }) =>
    run(`wig:${w.id}`, async () => {
      const r = await render("wig", { refId: w.id });
      // A new wig makes brows/hats drawn on the old one stale.
      setLook((l) => ({
        wig: { id: w.id, url: r.url, match: w.match, expiresAt: r.expiresAt },
        brow: l.brow?.wigId ? undefined : l.brow,
        hat: l.hat?.onWig ? undefined : l.hat,
      }));
    });

  const dyeWig = () =>
    run("dye", async () => {
      const w = await freshWig();
      if (!w || w.dyed) return;
      const next = await dyed(w, w.url);
      setLook((l) => ({ ...l, wig: next }));
      // Brows drawn on the undyed wig are redrawn on the recoloured one.
      if (look.brow?.wigId) await browsOn(next);
    });

  const tryHat = (h: HatRef) =>
    run(`hat:${h.id}`, async () => {
      const onUrl = wig?.url;
      const r = await render("hat", { refId: h.id, onUrl });
      setLook((l) => ({ ...l, hat: { id: h.id, url: r.url, onWig: !!onUrl, expiresAt: r.expiresAt } }));
    });

  function onTabKey(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  }

  const wait = demo ? "Opening the pre-rendered result." : "This takes about half a minute.";
  const status = busy
    ? busy === "brow"
      ? `Drawing the brows. ${wait}`
      : busy === "refresh"
        ? `Refreshing this look. ${wait}`
        : busy === "dye"
          ? `Recolouring the wig to ${whose} saved shade. ${wait}`
        : busy.startsWith("wig")
          ? `Fitting the ${wigLabel(busy.slice(4)).toLowerCase()}. ${wait}`
          : `Trying the headwear on. ${wait}`
    : error ?? "";

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 tabIndex={-1} data-step-heading className="font-display text-4xl leading-tight tracking-[-0.01em] outline-none sm:text-5xl">
            Rebuild {whose} look
          </h1>
          <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-ink-soft">Everything here starts from the passport {persona ? `${holder} saved` : "you saved"}.</p>
          {persona && <div className="mt-2"><PersonaNote name={persona} /></div>}
        </div>
        <Button onClick={onCard}>Make {persona ? whose : "my"} Match Card</Button>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        {/* Shared face stage */}
        <div ref={stageRef} className="scroll-mt-4 lg:sticky lg:top-6 lg:self-start">
          {expired && (
            <div className="mb-3 flex flex-col gap-3 rounded-[20px] bg-tint p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px]">These try-on images have expired. Refresh this look to see it again.</p>
              <Button variant="quiet" onClick={refresh} disabled={!!busy}>Refresh this look</Button>
            </div>
          )}
          <Frame className="p-2">
            <div className={`relative grid overflow-hidden rounded-[14px] bg-tint ${showBrowCrop ? "aspect-[4/3]" : ""}`}>
              {/* Each new render develops over the last one: same frame, no jump. */}
              <AnimatePresence initial={false} mode="sync">
                {stageFailed === stage ? (
                  <motion.div key={`failed-${stage}`} {...panelMotion} className="col-start-1 row-start-1 grid min-h-[320px] place-items-center p-6 text-center text-[14px] text-ink-soft">
                    This image didn&apos;t load. Try the look again.
                  </motion.div>
                ) : showBrowCrop ? (
                  <motion.div key={`crop-${stage}`} {...panelMotion} className="col-start-1 row-start-1 size-full overflow-hidden">
                    {/* Gentler zoom than the small tiles: the stage is large, so 1.75x would upscale the render past its pixels. */}
                    <Photo src={stage} alt={`${stageCaption}, close-up of the brows`} closeUp zoom={1.35} onFail={() => setStageFailed(stage)} />
                  </motion.div>
                ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <motion.img
                  key={stage}
                  src={stage}
                  alt={stageCaption}
                  onError={() => setStageFailed(stage)}
                  className="col-start-1 row-start-1 mx-auto block max-h-[620px] w-auto max-w-full"
                  initial={{ opacity: 0, scale: 1.015, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: motionTokens.duration.crawl, ease: motionTokens.easing.smooth } }}
                  exit={{ opacity: 0, transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth } }}
                />
                )}
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
                      {demo ? "Opening" : "Rendering"}
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
          {tab === "brows" && brow && (
            <div className="mt-3">
              <ViewToggle label="Stage view" closeUp={closeUp} onChange={setCloseUp} />
            </div>
          )}
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
                <h2 className="font-display text-3xl tracking-[-0.01em]">{Whose} brows, from {her} passport</h2>
                <p className="mt-3 max-w-[50ch] leading-relaxed text-ink-soft">
                  {Whose} saved shape and colour, drawn on {her} face. This is the guide {persona ? "she" : "you"} or a brow artist can redraw from.
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
                    <dt className="text-[13px] text-ink-soft">Colour</dt>
                    <dd className="mt-1"><Swatch hex={passport.brow.hex} label={browTone(passport.brow.hex)} size="sm" /></dd>
                  </div>
                </dl>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button onClick={drawBrows} disabled={!!busy}>
                    {brow && (browsOnWig || !wig) ? "Draw them again" : wig ? "Draw my brows on this wig" : "Draw my brows"}
                  </Button>
                  <span className="text-[14px] text-ink-soft">
                    {browsOnWig
                      ? `Drawn with the wig ${persona ? "she" : "you"} chose.`
                      : !wig
                        ? "Choose a wig first to see them together."
                        : brow
                          ? `Shown on ${her} photo, drawn before this wig was chosen. Draw them again to see them with the wig.`
                          : `They will be drawn on the wig ${persona ? "she" : "you"} chose.`}
                  </span>
                </div>
              </motion.div>
            )}

            {tab === "wigs" && (
              <motion.div key="wigs" {...panelMotion}>
                <h2 className="font-display text-3xl tracking-[-0.01em]">Closest to {whose} hair first</h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-ink-soft">
                  <Swatch hex={passport.hairHex} label={`Saved: ${shadeFamily(passport.hairHex)}, ${lengthName[passport.hairLength].toLowerCase()}`} size="sm" />
                </div>
                <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-ink-soft">
                  Wig shades are Ahead&apos;s colour-ring codes, set by eye from each product photo. The % is an approximate distance on the ring, not a measurement.
                </p>

                {wig && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {wig.dyed ? (
                      <span className="rounded-full bg-tint px-3 py-1.5 text-[13px] text-cover">In {whose} saved shade</span>
                    ) : (
                      <Button onClick={dyeWig} disabled={!!busy}>See it in {whose} saved shade</Button>
                    )}
                    <Button variant="quiet" onClick={() => setTellOpen(true)}>Can you tell?</Button>
                  </div>
                )}
                {wig && !wig.dyed && (
                  <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-ink-soft">
                    Most wigs are sold in several shades. This recolours the same style to {her} saved ring shade.
                  </p>
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
                      const chosen = wig?.id === w.id;
                      const loading = busy === `wig:${w.id}`;
                      return (
                        <motion.li key={w.id} variants={staggerChild} className="h-full">
                          <button
                            type="button"
                            onClick={() => tryWig(w)}
                            disabled={!!busy}
                            aria-pressed={chosen}
                            aria-busy={loading}
                            className={`press group relative flex h-full w-full cursor-pointer gap-4 rounded-[20px] bg-surface p-2 text-left ring-1 transition-opacity disabled:cursor-wait ${chosen || loading ? "shadow-[var(--shadow)] ring-2 ring-cover" : "ring-rule hover:shadow-[var(--shadow)] hover:ring-ink-soft/50"} ${busy && !loading ? "opacity-60" : ""}`}
                          >
                            <span className={`block aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-[14px] bg-tint ${loading ? "shimmer" : ""}`}>
                              <Photo src={pub(w.file)} alt="" className="group-hover:scale-[1.04]" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1 pr-2">
                              <span>
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-medium leading-snug">{w.label}</span>
                                  {loading ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2 py-0.5 text-[12px] text-cover">
                                      <span aria-hidden className="breathe size-1.5 rounded-full bg-cover" />
                                      {demo ? "Opening" : "Fitting to your photo"}
                                    </span>
                                  ) : (
                                    chosen && (
                                      <motion.span layoutId="wig-chosen" transition={springs.settle} className="rounded-full bg-tint px-2 py-0.5 text-[12px] text-cover">
                                        On {demo ? "her" : "your"} photo
                                      </motion.span>
                                    )
                                  )}
                                </span>
                                <span className="mt-1 block text-[14px] text-ink-soft">
                                  {wigShade(w)}, {lengthName[w.length].toLowerCase()}
                                  {w.length === passport.hairLength && ", your length"}
                                </span>
                              </span>
                              <span className="block">
                                <span className="flex items-baseline gap-1.5">
                                  {/* 100 means the same colour-ring shade, not a pixel-perfect match: say so. */}
                                  <span className="font-display text-3xl leading-none">{w.match === 100 ? "Same" : `${w.match}%`}</span>
                                  <span className="text-[13px] text-ink-soft">{w.match === 100 ? "ring shade" : "approx. match"}</span>
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
                  {wig ? "Tried on over the wig you chose, so you see the full look." : "Tried on your photo. Choose a wig first to see them together."}
                </p>
                {hats.length === 0 ? (
                  <div className="mt-8 rounded-[20px] border border-dashed border-rule p-8">
                    <p className="font-display text-2xl">Hats are on their way</p>
                    <p className="mt-2 max-w-[44ch] leading-relaxed text-ink-soft">Soft hats and caps will appear here, ready to try on with your look.</p>
                  </div>
                ) : (
                  <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {hats.map((h) => {
                      const chosen = hat?.id === h.id;
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

      {tellOpen && wig && (
        <CanYouTell photoUrl={photoUrl} wigUrl={wig.url} match={wig.match} dyed={!!wig.dyed} owner={persona ? `${holder}'s` : "your"} saver={persona ? `${holder} saved` : "you saved"} onClose={() => setTellOpen(false)} />
      )}
    </main>
  );
}

// The most important moment, as a real test: the wig sits on a random side, the
// person guesses, then both portraits are labelled. Nothing gives the answer away
// before the guess, to the eye or to a screen reader.
const SIDES = ["Left", "Right"] as const;
const coin = () => (Math.random() < 0.5 ? 0 : 1);

function CanYouTell({ photoUrl, wigUrl, match, dyed, owner, saver, onClose }: { photoUrl: string; wigUrl: string; match: number; dyed: boolean; owner: string; saver: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  // The verdict mounts after the hint has faded out, so it takes focus as it mounts.
  const focusVerdict = useCallback((el: HTMLDivElement | null) => el?.focus(), []);
  const [wigSide, setWigSide] = useState(coin);
  const [guess, setGuess] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const revealed = guess !== null;
  const correct = guess === wigSide;

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  // Focus follows the moment: the choices while guessing, the verdict once revealed.
  useEffect(() => {
    if (!revealed) firstChoice.current?.focus({ preventScroll: true });
  }, [revealed, round]);

  function again() {
    setWigSide(coin());
    setGuess(null);
    setRound((r) => r + 1);
  }

  const sentence = `The ${SIDES[wigSide].toLowerCase()} one is the wig. ${dyed ? "Recoloured to the ring shade of" : match === 100 ? "Same colour-ring shade as" : `${match}% colour-ring match to`} the hair ${saver}.`;
  const verdict = correct ? "You spotted it." : "You couldn't tell.";
  const words = sentence.split(" ");
  const portraits = [0, 1].map((i) => ({ src: i === wigSide ? wigUrl : photoUrl, isWig: i === wigSide }));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="tell-h"
      aria-describedby="tell-q"
      className="m-auto max-h-[100dvh] w-full max-w-5xl overflow-y-auto bg-paper p-0 text-ink backdrop:backdrop-blur-sm sm:rounded-[20px]"
    >
      <div className="guilloche px-4 py-8 sm:px-10 sm:py-12">
        <div className="flex items-start justify-between gap-4">
          <h2 id="tell-h" className="font-display text-4xl tracking-[-0.01em] sm:text-5xl">
            Can you tell?
          </h2>
          <Button variant="quiet" onClick={() => ref.current?.close()}>Close</Button>
        </div>
        <p id="tell-q" className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft sm:text-lg">
          One is {owner} own hair, saved before treatment. One is a wig. <span className="text-ink">Which one is the wig?</span>
        </p>

        {/* Width capped by viewport height so the question, portraits and the reveal share one screen. */}
        <div role="group" aria-label="Which one is the wig?" className="mx-auto mt-6 grid max-w-[max(18rem,calc((100dvh-30rem)*1.45))] grid-cols-2 gap-3 sm:mt-8 sm:gap-8">
          {portraits.map(({ src, isWig }, i) => {
            const mine = guess === i;
            return (
              <figure key={`${round}-${i}`} className="develop m-0" style={{ animationDelay: `${i * 180}ms` }}>
                <motion.button
                  ref={i === 0 ? firstChoice : undefined}
                  type="button"
                  data-choice={i}
                  onClick={() => !revealed && setGuess(i)}
                  aria-disabled={revealed}
                  aria-label={
                    revealed
                      ? `${SIDES[i]}: ${isWig ? "the wig" : `${owner} own hair, saved before treatment`}${mine ? ", your guess" : ""}`
                      : `${SIDES[i]} portrait: this one is the wig`
                  }
                  whileHover={revealed ? undefined : { y: -motionTokens.distance.xs }}
                  whileTap={revealed ? undefined : { scale: 0.985 }}
                  transition={springs.snappy}
                  className={`relative block w-full rounded-[20px] bg-surface p-1.5 text-left shadow-[var(--shadow)] ring-1 transition-[box-shadow] duration-[900ms] ease-calm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cover sm:p-2.5 ${revealed ? "cursor-default" : "cursor-pointer hover:ring-ink-soft/50"} ${revealed && isWig ? "ring-2 ring-cover" : "ring-rule/70"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-[3/4] w-full rounded-[14px] object-cover" />
                  <AnimatePresence>
                    {mine && (
                      <motion.span
                        key="guess"
                        aria-hidden
                        initial={{ opacity: 0, y: motionTokens.distance.xs }}
                        animate={{ opacity: 1, y: 0, transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth } }}
                        exit={{ opacity: 0, transition: { duration: motionTokens.duration.fast } }}
                        className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[12px] text-ink shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:text-[13px]"
                      >
                        Your guess
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                {/* Before the guess: only the side. After: what each one is. */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.figcaption
                    key={revealed ? "answer" : "side"}
                    aria-hidden
                    initial={{ opacity: 0, y: motionTokens.distance.xs }}
                    animate={{ opacity: 1, y: 0, transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth, delay: revealed ? i * 0.12 : 0 } }}
                    exit={{ opacity: 0, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                    className={`mt-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] sm:text-[12px] ${revealed && isWig ? "text-cover" : "text-ink-soft"}`}
                  >
                    {revealed ? (isWig ? "Wig" : "Own hair, saved before") : SIDES[i]}
                  </motion.figcaption>
                </AnimatePresence>
              </figure>
            );
          })}
        </div>

        <div className="mx-auto mt-6 min-h-[7.5rem] max-w-[40ch] text-center sm:mt-8">
          <AnimatePresence mode="wait" initial={false}>
            {revealed ? (
              <motion.div
                key={`verdict-${round}`}
                ref={focusVerdict}
                tabIndex={-1}
                data-verdict
                className="outline-none focus:outline-none focus-visible:outline-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth } }}
                exit={{ opacity: 0, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              >
                <span className="sr-only">{`${verdict} ${sentence}`}</span>
                <p aria-hidden className="font-mono text-[12px] uppercase tracking-[0.16em] text-cover">{verdict}</p>
                {/* The line arrives word by word; the match counts up. */}
                <motion.p
                  aria-hidden
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
                  className="mt-3 text-balance font-display text-2xl leading-snug sm:text-[34px]"
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
                          <CountUp to={match} />%
                        </span>
                      ) : (
                        w
                      )}
                      {i < words.length - 1 ? " " : ""}
                    </motion.span>
                  ))}
                </motion.p>
                <div className="mt-6 flex justify-center">
                  <Button variant="quiet" onClick={again}>Shuffle and try again</Button>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                className="text-[14px] text-ink-soft"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: motionTokens.duration.normal } }}
                exit={{ opacity: 0, transition: { duration: motionTokens.duration.fast } }}
              >
                Tap the portrait you think is the wig. Look at the hairline and the parting.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </dialog>
  );
}
