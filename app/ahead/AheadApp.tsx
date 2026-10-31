"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HATS, WIGS } from "@/lib/catalog";
import {
  DRAFT_KEY, SESSION_KEY, STORAGE_KEY, draftFromPassport, forgetStored, parseDraftState, parsePassport, parseSessionState, popTarget, resumeTarget,
  type AppStep, type BrowPresetId, type Draft, type Passport, type Resume, type SessionState,
} from "@/lib/passport";
import {
  CappedError, RenderError, StaleError, createRenderCache, demoBrowOnWig, loadManifest, renderDemo, renderFromPhoto, renderLive, uploadPhoto,
  type DemoManifest, type Feature, type Look,
} from "@/lib/render";
import { dataUrlToBlob, downloadText, loadImage, toJpegBlob, toJpegDataUrl } from "@/lib/browser";
import { Landing, LegalLinks } from "./Landing";
import { Capture } from "./Capture";
import { PassportStep } from "./PassportStep";
import { Rebuild, type Rendered } from "./Rebuild";
import { MatchCard } from "./MatchCard";
import { Button } from "./ui";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { motionTokens } from "./motion";

type Step = AppStep;
const STEPS: Step[] = ["landing", "capture", "passport", "rebuild", "card"];
interface Session {
  mode: "live" | "demo";
  photoUrl: string;
}
export interface RenderOpts {
  refId?: string;
  onUrl?: string;
  wigId?: string;
  dyed?: boolean; // the wig render was recoloured (demo picks the matching brow render)
  hex?: string; // hair colour: the saved ring shade
  brow?: { preset: BrowPresetId; hex: string; thickness?: number; intensity?: number };
}

const FLOW: { id: Step; label: string }[] = [
  { id: "capture", label: "Photo" },
  { id: "passport", label: "Passport" },
  { id: "rebuild", label: "Rebuild" },
  { id: "card", label: "Match Card" },
];

// The step lives in the URL (?step=rebuild) so Back and refresh behave.
function stepFromUrl(): Step {
  const s = new URLSearchParams(window.location.search).get("step") as Step | null;
  return s && STEPS.includes(s) ? s : "landing";
}
const urlFor = (s: Step) => window.location.pathname + (s === "landing" ? "" : `?step=${s}`);

export function AheadApp() {
  const [step, setStepRaw] = useState<Step>("landing");
  const [session, setSession] = useState<Session | null>(null);
  const [manifest, setManifest] = useState<DemoManifest | null>(null);
  const [demoState, setDemoState] = useState<"idle" | "loading" | "missing">("idle");
  const [saved, setSaved] = useState<Passport | null>(null);
  const [draft, setDraftRaw] = useState<Draft>({});
  const [passport, setPassport] = useState<Passport | null>(null);
  const [look, setLook] = useState<Look>({});
  const [capped, setCapped] = useState<string>();
  const [photoLost, setPhotoLost] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [captureNote, setCaptureNote] = useState<string>();
  // One cache per page load; reset() on every new session turns in-flight results stale (epoch guard).
  const cache = useRef(createRenderCache<string>());
  const fileId = useRef<Promise<string> | null>(null);
  const photoBlob = useRef<Blob | null>(null);
  // The photo at 512px as a data URL, so an unsaved draft survives a reload (sessionStorage).
  const draftPhoto = useRef<string | null>(null);
  // Latest values for async callbacks and listeners (never a stale closure).
  const live = useRef({ session, step, saved, passport });
  live.current = { session, step, saved, passport };

  const go = useCallback((s: Step, mode: "push" | "replace" = "push") => {
    if (mode === "replace") window.history.replaceState(null, "", urlFor(s));
    else if (s !== live.current.step) window.history.pushState(null, "", urlFor(s));
    live.current.step = s;
    setStepRaw(s);
  }, []);

  // Every new session (demo, new photo, saved passport) starts from nothing.
  const resetSession = useCallback((next: Session | null) => {
    cache.current.reset();
    fileId.current = null;
    photoBlob.current = null;
    draftPhoto.current = null;
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* storage blocked */
    }
    live.current.session = next;
    setSession(next);
    setDraftRaw({});
    setPassport(null);
    setLook({});
    setCapped(undefined);
    setPhotoLost(false);
  }, []);

  const restoreSaved = useCallback(
    (p: Passport, to: Step, mode: "push" | "replace") => {
      resetSession({ mode: "live", photoUrl: p.photoDataUrl });
      setDraftRaw(draftFromPassport(p));
      setPassport(p);
      live.current.passport = p;
      go(to, mode);
    },
    [go, resetSession],
  );

  // Which session this tab is in (demo or saved), so refresh and Back/Forward stay in it.
  const hydrated = useRef(false);
  const follow = useRef<(r: Resume, stored?: SessionState<Look> | null) => void>(() => {});
  follow.current = (r, stored) => {
    if (r.to === "go") return go(r.step, "replace");
    if (r.to === "demo") return void startDemo(r.step, stored?.passport, stored?.look, "replace");
    const sv = live.current.saved;
    if (!sv) return go("landing", "replace");
    restoreSaved(sv, r.step, "replace");
    if (r.restoreLook && stored?.look) setLook(stored.look);
  };

  // Saved passport (client only), the step in the URL, and the demo manifest for the landing specimen.
  useEffect(() => {
    let p: Passport | null = null;
    let stored: SessionState<Look> | null = null;
    let unsaved = null;
    try {
      unsaved = parseDraftState(sessionStorage.getItem(DRAFT_KEY));
      p = parsePassport(localStorage.getItem(STORAGE_KEY));
      setSaved(p);
      live.current.saved = p;
      stored = parseSessionState<Look>(sessionStorage.getItem(SESSION_KEY));
    } catch {
      /* storage blocked: the app still works, it just can't remember */
    }
    if (unsaved && stepFromUrl() === "passport") {
      // A refresh before saving: bring back the photo, taps and ring choice.
      resetSession({ mode: "live", photoUrl: unsaved.photoDataUrl });
      setDraftRaw(unsaved.draft);
      go("passport", "replace");
    } else follow.current(resumeTarget(stepFromUrl(), stored, p), stored);
    hydrated.current = true;
    loadManifest().then((m) => m && setManifest((cur) => cur ?? m));
  }, []);

  // Back / Forward: follow the URL inside the current session; only with no session use the saved one.
  useEffect(() => {
    function onPop() {
      const { session: s, passport: p, saved: sv } = live.current;
      follow.current(popTarget(stepFromUrl(), !!s, !!p, !!sv));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Remember the session (and the looks tried on) for this tab, so a reload restores it.
  useEffect(() => {
    if (!hydrated.current) return;
    let state: SessionState<Look> | null = null;
    if (session?.mode === "demo") state = { kind: "demo", passport: passport ?? undefined, look };
    else if (session && passport && saved?.savedAt === passport.savedAt) state = { kind: "saved", savedAt: passport.savedAt, look };
    try {
      if (state) sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
      else if (session) sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage blocked: a reload starts over */
    }
  }, [session, passport, saved, look]);

  // Keep the unsaved live draft for this tab; a saved passport needs no draft copy.
  useEffect(() => {
    if (!hydrated.current || session?.mode !== "live") return;
    const isSaved = !!passport && saved?.savedAt === passport.savedAt;
    const photo = session.photoUrl.startsWith("data:") ? session.photoUrl : draftPhoto.current;
    try {
      if (isSaved || !photo) sessionStorage.removeItem(DRAFT_KEY);
      else sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ photoDataUrl: photo, draft }));
    } catch {
      /* storage full or blocked: a reload starts over */
    }
  }, [session, draft, passport, saved]);

  // Runs when the next screen mounts (after the old one has faded out): start it at
  // the top and move focus to its heading so screen readers hear the change.
  const firstScreen = useRef(true);
  const onScreenMount = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    if (firstScreen.current) return void (firstScreen.current = false);
    window.scrollTo({ top: 0 });
    el.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  }, []);

  const demo = session?.mode === "demo" ? manifest : null;
  const holder = demo ? demo.persona.name : "You";
  const persona = demo ? demo.persona.name : undefined;
  const wigs = WIGS.length ? WIGS : demo?.wigs ?? [];
  const hats = HATS.length ? HATS : demo?.hats ?? [];

  const setDraft = (d: Draft) => {
    setDraftRaw(d);
    setPassport(null); // any edit un-saves the page until saved again
  };

  // The selfie is uploaded once per session; fresh=true uploads it again (the server lost it).
  const ensureFileId = useCallback((fresh: boolean): Promise<string> => {
    const s = live.current.session;
    if (!s) return Promise.reject(new RenderError("Add a photo first.", "source"));
    if (fresh) fileId.current = null;
    fileId.current ??= (async () => {
      const blob = photoBlob.current ?? (s.photoUrl.startsWith("data:") ? await dataUrlToBlob(s.photoUrl) : await toJpegBlob(await loadImage(s.photoUrl), 1024));
      return uploadPhoto(blob);
    })().catch((e) => {
      fileId.current = null;
      throw e;
    });
    return fileId.current;
  }, []);

  // One entry point for every try-on. Same inputs never spend twice, even while in flight.
  const render = useCallback(
    async (feature: Feature, opts: RenderOpts): Promise<Rendered> => {
      const s = live.current.session;
      const onWig = feature === "brow" && (demo ? !!demoBrowOnWig(demo, opts.wigId, opts.dyed) : !!opts.onUrl);
      // The source is part of the key: brows on a wig render never reuse brows on the photo.
      const source = demo ? (onWig || feature === "color" ? [opts.wigId, !!opts.dyed] : null) : opts.onUrl ?? null;
      const key = JSON.stringify([s?.mode, s?.photoUrl, feature, opts.refId ?? null, opts.brow ?? null, opts.hex ?? null, source]);
      try {
        const { value, expiresAt } = await cache.current.run(key, () => {
          if (demo) return renderDemo(demo, { feature, refId: opts.refId, brow: opts.brow, wigId: opts.wigId, dyed: opts.dyed });
          const job = { feature, refId: opts.refId, brow: opts.brow, hex: opts.hex };
          return opts.onUrl ? renderLive({ ...job, src: { url: opts.onUrl } }) : renderFromPhoto(job, ensureFileId);
        });
        return { url: value, onWig, expiresAt: demo ? undefined : expiresAt };
      } catch (e) {
        if (e instanceof StaleError) throw e;
        if (e instanceof CappedError) setCapped(e.message);
        else if (e instanceof RenderError && e.kind === "source" && !opts.onUrl) setPhotoLost(true);
        else if (e instanceof RenderError && e.kind === "face" && live.current.step !== "capture") {
          // No usable face in the photo: back to Capture with the specific guidance.
          setCaptureNote(e.message);
          go("capture");
        }
        throw e;
      }
    },
    [demo, ensureFileId, go],
  );

  function startLive() {
    resetSession(null);
    setCaptureNote(undefined);
    go("capture");
  }

  // Also restores a demo after a reload (to, p, l come from this tab's session record).
  async function startDemo(to: Step = "passport", p?: Passport, l?: Look, mode: "push" | "replace" = "push") {
    setDemoState("loading");
    const m = manifest ?? (await loadManifest());
    if (!m) {
      setDemoState("missing");
      if (mode === "replace") go("landing", "replace");
      return;
    }
    setManifest(m);
    setDemoState("idle");
    resetSession({ mode: "demo", photoUrl: m.persona.photo });
    if (p) {
      setDraftRaw(draftFromPassport(p));
      setPassport(p);
      live.current.passport = p;
      if (l) setLook(l);
    } else setDraftRaw({ hairHex: m.passport.hairHex, browHex: m.passport.brow.hex, hairLength: m.passport.hairLength });
    go(p ? to : "passport", mode);
  }

  async function confirmPhoto(url: string) {
    setUploading(true);
    setUploadError(undefined);
    try {
      const img = await loadImage(url);
      const blob = await toJpegBlob(img, 1024);
      // A demo or new session started while uploading owns the screen now: drop this result.
      const id = await cache.current.guard(uploadPhoto(blob));
      if (live.current.step !== "capture") return;
      // A different photo is a new session: the old draft, passport and looks don't belong to it.
      const s = live.current.session;
      if (s?.photoUrl !== url || s.mode !== "live") resetSession({ mode: "live", photoUrl: url });
      photoBlob.current = blob;
      draftPhoto.current = toJpegDataUrl(img, 512);
      fileId.current = Promise.resolve(id);
      setCaptureNote(undefined);
      go("passport");
    } catch (e) {
      if (e instanceof StaleError) return;
      if (e instanceof CappedError) setCapped(e.message); // live paused: offer Maya's demo
      setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function savePassport(img: HTMLImageElement) {
    if (!draft.hairHex || !draft.browHex || !draft.hairLength || !draft.browPreset) return;
    const p: Passport = {
      version: 1,
      savedAt: new Date().toISOString(),
      hairHex: draft.hairHex,
      hairLength: draft.hairLength,
      brow: { preset: draft.browPreset, hex: draft.browHex, thickness: 0, intensity: 80 },
      photoDataUrl: toJpegDataUrl(img, 512),
      ...(draft.hairAt && { hairAt: draft.hairAt }),
      ...(draft.browAt && { browAt: draft.browAt }),
    };
    setPassport(p);
    if (!demo) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        setSaved(p);
      } catch {
        /* storage full or blocked: the download still works */
      }
    }
  }

  function deletePassport() {
    if (!window.confirm("Delete the Look Passport saved in this browser, including its photo? This can't be undone.")) return;
    try {
      forgetStored(localStorage, sessionStorage);
    } catch {
      /* storage blocked: nothing was stored */
    }
    setSaved(null);
    live.current.saved = null;
    resetSession(null);
    go("landing");
  }

  function openSaved() {
    if (saved) restoreSaved(saved, "rebuild", "push");
  }

  const stepIndex = FLOW.findIndex((f) => f.id === step);

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>

      <header className="no-print mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-8">
        <button type="button" onClick={() => go("landing")} className="cursor-pointer font-display text-2xl tracking-[-0.01em]">
          Ahead
        </button>
        {step !== "landing" && (
          <nav aria-label="Progress">
            <ol className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
              {FLOW.map((f, i) => {
                if (demo && f.id === "capture") return null;
                const reachable = i <= stepIndex || (f.id === "rebuild" && !!passport) || (f.id === "card" && !!passport);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      disabled={!reachable || (f.id !== "capture" && !session)}
                      aria-current={f.id === step ? "step" : undefined}
                      onClick={() => go(f.id)}
                      className={`relative cursor-pointer py-2 transition-colors duration-300 ease-calm disabled:cursor-default ${f.id === step ? "text-ink" : reachable ? "text-ink-soft hover:text-ink" : "text-ink-soft/50"}`}
                    >
                      {f.label}
                      {f.id === step && (
                        <motion.span aria-hidden layoutId="progress-mark" className="absolute inset-x-0 bottom-1 h-0.5 rounded-full bg-cover" transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </header>

      {demo && step !== "landing" && (
        <p className="no-print mx-auto mt-4 w-full max-w-6xl px-4 text-[14px] text-ink-soft sm:px-8">
          <span className="rounded-full bg-tint px-3 py-1.5 text-ink">Pre-rendered demo · no live API calls</span>
        </p>
      )}

      {photoLost && !capped && step !== "capture" && (
        <div role="alert" className="no-print mx-auto mt-4 flex w-full max-w-6xl flex-col gap-3 px-4 sm:px-8">
          <div className="flex flex-col gap-3 rounded-[20px] bg-tint p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px]">We lost the connection to your photo. Tap to upload it again.</p>
            <Button onClick={startLive}>Upload my photo again</Button>
          </div>
        </div>
      )}

      {capped && (
        <div role="alert" className="no-print mx-auto mt-4 flex w-full max-w-6xl flex-col gap-3 px-4 sm:px-8">
          <div className="flex flex-col gap-3 rounded-[20px] bg-tint p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px]">{capped}</p>
            <Button onClick={() => startDemo()}>See Maya&apos;s demo</Button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        ref={onScreenMount}
        className="flex-1"
        initial={{ opacity: 0, y: motionTokens.distance.sm }}
        animate={{ opacity: 1, y: 0, transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth } }}
        exit={{ opacity: 0, y: -motionTokens.distance.xs, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      >
        {step === "landing" && (
          <Landing onStart={startLive} onDemo={() => startDemo()} demoState={demoState} saved={saved} onOpenSaved={openSaved} onDelete={deletePassport} specimenPhoto={manifest?.persona.photo} specimen={manifest?.passport} />
        )}
        {step === "capture" && <Capture onConfirm={confirmPhoto} busy={uploading} error={uploadError} note={captureNote} />}
        {step === "passport" && session && (
          <PassportStep
            key={session.photoUrl}
            photoUrl={session.photoUrl}
            holder={holder}
            persona={persona}
            draft={draft}
            setDraft={setDraft}
            renderBrow={(preset, hex) => render("brow", { brow: { preset, hex, thickness: 0, intensity: 80 } }).then((r) => r.url)}
            onDemo={() => startDemo()}
            onSave={savePassport}
            savedAt={passport?.savedAt}
            stored={!!saved && saved.savedAt === passport?.savedAt}
            onDownload={() => passport && downloadText("look-passport.json", JSON.stringify(passport, null, 2))}
            onContinue={() => go("rebuild")}
          />
        )}
        {step === "rebuild" && session && passport && (
          <Rebuild
            canDye={!demo || passport.hairHex === demo.passport.hairHex}
            passport={passport}
            photoUrl={session.photoUrl}
            holder={holder}
            persona={persona}
            wigs={wigs}
            hats={hats}
            look={look}
            setLook={setLook}
            render={(feature, opts) => render(feature, feature === "brow" ? { ...opts, brow: passport.brow } : feature === "color" ? { ...opts, hex: passport.hairHex } : opts)}
            onCard={() => go("card")}
          />
        )}
        {step === "card" && session && passport && (
          <MatchCard passport={passport} photoUrl={session.photoUrl} holder={holder} persona={persona} look={look} wigs={wigs} hats={hats} onBack={() => go("rebuild")} />
        )}
      </motion.div>
      </AnimatePresence>

      {step !== "landing" && (
        <footer className="no-print mt-16 border-t border-rule">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[14px] text-ink-soft sm:px-8">
            <LegalLinks onDelete={saved ? deletePassport : undefined} />
            <p>Cosmetic planning aid. Not medical advice.</p>
          </div>
        </footer>
      )}
    </div>
    </MotionConfig>
  );
}
