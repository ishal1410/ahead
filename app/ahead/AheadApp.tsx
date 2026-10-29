"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HATS, WIGS } from "@/lib/catalog";
import { STORAGE_KEY, parsePassport, type BrowPresetId, type Passport } from "@/lib/passport";
import { CappedError, loadManifest, renderDemo, renderLive, uploadPhoto, type DemoManifest, type Feature } from "@/lib/render";
import { dataUrlToBlob, downloadText, loadImage, toJpegBlob, toJpegDataUrl } from "@/lib/browser";
import { Landing } from "./Landing";
import { Capture } from "./Capture";
import { PassportStep, type Draft } from "./PassportStep";
import { Rebuild, type Look } from "./Rebuild";
import { MatchCard } from "./MatchCard";
import { Button } from "./ui";

type Step = "landing" | "capture" | "passport" | "rebuild" | "card";
interface Session {
  mode: "live" | "demo";
  photoUrl: string;
  fileId?: string;
}

const FLOW: { id: Step; label: string }[] = [
  { id: "capture", label: "Photo" },
  { id: "passport", label: "Passport" },
  { id: "rebuild", label: "Rebuild" },
  { id: "card", label: "Match Card" },
];

export function AheadApp() {
  const [step, setStep] = useState<Step>("landing");
  const [session, setSession] = useState<Session | null>(null);
  const [manifest, setManifest] = useState<DemoManifest | null>(null);
  const [demoState, setDemoState] = useState<"idle" | "loading" | "missing">("idle");
  const [saved, setSaved] = useState<Passport | null>(null);
  const [draft, setDraftRaw] = useState<Draft>({});
  const [passport, setPassport] = useState<Passport | null>(null);
  const [look, setLook] = useState<Look>({});
  const [capped, setCapped] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const cache = useRef(new Map<string, string>());
  const fileIdPromise = useRef<Promise<string> | null>(null);

  // Saved passport (client only) and the demo manifest for the landing specimen.
  useEffect(() => {
    try {
      setSaved(parsePassport(localStorage.getItem(STORAGE_KEY)));
    } catch {
      /* storage blocked: the app still works, it just can't remember */
    }
    loadManifest().then(setManifest);
  }, []);

  // Move focus to each new screen's heading so screen readers hear the change.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (step !== "landing") document.querySelector<HTMLElement>("[data-step-heading]")?.focus();
  }, [step]);

  const demo = session?.mode === "demo" ? manifest : null;
  const holder = demo ? demo.persona.name : "You";
  const persona = demo ? demo.persona.name : undefined;
  const wigs = WIGS.length ? WIGS : demo?.wigs ?? [];
  const hats = HATS.length ? HATS : demo?.hats ?? [];

  const setDraft = (d: Draft) => {
    setDraftRaw(d);
    setPassport(null); // any edit un-saves the page until saved again
  };

  // The selfie is uploaded once per session; a returning visitor's saved photo is re-uploaded on first use.
  const ensureFileId = useCallback((): Promise<string> => {
    if (!session) return Promise.reject(new Error("Add a photo first."));
    if (session.fileId) return Promise.resolve(session.fileId);
    fileIdPromise.current ??= (async () => {
      const blob = session.photoUrl.startsWith("data:") ? await dataUrlToBlob(session.photoUrl) : await toJpegBlob(await loadImage(session.photoUrl), 1024);
      const id = await uploadPhoto(blob);
      setSession((s) => (s ? { ...s, fileId: id } : s));
      return id;
    })().catch((e) => {
      fileIdPromise.current = null;
      throw e;
    });
    return fileIdPromise.current;
  }, [session]);

  // One entry point for every try-on. Same inputs never spend twice.
  const render = useCallback(
    async (feature: Feature, opts: { refId?: string; onUrl?: string; brow?: { preset: BrowPresetId; hex: string; thickness?: number; intensity?: number } }) => {
      const key = JSON.stringify([session?.mode, session?.photoUrl, feature, opts]);
      const hit = cache.current.get(key);
      if (hit) return hit;
      let url: string;
      if (demo) {
        url = await renderDemo(demo, { feature, refId: opts.refId, brow: opts.brow, onWig: !!opts.onUrl });
      } else {
        const src = opts.onUrl ? { url: opts.onUrl } : { fileId: await ensureFileId() };
        try {
          url = await renderLive({ feature, src, refId: opts.refId, brow: opts.brow });
        } catch (e) {
          if (e instanceof CappedError) setCapped(e.message);
          throw e;
        }
      }
      cache.current.set(key, url);
      return url;
    },
    [demo, session, ensureFileId],
  );

  function startLive() {
    setSession(null);
    setDraftRaw({});
    setPassport(null);
    setLook({});
    fileIdPromise.current = null;
    setStep("capture");
  }

  async function startDemo() {
    setCapped(undefined);
    setDemoState("loading");
    const m = manifest ?? (await loadManifest());
    if (!m) return setDemoState("missing");
    setManifest(m);
    setDemoState("idle");
    setSession({ mode: "demo", photoUrl: m.persona.photo });
    setDraftRaw({ hairHex: m.passport.hairHex, browHex: m.passport.brow.hex, hairLength: m.passport.hairLength });
    setPassport(null);
    setLook({});
    setStep("passport");
  }

  async function confirmPhoto(url: string) {
    setUploading(true);
    setUploadError(undefined);
    try {
      const img = await loadImage(url);
      const fileId = await uploadPhoto(await toJpegBlob(img, 1024));
      setSession({ mode: "live", photoUrl: url, fileId });
      setStep("passport");
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
    if (!saved) return;
    setSession({ mode: "live", photoUrl: saved.photoDataUrl });
    fileIdPromise.current = null;
    setPassport(saved);
    setLook({});
    setStep("rebuild");
  }

  const stepIndex = FLOW.findIndex((f) => f.id === step);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>

      <header className="no-print mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-8">
        <button type="button" onClick={() => setStep("landing")} className="cursor-pointer font-display text-2xl tracking-[-0.01em]">
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
                      onClick={() => setStep(f.id)}
                      className={`cursor-pointer py-2 transition-colors duration-300 ease-calm disabled:cursor-default ${f.id === step ? "text-ink underline decoration-cover decoration-2 underline-offset-[6px]" : reachable ? "text-ink-soft hover:text-ink" : "text-ink-soft/50"}`}
                    >
                      {f.label}
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

      {capped && (
        <div role="alert" className="no-print mx-auto mt-4 flex w-full max-w-6xl flex-col gap-3 px-4 sm:px-8">
          <div className="flex flex-col gap-3 rounded-[20px] bg-tint p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px]">{capped}</p>
            <Button onClick={startDemo}>See Maya&apos;s demo</Button>
          </div>
        </div>
      )}

      <div className="flex-1">
        {step === "landing" && (
          <Landing onStart={startLive} onDemo={startDemo} demoState={demoState} saved={saved} onOpenSaved={openSaved} specimenPhoto={manifest?.persona.photo} />
        )}
        {step === "capture" && <Capture onConfirm={confirmPhoto} busy={uploading} error={uploadError} />}
        {step === "passport" && session && (
          <PassportStep
            key={session.photoUrl}
            photoUrl={session.photoUrl}
            holder={holder}
            persona={persona}
            draft={draft}
            setDraft={setDraft}
            renderBrow={(preset, hex) => render("brow", { brow: { preset, hex, thickness: 0, intensity: 80 } })}
            onSave={savePassport}
            savedAt={passport?.savedAt}
            onDownload={() => passport && downloadText("look-passport.json", JSON.stringify(passport, null, 2))}
            onContinue={() => setStep("rebuild")}
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
            onCard={() => setStep("card")}
          />
        )}
        {step === "card" && session && passport && (
          <MatchCard passport={passport} photoUrl={session.photoUrl} holder={holder} persona={persona} look={look} wigs={wigs} hats={hats} onBack={() => setStep("rebuild")} />
        )}
      </div>
    </div>
  );
}
