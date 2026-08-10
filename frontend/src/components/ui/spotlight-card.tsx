"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * A Card whose border lights up under the cursor. The pointer position is fed
 * through gsap.quickTo (the canonical GSAP mouse-follower — a single reused
 * tween, not one per move) for a smooth, weighted trail, and written to
 * --mx/--my which the `.spotlight` CSS reads. GSAP setup/cleanup is handled by
 * useGSAP's scope; the effect is skipped entirely under reduced motion.
 */
export function SpotlightCard({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Card>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const move = React.useRef<((x: number, y: number) => void) | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const pos = { x: 0, y: 0 };
      const write = () => {
        el.style.setProperty("--mx", `${pos.x}px`);
        el.style.setProperty("--my", `${pos.y}px`);
      };
      const xTo = gsap.quickTo(pos, "x", { duration: 0.5, ease: "power3", onUpdate: write });
      const yTo = gsap.quickTo(pos, "y", { duration: 0.5, ease: "power3", onUpdate: write });
      move.current = (x, y) => {
        xTo(x);
        yTo(y);
      };
    },
    { scope: ref },
  );

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !move.current) return;
    const r = el.getBoundingClientRect();
    move.current(e.clientX - r.left, e.clientY - r.top);
  };

  return (
    <Card ref={ref} onPointerMove={onPointerMove} className={cn("spotlight", className)} {...props}>
      {children}
    </Card>
  );
}
