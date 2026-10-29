// The signature element: the Look Passport rendered as a document page.
import type { Length } from "@/lib/catalog";
import { browLabel, mrzLines, shadeFamily } from "@/lib/passport";
import { Swatch } from "./ui";

export interface PassportFields {
  photoUrl?: string;
  hairHex?: string;
  hairLength?: Length;
  browHex?: string;
  browPreset?: string;
  thickness?: number;
  intensity?: number;
  savedAt?: string;
  holder: string;
}

const lengthName: Record<Length, string> = { short: "Short", mid: "Shoulder", long: "Long" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-ink-soft">{label}</dt>
      <dd className="mt-1 text-[15px]">{children}</dd>
    </div>
  );
}

export function PassportPage({ f, compact = false }: { f: PassportFields; compact?: boolean }) {
  const brow = f.browPreset && f.browHex ? { preset: f.browPreset, hex: f.browHex, thickness: f.thickness ?? 0, intensity: f.intensity ?? 80 } : undefined;
  const [l1, l2] = mrzLines({ hairHex: f.hairHex, hairLength: f.hairLength, brow });
  const saved = f.savedAt ? new Date(f.savedAt) : null;

  return (
    <article aria-label="Look Passport" className="guilloche relative overflow-hidden rounded-[20px] shadow-[var(--shadow)] ring-1 ring-rule/70">
      <header className="flex items-baseline justify-between gap-4 bg-cover px-5 py-3 text-on-cover sm:px-6">
        <span className="font-display text-[19px] leading-none">Look Passport</span>
        <span className="text-[12px] opacity-80">Ahead</span>
      </header>

      <div className={`grid gap-5 p-5 sm:p-6 ${compact ? "grid-cols-[88px_1fr]" : "grid-cols-[minmax(84px,120px)_1fr]"}`}>
        <div className="aspect-[3/4] overflow-hidden rounded-[14px] bg-tint ring-1 ring-rule">
          {f.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.photoUrl} alt={`Baseline photo of ${f.holder}`} className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center px-2 text-center text-[12px] text-ink-soft">Your photo</span>
          )}
        </div>

        <dl className="grid content-start gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Holder">{f.holder}</Field>
          <Field label="Saved">{saved ? saved.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not yet"}</Field>
          <Field label="Hair colour">
            <Swatch hex={f.hairHex} label={f.hairHex ? shadeFamily(f.hairHex) : "Tap your hair"} size="sm" />
          </Field>
          <Field label="Hair length">{f.hairLength ? lengthName[f.hairLength] : "Not yet"}</Field>
          <Field label="Brow colour">
            <Swatch hex={f.browHex} label="Brow" size="sm" />
          </Field>
          <Field label="Brow shape">{f.browPreset ? browLabel(f.browPreset) : "Not yet"}</Field>
        </dl>
      </div>

      <div aria-hidden className="mrz border-t border-dashed border-rule px-5 py-3 text-[10.5px] leading-[1.7] text-ink-soft sm:px-6 sm:text-[12px]">
        <div>{l1}</div>
        <div>{l2}</div>
      </div>

      {saved && (
        <div aria-hidden className="stamp pointer-events-none absolute right-5 top-14 grid size-[84px] place-items-center rounded-full border-2 border-cover text-center text-cover opacity-90 sm:right-7 sm:size-[96px]">
          <span className="font-display text-[15px] leading-tight">
            Saved
            <br />
            <span className="font-mono text-[10px]">{saved.toISOString().slice(0, 10)}</span>
          </span>
        </div>
      )}
    </article>
  );
}
