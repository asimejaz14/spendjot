"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Rows3, SquarePen } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BulkExpenseForm } from "./bulk-expense-form";
import { ExpenseForm } from "./expense-form";
import type { Expense } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "single" | "bulk";

interface ExpenseDialogProps {
  /** Provide for edit mode. */
  expense?: Expense;
  /** Uncontrolled mode: pass a trigger element. */
  trigger?: React.ReactNode;
  /** Controlled mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExpenseDialog({
  expense,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ExpenseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const isEdit = Boolean(expense);
  const [mode, setMode] = useState<Mode>("single");
  const bulk = !isEdit && mode === "bulk";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          // max-width is concrete on both sides, so CSS can glide between them.
          "transition-[max-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          bulk && "sm:max-w-4xl",
        )}
      >
        <AnimatedHeight>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit expense" : bulk ? "Add several expenses" : "Add an expense"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the details and save your changes."
                : bulk
                  ? "Type a few rows, paste from a spreadsheet, or import a file — review, then save them all at once."
                  : "Jot it down — the date and time default to now."}
            </DialogDescription>
          </DialogHeader>

          {!isEdit && <ModeSwitch mode={mode} onChange={setMode} />}

          <AnimatePresence mode="wait" initial={false} custom={bulk ? 1 : -1}>
            <motion.div
              key={bulk ? "bulk" : "single"}
              custom={bulk ? 1 : -1}
              variants={formSlide}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {bulk ? (
                <BulkExpenseForm onSuccess={() => setOpen(false)} />
              ) : (
                <ExpenseForm expense={expense} onSuccess={() => setOpen(false)} />
              )}
            </motion.div>
          </AnimatePresence>
        </AnimatedHeight>
      </DialogContent>
    </Dialog>
  );
}

/** Forms slide in the direction of the tab you picked: right for bulk, left for single. */
const formSlide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 32, filter: "blur(2px)" }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 380, damping: 34, mass: 0.8 },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -32,
    filter: "blur(2px)",
    transition: { duration: 0.14, ease: "easeIn" },
  }),
};

/**
 * Animates its height to follow its content, so the dialog grows/shrinks
 * smoothly instead of snapping when the form swaps.
 */
function AnimatedHeight({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // -m-1/p-1 leaves room so focus rings aren't clipped by overflow-hidden.
    <motion.div
      className="-m-1 overflow-hidden"
      initial={false}
      animate={{ height }}
      transition={
        reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38, mass: 0.9 }
      }
    >
      <div ref={innerRef} className="grid gap-4 p-1">
        {children}
      </div>
    </motion.div>
  );
}

const MODES: { value: Mode; label: string; icon: typeof Rows3 }[] = [
  { value: "single", label: "One expense", icon: SquarePen },
  { value: "bulk", label: "Several at once", icon: Rows3 },
];

/** Segmented control; the active pill glides between options (shared layoutId). */
function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="tablist" aria-label="Add mode" className="grid grid-cols-2 rounded-xl bg-muted p-1">
      {MODES.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(value)}
            className={cn(
              "relative flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="expense-mode-pill"
                className="absolute inset-0 rounded-lg bg-card shadow-soft"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <Icon className="relative h-4 w-4" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
