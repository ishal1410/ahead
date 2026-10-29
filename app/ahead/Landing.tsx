import type { Passport } from "@/lib/passport";
import { PassportPage } from "./PassportPage";
import { Button } from "./ui";

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
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-8 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-28">
        <div className="rise">
          <h1 className="font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[76px]">
            Capture before.
            <br />
            Rebuild after.
          </h1>
          <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
            For people preparing for chemotherapy, and the people who help them. Save your look now, and match to it later.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onStart}>Start my Look Passport</Button>
            <Button variant="quiet" onClick={onDemo} disabled={demoState === "loading"}>
              {demoState === "loading" ? "Opening the demo" : "See Maya's demo"}
            </Button>
          </div>
          <div aria-live="polite" className="mt-4 min-h-6 text-[14px] text-ink-soft">
            {demoState === "missing" && "Maya's demo is being prepared and isn't available yet. You can start your own Look Passport in the meantime."}
            {saved && demoState !== "missing" && (
              <button type="button" onClick={onOpenSaved} className="cursor-pointer underline decoration-rule underline-offset-4 hover:decoration-ink">
                Open the passport saved in this browser
              </button>
            )}
          </div>
        </div>

        <div className="rise mx-auto w-full max-w-md lg:max-w-none" style={{ animationDelay: "120ms" }}>
          <div className="md:rotate-[1.5deg]">
            <PassportPage
              f={{
                holder: "Maya",
                photoUrl: specimenPhoto,
                hairHex: "#4A3022",
                hairLength: "mid",
                browHex: "#3A2A20",
                browPreset: "SoftArch1",
              }}
            />
          </div>
          <p className="mt-4 text-center text-[13px] text-ink-soft">A specimen page. Maya is an AI-generated persona.</p>
        </div>
      </section>

      <section aria-labelledby="how" className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 lg:py-28">
          <h2 id="how" className="font-display text-4xl tracking-[-0.01em] sm:text-5xl">
            How it works
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <li key={s.title} className="relative pl-14 md:pl-0 md:pt-16">
                <span aria-hidden className="absolute left-0 top-0 grid size-10 place-items-center rounded-full ring-1 ring-cover font-display text-lg text-cover">
                  {i + 1}
                </span>
                <h3 className="text-xl font-medium">{s.title}</h3>
                <p className="mt-2 max-w-[38ch] leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="apis" className="bg-cover text-on-cover">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:py-24">
          <div>
            <h2 id="apis" className="font-display text-4xl tracking-[-0.01em] sm:text-5xl">
              Two YouCam APIs, one look
            </h2>
            <p className="mt-4 max-w-[40ch] leading-relaxed opacity-85">
              Each render can build on the last: your saved brows are drawn on top of the wig you chose, so you see the whole look together.
            </p>
          </div>
          <dl className="grid gap-6">
            {apis.map((a) => (
              <div key={a.name} className="rounded-[20px] bg-on-cover/[0.07] p-6 ring-1 ring-inset ring-on-cover/15">
                <dt className="font-display text-2xl">{a.name}</dt>
                <dd className="mt-2 leading-relaxed opacity-85">{a.use}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="why" className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-8 lg:py-32">
        <h2 id="why" className="text-[15px] text-ink-soft">
          Why Ahead
        </h2>
        <p className="mt-6 font-display text-3xl leading-[1.2] tracking-[-0.01em] sm:text-[44px]">
          Perfect Corp proved patients want wig try-on (Nao-Art, 2024). Ahead fixes the step before it: you can only match what you saved.
        </p>
        <p className="mx-auto mt-8 max-w-[52ch] leading-relaxed text-ink-soft">
          A wig fitter works from memory and old photos. Ahead gives them the colour you measured, the brow shape you chose, and a card to hold in their hand.
        </p>
        <div className="mt-10 flex justify-center">
          <Button onClick={onStart}>Start my Look Passport</Button>
        </div>
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
