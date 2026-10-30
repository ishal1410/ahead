import type { Passport } from "@/lib/passport";
import { motion } from "motion/react";
import { PassportPage } from "./PassportPage";
import { Button } from "./ui";
import { Reveal, Tilt, motionTokens, staggerChild, staggerParent } from "./motion";

const PRIVACY = "Your photo is sent to the YouCam API to render try-ons. Ahead keeps your Look Passport only in this browser.";

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
  { name: "AI Hairstyle VTO, hair transfer", use: "Shows each wig on your face, ranked by colour match to your saved hair." },
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
}: {
  onStart: () => void;
  onDemo: () => void;
  demoState: "idle" | "loading" | "missing";
  saved: Passport | null;
  onOpenSaved: () => void;
  specimenPhoto?: string;
}) {
  return (
    <main id="main">
      {/* Hero entrance is CSS (runs before hydration, no SSR mismatch); total under 1s. */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-8 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-28">
        <div>
          <h1 className="font-display text-[44px] leading-[1.04] tracking-[-0.02em] sm:text-6xl lg:text-[76px]">
            <span className="line-mask">
              <span className="line-in" style={{ animationDelay: "60ms" }}>Capture before.</span>
            </span>
            <span className="line-mask">
              <span className="line-in" style={{ animationDelay: "170ms" }}>Rebuild after.</span>
            </span>
          </h1>
          <p className="enter mt-6 max-w-[34ch] text-lg leading-relaxed text-ink-soft sm:text-xl" style={{ animationDelay: "300ms" }}>
            For people preparing for chemotherapy, and the people who help them. Save your look now, and match to it later.
          </p>
          <div className="enter mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "380ms" }}>
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
                  // Same values as Maya's demo passport (public/demo/manifest.json).
                  hairHex: "#7A5A44",
                  hairLength: "mid",
                  browHex: "#564843",
                  browPreset: "SoftArch1",
                }}
              />
            </Tilt>
          </div>
          <p className="enter mt-6 text-center text-[13px] text-ink-soft" style={{ animationDelay: "650ms" }}>
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

      <section aria-labelledby="why" className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-8 lg:py-32">
        <Reveal>
          <h2 id="why" className="flex items-center justify-center gap-4 text-[15px] text-ink-soft">
            <motion.span aria-hidden className="h-px w-10 origin-right bg-ink-soft/40" {...drawRule} />
            Why Ahead
            <motion.span aria-hidden className="h-px w-10 origin-left bg-ink-soft/40" {...drawRule} />
          </h2>
          <p className="mt-8 text-balance font-display text-3xl leading-[1.22] tracking-[-0.01em] sm:text-[44px]">
            Perfect Corp proved patients want wig try-on (Nao-Art, 2024). Ahead fixes the step before it:{" "}
            <em className="text-cover">you can only match what you saved.</em>
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-8 max-w-[52ch] leading-relaxed text-ink-soft">
            A wig fitter works from memory and old photos. Ahead gives them the colour you measured, the brow shape you chose, and a card to hold in their hand.
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
