"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Open state that works both controlled (`open` + `onOpenChange`) and
 * uncontrolled (`defaultOpen`). Animated Radix wrappers need to *know* the open
 * state so they can keep content mounted (`forceMount`) while Motion's
 * AnimatePresence plays the exit animation.
 */
export function useControllableOpen(
  openProp: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
): [boolean, (open: boolean) => void] {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen ?? false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  return [open, setOpen];
}

/** `true` when the media query matches (client-only; false during SSR). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}
