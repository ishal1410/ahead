// Small shared pieces. Shape rule: interactive controls are full pills, framed
// surfaces are 20px, photos are 14px.
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "quiet";

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium whitespace-nowrap press disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer";
  const look =
    variant === "primary"
      ? "bg-cover text-on-cover shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(28_36_32/0.18)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_8px_20px_-8px_rgb(28_36_32/0.45)]"
      : "bg-transparent text-ink ring-1 ring-inset ring-rule hover:bg-tint hover:ring-ink-soft/50";
  return <button type="button" className={`${base} ${look} ${className}`} {...rest} />;
}

export function Swatch({ hex, label, size = "md" }: { hex?: string; label: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "size-5" : "size-9";
  return (
    <span className="inline-flex items-center gap-3">
      <span
        aria-hidden
        className={`${dim} shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15`}
        style={{ background: hex ?? "transparent", backgroundImage: hex ? undefined : "repeating-linear-gradient(45deg, var(--rule) 0 2px, transparent 2px 6px)" }}
      />
      <span className="flex flex-col leading-tight">
        <span className="text-[13px] text-ink-soft">{label}</span>
        <span className="font-mono text-[14px] tracking-wide">{hex ?? "Not yet"}</span>
      </span>
    </span>
  );
}

export function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] bg-surface shadow-[var(--shadow)] ring-1 ring-rule/70 ${className}`}>{children}</div>;
}

export function PersonaNote({ name }: { name: string }) {
  return (
    <p className="text-[13px] text-ink-soft">
      {name} is an AI-generated persona, preparing for treatment.
    </p>
  );
}
