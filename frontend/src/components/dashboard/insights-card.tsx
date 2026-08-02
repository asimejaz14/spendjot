"use client";

import { ArrowDownRight, ArrowUpRight, Lightbulb, Receipt } from "lucide-react";
import { CategoryBadge } from "@/components/categories/category-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useInsights } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function InsightsCard() {
  const { data, isLoading } = useInsights();

  if (isLoading) return <Skeleton className="h-44 rounded-2xl" />;
  if (!data) return null;

  const { delta_pct, top_mover, biggest_expense, this_month_total, last_month_total } = data;

  // Nothing meaningful to say yet.
  if (delta_pct === null && !top_mover && !biggest_expense) return null;

  const up = (delta_pct ?? 0) > 0;
  const pctLabel = delta_pct === null ? null : `${Math.abs(Math.round(delta_pct * 100))}%`;

  const moverUp = top_mover ? Number(top_mover.delta) > 0 : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" /> Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {/* Month-over-month trend */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              pctLabel === null
                ? "bg-secondary text-secondary-foreground"
                : up
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            )}
          >
            {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          </span>
          <p className="text-sm">
            {pctLabel === null ? (
              <>Not enough history yet — this is your baseline month.</>
            ) : (
              <>
                Spending is{" "}
                <span className={cn("font-semibold", up ? "text-rose-500" : "text-emerald-500")}>
                  {up ? "up" : "down"} {pctLabel}
                </span>{" "}
                vs last month
                <span className="block text-xs text-muted-foreground">
                  {formatCurrency(this_month_total)} this month · {formatCurrency(last_month_total)} last
                </span>
              </>
            )}
          </p>
        </div>

        {/* Biggest category change */}
        {top_mover && (
          <div className="flex items-center gap-3">
            <CategoryBadge icon={top_mover.icon} className="h-9 w-9" iconClassName="h-4 w-4" />
            <p className="text-sm">
              Biggest change:{" "}
              <span className="font-semibold">{top_mover.name}</span>{" "}
              <span className={cn(moverUp ? "text-rose-500" : "text-emerald-500")}>
                {moverUp ? "up" : "down"} {formatCurrency(Math.abs(Number(top_mover.delta)))}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(top_mover.this_month)} vs {formatCurrency(top_mover.last_month)} last month
              </span>
            </p>
          </div>
        )}

        {/* Biggest single expense */}
        {biggest_expense && (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Receipt className="h-4 w-4" />
            </span>
            <p className="text-sm">
              Largest expense this month:{" "}
              <span className="font-semibold">{biggest_expense.name}</span>
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(biggest_expense.amount)} · {biggest_expense.category_name}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
