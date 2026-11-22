"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/categories/category-icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpenseDialog } from "./expense-dialog";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, friendlyDay } from "@/lib/format";
import { useDeleteExpense } from "@/lib/queries";
import type { Expense } from "@/lib/types";

export function ExpenseRow({ expense }: { expense: Expense }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteExpense = useDeleteExpense();

  const handleDelete = async () => {
    try {
      await deleteExpense.mutateAsync(expense.id);
      toast.success("Expense deleted.");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60">
      <CategoryBadge
        icon={expense.category.icon}
        className="transition-transform duration-300 group-hover:scale-105 group-hover:bg-brand-soft group-hover:text-primary"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{expense.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {friendlyDay(expense.spent_at)} · {format(new Date(expense.spent_at), "h:mm a")} ·{" "}
          {expense.category.name}
        </p>
      </div>

      <div className="text-right">
        <p className="tnum font-semibold">{formatCurrency(expense.amount)}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            type="button"
            aria-label="Expense options"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 600, damping: 26 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExpenseDialog expense={expense} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this expense?"
        description={`“${expense.name}” will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleteExpense.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
