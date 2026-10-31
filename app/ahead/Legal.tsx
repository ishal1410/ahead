import type { ReactNode } from "react";

// Shared shell for /privacy and /terms: same paper, type and rhythm as the app.
export const ISSUES = "https://github.com/ishal1410/ahead/issues";
export const PERFECT_CORP = "https://www.perfectcorp.com/perfectbeauty/youcam/privacy-policy-api";
export const a = "underline decoration-rule underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-ink";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-6 sm:px-8">
        <a href="/" className="font-display text-2xl tracking-[-0.01em]">Ahead</a>
        <nav aria-label="Legal" className="flex gap-5 text-[14px] text-ink-soft">
          <a href="/privacy" className={a}>Privacy</a>
          <a href="/terms" className={a}>Terms</a>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-[68ch] flex-1 px-4 py-12 sm:px-8 lg:py-16">
        <h1 className="font-display text-4xl leading-tight tracking-[-0.01em] sm:text-5xl">{title}</h1>
        <p className="mt-3 text-[14px] text-ink-soft">Last updated {updated}</p>
        <div className="mt-10 grid gap-10 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-[-0.01em] [&_li]:mt-2 [&_p]:mt-3 [&_p]:text-ink-soft [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-soft">
          {children}
        </div>
      </main>
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4 py-8 text-[14px] text-ink-soft sm:px-8">
          <a href="/" className={a}>Back to Ahead</a>
          <p>Cosmetic planning aid. Not medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
