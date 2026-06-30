"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExpenseForm } from "./expense-form";
import type { Expense } from "@/lib/types";

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add an expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details and save your changes."
              : "Jot it down — the date and time default to now."}
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm expense={expense} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
