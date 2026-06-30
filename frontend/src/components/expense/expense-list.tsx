"use client";

import { StaggerItem, StaggerList } from "@/components/feedback/motion";
import { ExpenseRow } from "./expense-row";
import type { Expense } from "@/lib/types";

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <StaggerList className="divide-y divide-border">
      {expenses.map((expense) => (
        <StaggerItem key={expense.id}>
          <ExpenseRow expense={expense} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
