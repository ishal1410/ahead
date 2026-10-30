"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HATS, WIGS } from "@/lib/catalog";
import { STORAGE_KEY, draftFromPassport, parsePassport, type BrowPresetId, type Draft, type Passport } from "@/lib/passport";
import {
  CappedError, RenderError, StaleError, createRenderCache, demoBrowOnWig, loadManifest, renderDemo, renderFromPhoto, renderLive, uploadPhoto,
  type DemoManifest, type Feature,
} from "@/lib/render";
import { dataUrlToBlob, downloadText, loadImage, toJpegBlob, toJpegDataUrl } from "@/lib/browser";
import { Landing } from "./Landing";
import { Capture } from "./Capture";
import { PassportStep } from "./PassportStep";
import { Rebuild, type Look, type Rendered } from "./Rebuild";
import { MatchCard } from "./MatchCard";
import { Button } from "./ui";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { motionTokens } from "./motion";

type Step = "landing" | "capture" | "passport" | "rebuild" | "card";
const STEPS: Step[] = ["landing", "capture", "passport", "rebuild", "card"];
interface Session {
  mode: "live" | "demo";
  photoUrl: string;
}
export interface RenderOpts {
  refId?: string;
  onUrl?: string;
  wigId?: string;
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

  // Saved passport (client only), the step in the URL, and the demo manifest for the landing specimen.
  useEffect(() => {
    let p: Passport | null = null;
    try {
      p = parsePassport(localStorage.getItem(STORAGE_KEY));
      setSaved(p);
    } catch {
      /* storage blocked: the app still works, it just can't remember */
    }
    const want = stepFromUrl();
    if (p && (want === "passport" || want === "rebuild" || want === "card")) restoreSaved(p, want, "replace");
    else go(want === "capture" ? "capture" : "landing", "replace");
    loadManifest().then(setManifest);
  }, [go, restoreSaved]);

  // Back / Forward: follow the URL when the state allows it, otherwise land gracefully.
  useEffect(() => {
    function onPop() {
      const want = stepFromUrl();
      const { session: s, passport: p, saved: sv } = live.current;
      if (want === "landing" || want === "capture" || (s && (want === "passport" || p))) return go(want, "replace");
      if (sv) return restoreSaved(sv, want, "replace");
      go("landing", "replace");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [go, restoreSaved]);

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
      const onWig = feature === "brow" && (demo ? !!demoBrowOnWig(demo, opts.wigId) : !!opts.onUrl);
      // The source is part of the key: brows on a wig render never reuse brows on the photo.
      const source = demo ? (onWig ? opts.wigId : null) : opts.onUrl ?? null;
      const key = JSON.stringify([s?.mode, s?.photoUrl, feature, opts.refId ?? null, opts.brow ?? null, source]);
      try {
        const { value, expiresAt } = await cache.current.run(key, () => {
          if (demo) return renderDemo(demo, { feature, refId: opts.refId, brow: opts.brow, wigId: opts.wigId });
          const job = { feature, refId: opts.refId, brow: opts.brow };
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

  async function startDemo() {
    setDemoState("loading");
    const m = manifest ?? (await loadManifest());
    if (!m) return setDemoState("missing");
    setManifest(m);
    setDemoState("idle");
    resetSession({ mode: "demo", photoUrl: m.persona.photo });
    setDraftRaw({ hairHex: m.passport.hairHex, browHex: m.passport.brow.hex, hairLength: m.passport.hairLength });
    go("passport");
  }

  async function confirmPhoto(url: string) {
    setUploading(true);
    setUploadError(undefined);
    try {
      const blob = await toJpegBlob(await loadImage(url), 1024);
      const id = await uploadPhoto(blob);
      // A different photo is a new session: the old draft, passport and looks don't belong to it.
      const s = live.current.session;
      if (s?.photoUrl !== url || s.mode !== "live") resetSession({ mode: "live", photoUrl: url });
      photoBlob.current = blob;
      fileId.current = Promise.resolve(id);
      setCaptureNote(undefined);
      go("passport");
    } catch (e) {
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
            <Button onClick={startDemo}>See Maya&apos;s demo</Button>
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
          <Landing onStart={startLive} onDemo={startDemo} demoState={demoState} saved={saved} onOpenSaved={openSaved} specimenPhoto={manifest?.persona.photo} specimen={manifest?.passport} />
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
            onDemo={startDemo}
            onSave={savePassport}
            savedAt={passport?.savedAt}
            onDownload={() => passport && downloadText("look-passport.json", JSON.stringify(passport, null, 2))}
            onContinue={() => go("rebuild")}
          />
        )}
        {step === "rebuild" && session && passport && (
          <Rebuild
            passport={passport}
            photoUrl={session.photoUrl}
            holder={holder}
            persona={persona}
            wigs={wigs}
            hats={hats}
            look={look}
            setLook={setLook}
            render={(feature, opts) => render(feature, feature === "brow" ? { ...opts, brow: passport.brow } : opts)}
            onCard={() => go("card")}
          />
        )}
        {step === "card" && session && passport && (
          <MatchCard passport={passport} photoUrl={session.photoUrl} holder={holder} persona={persona} look={look} wigs={wigs} hats={hats} onBack={() => go("rebuild")} />
        )}
      </motion.div>
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
