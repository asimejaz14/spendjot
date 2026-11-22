"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Rows3, SquarePen } from "lucide-react";
import { useState } from "react";
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
      <DialogContent className={cn(bulk && "sm:max-w-4xl")}>
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

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={bulk ? "bulk" : "single"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            {bulk ? (
              <BulkExpenseForm onSuccess={() => setOpen(false)} />
            ) : (
              <ExpenseForm expense={expense} onSuccess={() => setOpen(false)} />
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
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
