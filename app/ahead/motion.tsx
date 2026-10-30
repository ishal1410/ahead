"use client";
// Ahead motion system (motion-foundations): one token set, one spring map, a few
// shared primitives. Calm by design: no overshooting springs, no bounce easing.
import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

export const motionTokens = {
  duration: { instant: 0.08, fast: 0.18, normal: 0.35, slow: 0.6, crawl: 1.0 },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
    linear: [0, 0, 1, 1] as [number, number, number, number],
  },
  distance: { xs: 4, sm: 8, md: 16, lg: 24 },
  stagger: 0.07,
} as const;

// ponytail: the skill's "bouncy" preset is left out on purpose; this audience gets no bounce.
export const springs = {
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  settle: { type: "spring", stiffness: 170, damping: 26 },
  pointer: { stiffness: 150, damping: 22, mass: 0.6 },
} as const;

const ease = { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth };

/** Scroll reveal, once. MotionConfig reducedMotion="user" strips the y offset. */
export function Reveal({ children, className, delay = 0, as = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "li" | "section" }) {
  const C = motion[as];
  return (
    <C
      className={className}
      initial={{ opacity: 0, y: motionTokens.distance.lg }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...ease, delay }}
    >
      {children}
    </C>
  );
}

/** Stagger container + item variants for lists that enter together. */
export const staggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: motionTokens.stagger, delayChildren: 0.05 } },
};
export const staggerChild = {
  hidden: { opacity: 0, y: motionTokens.distance.md },
  visible: { opacity: 1, y: 0, transition: ease },
};

/**
 * A physical object under a light: pointer tilt (max 5deg) and a soft sheen that
 * follows the pointer. Fine pointers only; off under reduced motion.
 */
export function Tilt({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, springs.pointer);
  const sy = useSpring(py, springs.pointer);
  const rotateY = useTransform(sx, [0, 1], [-5, 5]);
  const rotateX = useTransform(sy, [0, 1], [4, -4]);
  const glow = useSpring(0, springs.pointer);
  const gx = useTransform(sx, (v) => `${v * 100}%`);
  const gy = useTransform(sy, (v) => `${v * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgb(255 255 255 / 0.28), transparent 60%)`;

  function move(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    glow.set(1);
  }
  function leave() {
    px.set(0.5);
    py.set(0.5);
    glow.set(0);
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={className} style={{ perspective: 1200 }}>
      {/* Same markup on server and client (no hydration mismatch); under reduced
          motion the pointer handler never moves the values off neutral. */}
      <motion.div style={{ rotateX, rotateY }} className="relative">
        {children}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[20px] mix-blend-soft-light" style={{ background: sheen, opacity: glow }} />
      </motion.div>
    </div>
  );
}

/** Counts up to `to` once; static under reduced motion. Decorative: pair with a live text. */
export function CountUp({ to, start = true }: { to: number; start?: boolean }) {
  const reduce = useReducedMotion();
  const node = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!start || !node.current) return;
    if (reduce) {
      node.current.textContent = String(to);
      return;
    }
    const c = animate(0, to, {
      duration: motionTokens.duration.crawl,
      ease: motionTokens.easing.smooth,
      onUpdate: (v) => node.current && (node.current.textContent = String(Math.round(v))),
    });
    return () => c.stop();
  }, [to, start, reduce]);
  return <span ref={node}>{reduce || !start ? to : 0}</span>;
}
