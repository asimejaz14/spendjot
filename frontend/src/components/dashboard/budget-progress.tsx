"use client";

import { PiggyBank, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useBudgetProgress } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Green under 75%, amber up to 100%, rose once over. */
function barColor(pct: number): string {
  if (pct >= 1) return "bg-rose-500";
  if (pct >= 0.75) return "bg-amber-500";
  return "bg-emerald-500";
}

function Bar({ pct }: { pct: number }) {
  const width = Math.min(100, Math.max(0, pct * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full transition-all", barColor(pct))}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function BudgetProgressCard() {
  const { data, isLoading } = useBudgetProgress();

  if (isLoading) {
    return <Skeleton className="h-56 rounded-2xl" />;
  }
  if (!data) return null;

  const { overall, categories } = data;
  const hasOverall = overall.budget !== null;
  const hasAny = hasOverall || categories.length > 0;

  // Nothing set up yet — gentle nudge to configure budgets.
  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" /> Budget
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Set a monthly budget to track your spending and see what&apos;s safe to spend.
          </p>
          <Button asChild variant="brand" size="sm">
            <Link href="/settings">Set a budget</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const spent = Number(overall.spent);
  const budget = overall.budget ? Number(overall.budget) : 0;
  const remaining = overall.remaining ? Number(overall.remaining) : 0;
  const over = remaining < 0;
  const pct = overall.pct ?? 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-primary" /> Budget
        </CardTitle>
        <span className="text-xs text-muted-foreground">{data.month_label}</span>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasOverall && (
          <div className="space-y-2.5">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="tnum text-2xl font-bold tracking-tight">
                  {formatCurrency(spent)}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {formatCurrency(budget)} this month
                </p>
              </div>
              {overall.on_track !== null && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    overall.on_track
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                  )}
                >
                  {overall.on_track ? "On track" : "Over pace"}
                </span>
              )}
            </div>

            <Bar pct={pct} />

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <span className={cn("tnum font-medium", over ? "text-rose-500" : "text-foreground")}>
                {over
                  ? `${formatCurrency(Math.abs(remaining))} over budget`
                  : `${formatCurrency(remaining)} left`}
              </span>
              {overall.safe_per_day && !over && (
                <span className="tnum text-muted-foreground">
                  Safe to spend:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(overall.safe_per_day)}/day
                  </span>{" "}
                  for {data.days_left} {data.days_left === 1 ? "day" : "days"}
                </span>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              At this rate you&apos;ll spend about{" "}
              <span className="tnum font-medium text-foreground">
                {formatCurrency(overall.projected_month_end)}
              </span>{" "}
              by month end
            </p>
          </div>
        )}

        {categories.length > 0 && (
          <div className="space-y-3.5">
            {hasOverall && <div className="border-t border-border" />}
            {categories.map((c) => {
              const cSpent = Number(c.spent);
              const cBudget = Number(c.budget);
              const cOver = Number(c.remaining) < 0;
              return (
                <div key={c.category_id} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <CategoryBadge icon={c.icon ?? "misc"} className="h-8 w-8" iconClassName="h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.name}</span>
                        <span
                          className={cn(
                            "tnum shrink-0 text-xs",
                            cOver ? "text-rose-500" : "text-muted-foreground",
                          )}
                        >
                          {formatCurrency(cSpent)} / {formatCurrency(cBudget)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Bar pct={c.pct} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
