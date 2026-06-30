"use client";

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
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60">
      <CategoryBadge icon={expense.category.icon} />

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
        <DropdownMenuTrigger
          aria-label="Expense options"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical className="h-4 w-4" />
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
