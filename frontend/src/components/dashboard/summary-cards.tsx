"use client";

import { CalendarDays, Receipt, TrendingUp } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Card } from "@/components/ui/card";
import { StaggerItem, StaggerList } from "@/components/feedback/motion";
import { formatCurrency } from "@/lib/format";
import type { DashboardSummary } from "@/lib/types";

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StaggerItem className="col-span-2 lg:col-span-1">
        <Card className="h-full border-0 bg-brand p-5 text-white shadow-glow">
          <p className="text-sm font-medium text-white/80">Spent this month</p>
          <p className="tnum mt-2 font-display text-3xl font-bold">
            {formatCurrency(summary.month_total)}
          </p>
          <p className="mt-1 text-xs text-white/70">{summary.month_label}</p>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          label="Expenses"
          value={String(summary.expense_count)}
          hint="this month"
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Daily average"
          value={formatCurrency(summary.daily_average)}
          hint="per day"
        />
      </StaggerItem>

      <StaggerItem>
        <Card className="flex h-full flex-col p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            {summary.top_category ? (
              <CategoryIcon icon={summary.top_category.icon} className="h-5 w-5" />
            ) : (
              <CalendarDays className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">Top category</span>
          </div>
          {summary.top_category ? (
            <>
              <p className="mt-2 font-display text-xl font-bold">
                {summary.top_category.name}
              </p>
              <p className="tnum mt-1 text-xs text-muted-foreground">
                {formatCurrency(summary.top_category.total)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No spending yet</p>
          )}
        </Card>
      </StaggerItem>
    </StaggerList>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="tnum mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
