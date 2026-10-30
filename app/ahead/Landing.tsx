import type { Passport } from "@/lib/passport";
import type { DemoManifest } from "@/lib/render";
import { motion } from "motion/react";
import { PassportPage } from "./PassportPage";
import { Button } from "./ui";
import { Reveal, Tilt, motionTokens, staggerChild, staggerParent } from "./motion";

const PRIVACY = "Your photo passes through Ahead's server to the YouCam API to render try-ons, and is not kept there. Your Look Passport, including the photo, stays only in this browser.";

const steps = [
  {
    title: "Capture",
    body: "One photo, taken while your hair is still yours to describe. Face and shoulders, hair down, brows visible.",
  },
  {
    title: "Save your passport",
    body: "Tap your hair and your brow to record their colours. Pick the brow shape that looks unchanged on your face.",
  },
  {
    title: "Rebuild",
    body: "Later, see your brows redrawn and wigs ranked by how closely they match the hair you saved, on your own face.",
  },
];

const apis = [
  { name: "Makeup VTO, eyebrows", use: "Draws three brow shapes on your photo so you can find yours, then redraws your saved recipe." },
  { name: "AI Hairstyle VTO, hair transfer", use: "Shows each wig on your face, ranked on a colour ring against the hair shade you saved." },
];

const ACS_WIG = "https://www.cancer.org/cancer/managing-cancer/side-effects/hair-skin-nails/hair-loss/choosing-and-wearing-wig.html";

// Each fact was read on its source page on 2026-10-30 (docs/research/EVIDENCE.md).
const facts = [
  {
    stat: "About 65%",
    body: "of people treated for cancer lose hair, a review of 36 studies found.",
    source: "Dua et al., Psycho-Oncology, PubMed",
    href: "https://pubmed.ncbi.nlm.nih.gov/26594010/",
  },
  {
    stat: "2 to 3 weeks",
    body: "after the first cycle is when hair loss usually starts, if it is going to happen.",
    source: "American Cancer Society",
    href: "https://www.cancer.org/cancer/managing-cancer/side-effects/hair-skin-nails/hair-loss/coping-with-hair-loss.html",
  },
  {
    stat: "89% and 87%",
    body: "of breast cancer survivors who had chemotherapy reported eyebrow and eyelash loss, in a Mayo Clinic registry survey of 838 people.",
    source: "Mayo Clinic Breast Disease Registry, PubMed",
    href: "https://pubmed.ncbi.nlm.nih.gov/39366882/",
  },
];

const inView = { initial: "hidden", whileInView: "visible", viewport: { once: true, margin: "-60px" } } as const;
const drawRule = {
  initial: { scaleX: 0 },
  whileInView: { scaleX: 1 },
  viewport: { once: true },
  transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth, delay: 0.2 },
};

export function Landing({
  onStart,
  onDemo,
  demoState,
  saved,
  onOpenSaved,
  specimenPhoto,
  specimen,
}: {
  onStart: () => void;
  onDemo: () => void;
  demoState: "idle" | "loading" | "missing";
  saved: Passport | null;
  onOpenSaved: () => void;
  specimenPhoto?: string;
  // Maya's demo passport, so the specimen never disagrees with the demo it advertises.
  specimen?: DemoManifest["passport"];
}) {
  return (
    <main id="main">
      {/* Hero entrance is CSS (runs before hydration, no SSR mismatch). It only moves things:
          headline, copy and CTAs are fully visible in the very first paint. */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-8 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-28">
        <div>
          <h1 className="font-display text-[44px] leading-[1.04] tracking-[-0.02em] sm:text-6xl lg:text-[76px]">
            <span className="rise block">Capture before.</span>
            <span className="rise block" style={{ animationDelay: "70ms" }}>Rebuild after.</span>
          </h1>
          <p className="rise mt-6 max-w-[34ch] text-lg leading-relaxed text-ink-soft sm:text-xl" style={{ animationDelay: "140ms" }}>
            For people preparing for chemotherapy, and the people who help them. Save your look now, and match to it later.
          </p>
          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "200ms" }}>
            <Button onClick={onStart}>Start my Look Passport</Button>
            <Button variant="quiet" onClick={onDemo} disabled={demoState === "loading"}>
              {demoState === "loading" ? "Opening the demo" : "See Maya's demo"}
            </Button>
          </div>
          <div aria-live="polite" className="mt-4 min-h-6 text-[14px] text-ink-soft">
            {demoState === "missing" && "Maya's demo is being prepared and isn't available yet. You can start your own Look Passport in the meantime."}
            {saved && demoState !== "missing" && (
              <button type="button" onClick={onOpenSaved} className="cursor-pointer underline decoration-rule underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-ink">
                Open the passport saved in this browser
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="hero-object relative">
            {/* a soft contact shadow so the page sits on the table */}
            <span aria-hidden className="absolute inset-x-10 -bottom-5 h-10 rounded-[50%] bg-ink/15 blur-2xl" />
            <Tilt>
              <PassportPage
                f={{
                  holder: "Maya",
                  photoUrl: specimenPhoto,
                  // Maya's demo passport; the fallback mirrors public/demo/manifest.json for the first paint.
                  hairHex: specimen?.hairHex ?? "#5C3420",
                  hairLength: specimen?.hairLength ?? "mid",
                  browHex: specimen?.brow.hex ?? "#564843",
                  browPreset: specimen?.brow.preset ?? "SoftArch1",
                  // A filled specimen is a saved one. Noon UTC: the same calendar day in every timezone we serve.
                  savedAt: "2026-10-29T12:00:00.000Z",
                }}
              />
            </Tilt>
          </div>
          <p className="rise mt-6 text-center text-[13px] text-ink-soft" style={{ animationDelay: "260ms" }}>
            A specimen page. Maya is an AI-generated persona.
          </p>
        </div>
      </section>

      <section aria-labelledby="how" className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 lg:py-28">
          <Reveal className="flex items-baseline gap-4">
            <span aria-hidden className="font-mono text-[13px] tracking-[0.14em] text-ink-soft">01</span>
            <h2 id="how" className="font-display text-4xl tracking-[-0.01em] sm:text-5xl">
              How it works
            </h2>
          </Reveal>
          <motion.ol variants={staggerParent} {...inView} className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <motion.li key={s.title} variants={staggerChild} className="border-t border-rule pt-6">
                <span aria-hidden className="font-display text-[44px] leading-none text-cover">{i + 1}</span>
                <h3 className="mt-5 text-xl font-medium">{s.title}</h3>
                <p className="mt-2 max-w-[38ch] leading-relaxed text-ink-soft">{s.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section aria-labelledby="apis" className="bg-cover text-on-cover">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:py-28">
          <Reveal>
            <span aria-hidden className="font-mono text-[13px] tracking-[0.14em] opacity-75">02</span>
            <h2 id="apis" className="mt-3 font-display text-4xl tracking-[-0.01em] sm:text-5xl">
              Two YouCam APIs, one look
            </h2>
            <p className="mt-5 max-w-[40ch] leading-relaxed opacity-85">
              Each render can build on the last: your saved brows are drawn on top of the wig you chose, so you see the whole look together.
            </p>
            <p aria-hidden className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12px] uppercase tracking-[0.12em] opacity-80">
              <span>Photo</span>
              <span className="h-px w-6 bg-on-cover/50" />
              <span>Wig</span>
              <span className="h-px w-6 bg-on-cover/50" />
              <span>Brows on the wig</span>
            </p>
          </Reveal>
          <motion.dl variants={staggerParent} {...inView} className="grid">
            {apis.map((a, i) => (
              <motion.div key={a.name} variants={staggerChild} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-on-cover/25 py-8 last:border-b">
                <span aria-hidden className="pt-2 font-mono text-[13px] opacity-70">{i === 0 ? "I" : "II"}</span>
                <div>
                  <dt className="font-display text-[28px] leading-tight sm:text-[32px]">{a.name}</dt>
                  <dd className="mt-3 max-w-[48ch] leading-relaxed opacity-85">{a.use}</dd>
                </div>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </section>

      <section aria-labelledby="before" className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 lg:py-24">
          <Reveal className="flex items-baseline gap-4">
            <span aria-hidden className="font-mono text-[13px] tracking-[0.14em] text-ink-soft">03</span>
            <h2 id="before" className="font-display text-4xl tracking-[-0.01em] sm:text-5xl">
              Why before
            </h2>
          </Reveal>
          <motion.ul variants={staggerParent} {...inView} className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {facts.map((f) => (
              <motion.li key={f.stat} variants={staggerChild} className="border-t border-rule pt-6">
                <p className="font-display text-[32px] leading-none text-cover">{f.stat}</p>
                <p className="mt-4 max-w-[38ch] leading-relaxed text-ink-soft">{f.body}</p>
                <a href={f.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] underline decoration-rule underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-ink">
                  Source: {f.source}
                </a>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      <section aria-labelledby="why" className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-8 lg:py-32">
        <Reveal>
          <h2 id="why" className="flex items-center justify-center gap-4 text-[15px] text-ink-soft">
            <motion.span aria-hidden className="h-px w-10 origin-right bg-ink-soft/40" {...drawRule} />
            Why Ahead
            <motion.span aria-hidden className="h-px w-10 origin-left bg-ink-soft/40" {...drawRule} />
          </h2>
          <p className="mt-8 text-balance font-display text-3xl leading-[1.22] tracking-[-0.01em] sm:text-[44px]">
            Perfect Corp and Nao-Art launched medical-wig try-on in Japan (2024). Ahead fixes the step before it:{" "}
            <em className="text-cover">you can only match what you saved.</em>
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-8 max-w-[52ch] leading-relaxed text-ink-soft">
            The American Cancer Society suggests planning your wig before hair loss: take photos of your current hairstyle and save a lock of hair.{" "}
            <a href={ACS_WIG} target="_blank" rel="noopener noreferrer" className="underline decoration-rule underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-ink">(Source)</a>{" "}
            Ahead keeps that photo with the ring shade you confirmed and the brow shape you chose, on a card your fitter can hold.
          </p>
          <div className="mt-10 flex justify-center">
            <Button onClick={onStart}>Start my Look Passport</Button>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-[14px] text-ink-soft sm:px-8 md:flex-row md:justify-between">
          <p className="max-w-[60ch]">{PRIVACY}</p>
          <p>Cosmetic planning aid. Not medical advice.</p>
        </div>
      </footer>
    </main>
  );
}

export { PRIVACY };
