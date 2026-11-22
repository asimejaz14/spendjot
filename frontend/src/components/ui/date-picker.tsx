"use client";

import * as Popover from "@radix-ui/react-popover";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ISO = "yyyy-MM-dd";
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const d = parse(v, ISO, new Date());
  return isValid(d) ? d : undefined;
}

// Month grid slides in the direction of travel (prev ← / next →).
const slide: Variants = {
  enter: (dir: number) => ({ x: dir * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -28, opacity: 0 }),
};

interface DatePickerProps {
  id?: string;
  /** "yyyy-MM-dd", or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  /** Show an inline ✕ that resets the value to "". */
  clearable?: boolean;
  className?: string;
  /** Extra classes for the field itself (e.g. a shorter height in dense grids). */
  triggerClassName?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
}

/**
 * Animated calendar popover — a drop-in for <input type="date">. The native
 * picker can't be styled or animated, so this one springs open from its
 * field, slides between months and pops the chosen day.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  clearable = false,
  className,
  triggerClassName,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const selected = toDate(value);
  const minD = toDate(min);
  const maxD = toDate(max);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(selected ?? new Date()));
  const [dir, setDir] = useState(0);

  const onOpenChange = (next: boolean) => {
    // Re-centre on the chosen month each time the calendar opens.
    if (next) {
      setDir(0);
      setView(startOfMonth(selected ?? new Date()));
    }
    setOpen(next);
  };

  const go = (n: number) => {
    setDir(n);
    setView((v) => addMonths(v, n));
  };

  const days = eachDayOfInterval({
    start: startOfWeek(view, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(view), { weekStartsOn: 1 }),
  });

  const isDisabled = (d: Date) =>
    Boolean((minD && isBefore(d, startOfDay(minD))) || (maxD && isAfter(d, startOfDay(maxD))));

  const pick = (d: Date) => {
    onChange(format(d, ISO));
    setOpen(false);
  };

  const today = startOfDay(new Date());

  return (
    <div className={cn("relative", className)}>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid || undefined}
            className={cn(
              "group flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-background px-3.5 text-left text-sm shadow-sm",
              "transition-[border-color,box-shadow] duration-200 hover:border-foreground/25 data-[state=open]:border-foreground/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "aria-[invalid=true]:border-destructive",
              clearable && selected && "pr-10",
              triggerClassName,
            )}
          >
            <motion.span
              className="shrink-0 text-muted-foreground"
              animate={open ? { rotate: -10, scale: 1.12 } : { rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
            >
              <CalendarDays className="h-4 w-4" />
            </motion.span>
            <span className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={value || "empty"}
                  className={cn("tnum block truncate", !selected && "text-muted-foreground")}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                >
                  {selected ? format(selected, "d MMM yyyy") : placeholder}
                </motion.span>
              </AnimatePresence>
            </span>
          </button>
        </Popover.Trigger>

        <AnimatePresence>
          {open && (
            <Popover.Portal forceMount>
              <Popover.Content forceMount asChild align="start" sideOffset={6} collisionPadding={12}>
                <motion.div
                  className="z-50 w-[18.5rem] origin-[var(--radix-popover-content-transform-origin)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-glow"
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.12, ease: "easeIn" } }}
                  transition={{ type: "spring", stiffness: 520, damping: 34 }}
                >
                  {/* Header: month label + prev / next */}
                  <div className="mb-2 flex items-center justify-between">
                    <NavButton label="Previous month" onClick={() => go(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </NavButton>
                    <div className="relative h-5 flex-1 overflow-hidden text-center">
                      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                        <motion.span
                          key={view.toISOString()}
                          custom={dir}
                          variants={slide}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          className="block font-display text-sm font-semibold"
                        >
                          {format(view, "MMMM yyyy")}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <NavButton label="Next month" onClick={() => go(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </NavButton>
                  </div>

                  <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-muted-foreground">
                    {WEEKDAYS.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>

                  {/* Day grid — slides with the month */}
                  <div className="relative overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                      <motion.div
                        key={view.toISOString()}
                        custom={dir}
                        variants={slide}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="grid grid-cols-7 gap-0.5"
                      >
                        {days.map((d) => {
                          const sel = selected && isSameDay(d, selected);
                          const off = !isSameMonth(d, view);
                          const disabled = isDisabled(d);
                          return (
                            <motion.button
                              key={d.toISOString()}
                              type="button"
                              disabled={disabled}
                              onClick={() => pick(d)}
                              aria-label={format(d, "EEEE, d MMMM yyyy")}
                              aria-pressed={sel}
                              whileHover={disabled ? undefined : { scale: 1.1 }}
                              whileTap={disabled ? undefined : { scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 600, damping: 26 }}
                              className={cn(
                                "tnum relative flex h-9 items-center justify-center rounded-lg text-sm outline-none transition-colors",
                                "hover-on:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                                off && "text-muted-foreground/60",
                                isToday(d) && !sel && "font-semibold text-primary",
                                disabled && "opacity-30",
                                sel && "font-semibold text-primary-foreground",
                              )}
                            >
                              {sel && (
                                <motion.span
                                  layoutId={`dp-selected-${id ?? "x"}`}
                                  className="absolute inset-0 rounded-lg bg-primary shadow-soft"
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 520, damping: 24 }}
                                />
                              )}
                              {isToday(d) && !sel && (
                                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                              )}
                              <span className="relative">{format(d, "d")}</span>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Footer shortcuts */}
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <FooterButton
                      disabled={isDisabled(today)}
                      onClick={() => pick(today)}
                    >
                      Today
                    </FooterButton>
                    {clearable && (
                      <FooterButton
                        disabled={!selected}
                        onClick={() => {
                          onChange("");
                          setOpen(false);
                        }}
                      >
                        Clear
                      </FooterButton>
                    )}
                  </div>
                </motion.div>
              </Popover.Content>
            </Popover.Portal>
          )}
        </AnimatePresence>
      </Popover.Root>

      {/* Inline clear (outside the trigger: no button-inside-button). */}
      <AnimatePresence>
        {clearable && selected && (
          <motion.button
            type="button"
            aria-label="Clear date"
            onClick={() => onChange("")}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            whileHover={{ scale: 1.12, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className="absolute right-2.5 top-1/2 -mt-3 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 600, damping: 24 }}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </motion.button>
  );
}

function FooterButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-primary outline-none transition-colors hover-on:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
    >
      {children}
    </motion.button>
  );
}
