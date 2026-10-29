"use client";
import { useState } from "react";
import { Button, Frame } from "./ui";
import { PRIVACY } from "./Landing";

const tips = [
  "Face and shoulders in the frame",
  "Hair down, as you usually wear it",
  "Brows visible, nothing covering them",
  "Even light from the front, no strong shadows",
];

export function Capture({ onConfirm, busy, error }: { onConfirm: (url: string) => void; busy: boolean; error?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>();
  const [localError, setLocalError] = useState<string>();

  function pick(f: File | undefined) {
    setLocalError(undefined);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setLocalError("Please choose a JPEG, PNG, or WebP photo.");
    if (f.size > 10 * 1024 * 1024) return setLocalError("Please choose a photo under 10 MB.");
    if (url) URL.revokeObjectURL(url); // ponytail: the confirmed URL lives on in the session, so only replaced ones are revoked
    setFile(f);
    setUrl(URL.createObjectURL(f));
  }

  const message = localError ?? error;

  return (
    <main id="main" className="rise mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-16">
      <div>
        <h1 tabIndex={-1} data-step-heading className="font-display text-4xl leading-tight tracking-[-0.01em] outline-none sm:text-5xl">
          One photo, taken today
        </h1>
        <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-ink-soft">
          This is the reference everything else is matched to. A phone selfie is fine.
        </p>
        <ul className="mt-8 grid gap-3">
          {tips.map((t) => (
            <li key={t} className="flex items-start gap-3 leading-relaxed">
              <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-cover" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-[52ch] text-[14px] leading-relaxed text-ink-soft">{PRIVACY}</p>
      </div>

      <Frame className="p-2">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-[14px] bg-tint/60 p-6 text-center">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Your selected photo" className="max-h-[440px] w-auto rounded-[14px] object-contain" />
          ) : (
            <div className="grid gap-2">
              <p className="font-display text-2xl">Add your photo</p>
              <p className="max-w-[32ch] text-ink-soft">Take one now with your camera, or choose one you already have.</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 text-[15px] font-medium ring-1 ring-inset ring-rule transition-colors duration-300 ease-calm hover:bg-tint focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-cover">
              {url ? "Choose a different photo" : "Take or choose a photo"}
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {file && url && (
              <Button onClick={() => onConfirm(url)} disabled={busy}>
                {busy ? "Uploading your photo" : "Use this photo"}
              </Button>
            )}
          </div>

          <p role="status" aria-live="polite" className={`min-h-6 text-[14px] ${message ? "text-danger" : "text-ink-soft"}`}>
            {message ?? (busy ? "Uploading. This takes a few seconds." : "")}
          </p>
        </div>
      </Frame>
    </main>
  );
}
