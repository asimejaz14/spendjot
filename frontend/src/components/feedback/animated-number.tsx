"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Formatter = (value: number) => string;

/**
 * Smoothly counts a number from its previous value up to `value` whenever it
 * changes — the little bit of motion that makes figures feel "earned". The
 * format function keeps it currency/percent agnostic, and the whole thing
 * collapses to a static render when the user prefers reduced motion.
 */
export function AnimatedNumber({
  value,
  format = (v) => String(Math.round(v)),
  duration = 0.9,
  className,
}: {
  value: number;
  format?: Formatter;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: [0.23, 1, 0.32, 1], // strong ease-out (animations.dev) — fast start, gentle settle
      onUpdate: (v) => setDisplay(v),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={className}>{format(display)}</span>
  );
}
