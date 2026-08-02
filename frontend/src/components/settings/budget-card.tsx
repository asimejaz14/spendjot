"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/categories/category-icon";
import { Spinner } from "@/components/feedback/loaders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/api";
import { useBudgets, useCategories, useDeleteBudget, useSetBudget } from "@/lib/queries";

/** "60000.00" -> "60000" for editing in whole rupees. */
const toInput = (amount: string) => String(Number(amount));

export function BudgetCard() {
  const { data: categories } = useCategories();
  const { data: budgets } = useBudgets();
  const setBudget = useSetBudget();
  const deleteBudget = useDeleteBudget();

  const [overall, setOverall] = useState("");
  const [byCat, setByCat] = useState<Record<number, string>>({});
  const [initial, setInitial] = useState<{ overall: string; byCat: Record<number, string> }>({
    overall: "",
    byCat: {},
  });
  const [saving, setSaving] = useState(false);

  // Seed the form from the saved budgets whenever they (re)load.
  useEffect(() => {
    if (!budgets) return;
    const o = budgets.find((b) => b.category_id === null);
    const overallVal = o ? toInput(o.amount) : "";
    const cats: Record<number, string> = {};
    for (const b of budgets) {
      if (b.category_id !== null) cats[b.category_id] = toInput(b.amount);
    }
    setOverall(overallVal);
    setByCat(cats);
    setInitial({ overall: overallVal, byCat: cats });
  }, [budgets]);

  const save = async () => {
    const rows: { key: number | null; val: string; init: string }[] = [
      { key: null, val: overall.trim(), init: initial.overall },
      ...(categories ?? []).map((c) => ({
        key: c.id,
        val: (byCat[c.id] ?? "").trim(),
        init: initial.byCat[c.id] ?? "",
      })),
    ];

    for (const r of rows) {
      if (r.val !== "" && (!Number.isFinite(Number(r.val)) || Number(r.val) <= 0)) {
        toast.error("Budgets must be amounts greater than zero.");
        return;
      }
    }

    const ops = rows
      .filter((r) => r.val !== r.init)
      .map((r) =>
        r.val === ""
          ? deleteBudget.mutateAsync(r.key)
          : setBudget.mutateAsync({ category_id: r.key, amount: r.val }),
      );

    if (ops.length === 0) {
      toast("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(ops);
      toast.success("Budgets updated.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly budgets</CardTitle>
        <CardDescription>
          Set limits and track your progress on the dashboard. Leave blank for no limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="overall-budget">Overall monthly budget</Label>
          <div className="relative max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₨
            </span>
            <Input
              id="overall-budget"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 80000"
              className="pl-7"
              value={overall}
              onChange={(e) => setOverall(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <Label className="text-muted-foreground">Per-category limits</Label>
          <div className="divide-y divide-border rounded-xl border">
            {categories?.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2.5">
                <CategoryBadge icon={c.icon} className="h-8 w-8" iconClassName="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                <div className="relative w-32 shrink-0">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ₨
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="No limit"
                    className="h-9 pl-6 text-sm"
                    aria-label={`${c.name} monthly budget`}
                    value={byCat[c.id] ?? ""}
                    onChange={(e) => setByCat((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            Save budgets
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
