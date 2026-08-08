"use client";

import { CalendarDays, Receipt, Sparkles, TrendingUp } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/feedback/animated-number";
import { HoverLift, StaggerItem, StaggerList } from "@/components/feedback/motion";
import { formatCurrency } from "@/lib/format";
import type { DashboardSummary } from "@/lib/types";

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <StaggerList className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* Hero — the living, gradient-panning headline figure. */}
      <StaggerItem className="col-span-2 lg:col-span-1">
        <HoverLift className="h-full" lift={4}>
          <div className="ring-sheen relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-brand-mesh bg-[length:200%_200%] p-5 text-white shadow-glow animate-gradient-pan">
            {/* soft top-light + floating sparkles */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(255,255,255,0.28),transparent_60%)]" />
            <Sparkles className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-white/70 animate-float" />
            <Sparkles className="pointer-events-none absolute bottom-6 right-10 h-3 w-3 text-white/50 animate-float-slow" />
            <p className="relative text-sm font-medium text-white/85">Spent this month</p>
            <div className="relative">
              <AnimatedNumber
                value={Number(summary.month_total)}
                format={(v) => formatCurrency(v)}
                className="tnum block font-display text-[2rem] font-bold leading-tight drop-shadow-sm"
              />
              <p className="mt-1 text-xs text-white/70">{summary.month_label}</p>
            </div>
          </div>
        </HoverLift>
      </StaggerItem>

      <StaggerItem>
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          label="Expenses"
          value={summary.expense_count}
          hint="this month"
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Daily average"
          value={Number(summary.daily_average)}
          currency
          hint="per day"
        />
      </StaggerItem>

      <StaggerItem>
        <HoverLift className="h-full" lift={4}>
          <Card interactive className="flex h-full flex-col p-5">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-primary ring-1 ring-primary/10">
                {summary.top_category ? (
                  <CategoryIcon icon={summary.top_category.icon} className="h-[18px] w-[18px]" />
                ) : (
                  <CalendarDays className="h-[18px] w-[18px]" />
                )}
              </span>
              <span className="text-sm font-medium">Top category</span>
            </div>
            {summary.top_category ? (
              <>
                <p className="mt-3 truncate font-display text-xl font-bold">
                  {summary.top_category.name}
                </p>
                <AnimatedNumber
                  value={Number(summary.top_category.total)}
                  format={(v) => formatCurrency(v)}
                  className="tnum mt-0.5 text-xs text-muted-foreground"
                />
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No spending yet</p>
            )}
          </Card>
        </HoverLift>
      </StaggerItem>
    </StaggerList>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  currency,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  currency?: boolean;
}) {
  return (
    <HoverLift className="h-full" lift={4}>
      <Card interactive className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-primary ring-1 ring-primary/10">
            {icon}
          </span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <AnimatedNumber
          value={value}
          format={currency ? (v) => formatCurrency(v) : (v) => String(Math.round(v))}
          className="tnum mt-3 font-display text-2xl font-bold"
        />
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </Card>
    </HoverLift>
  );
}
