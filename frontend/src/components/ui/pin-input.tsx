"use client";

import { motion, useAnimationControls } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  /** masks digits like a password */
  mask?: boolean;
  invalid?: boolean;
}

export function PinInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
  ariaLabel = "PIN",
  mask = true,
  invalid = false,
}: PinInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => value.split("").slice(0, length), [value, length]);

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  // Feedback on a rejected PIN: a quick horizontal shake. Rare (only fires on a
  // failed attempt) so it sits in the delight/feedback budget, and it's a
  // `transform` keyframe so MotionConfig silences it under reduced-motion.
  const shake = useAnimationControls();
  const wasInvalid = React.useRef(false);
  React.useEffect(() => {
    if (invalid && !wasInvalid.current) {
      shake.start({
        x: [0, -6, 6, -4, 4, 0],
        transition: { duration: 0.36, ease: "easeInOut" },
      });
    }
    wasInvalid.current = invalid;
  }, [invalid, shake]);

  const setDigit = (index: number, digit: string) => {
    const next = value.split("");
    next[index] = digit;
    onChange(next.join("").slice(0, length).replace(/\D/g, ""));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "");
    if (!digit) return;
    if (digit.length > 1) {
      // handle paste-into-cell
      const chars = digit.slice(0, length - index).split("");
      const next = value.split("");
      chars.forEach((c, i) => (next[index + i] = c));
      const joined = next.join("").slice(0, length).replace(/\D/g, "");
      onChange(joined);
      const focusAt = Math.min(index + chars.length, length - 1);
      refs.current[focusAt]?.focus();
      return;
    }
    setDigit(index, digit);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = value.split("");
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        next[index - 1] = "";
        onChange(next.join(""));
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
  };

  return (
    <motion.div
      animate={shake}
      className="flex gap-2 sm:gap-3"
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type={mask ? "password" : "text"}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          aria-label={`${ariaLabel} digit ${i + 1}`}
          value={digits[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-12 w-full min-w-0 rounded-xl border bg-background text-center text-lg font-semibold shadow-sm transition-[border-color,box-shadow,color]",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
            invalid ? "border-destructive" : "border-input",
            "sm:h-14 sm:text-xl",
          )}
        />
      ))}
    </motion.div>
  );
}
