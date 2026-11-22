"use client";

import { Plus, Sparkles, WalletMinimal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BudgetProgressCard } from "@/components/dashboard/budget-progress";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { DailyLine } from "@/components/dashboard/daily-line";
import { CURRENT_MONTH, MonthFilter, toMonthParam } from "@/components/dashboard/month-filter";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ExpenseDialog } from "@/components/expense/expense-dialog";
import { ExpenseList } from "@/components/expense/expense-list";
import { EmptyState } from "@/components/feedback/empty-state";
import { FadeIn, Reveal } from "@/components/feedback/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useDailySeries, useDashboardSummary } from "@/lib/queries";

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(CURRENT_MONTH);
  const month = toMonthParam(selectedMonth);
  const isCurrent = month === undefined;
  const summaryQuery = useDashboardSummary(month);
  const dailyQuery = useDailySeries(month);
  // Dim (don't blank) the page while a newly picked month loads.
  const switching = summaryQuery.isPlaceholderData;

  const firstName = user?.display_name?.split(" ")[0];
  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <FadeIn>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {firstName ? (
                <>
                  {greeting}, <span className="text-gradient">{firstName}</span>
                </>
              ) : (
                "Dashboard"
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isCurrent
                ? "Here’s your spending at a glance."
                : `Looking back at ${summaryQuery.data?.month_label ?? "a past month"}.`}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <MonthFilter
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="flex-1 sm:flex-none"
            />
            <ExpenseDialog
              trigger={
                <Button variant="brand" className="hidden sm:inline-flex">
                  <Plus className="h-5 w-5" /> Add expense
                </Button>
              }
            />
          </div>
        </header>
      </FadeIn>

      {summaryQuery.isLoading ? (
        <DashboardSkeleton />
      ) : summaryQuery.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            We couldn&apos;t load your dashboard. Please refresh and try again.
          </CardContent>
        </Card>
      ) : summaryQuery.data && summaryQuery.data.expense_count === 0 ? (
        <EmptyState
          icon={<WalletMinimal className="h-7 w-7" />}
          title={
            isCurrent
              ? "No expenses yet this month"
              : `No expenses in ${summaryQuery.data.month_label}`
          }
          description={
            isCurrent
              ? "Add your first expense to start seeing where your money goes."
              : "Pick another month, or add an expense dated in this one."
          }
          action={
            <ExpenseDialog
              trigger={
                <Button variant="brand">
                  <Plus className="h-5 w-5" /> Add your first expense
                </Button>
              }
            />
          }
        />
      ) : summaryQuery.data ? (
        <div
          className={`space-y-6 transition-opacity duration-200 ${switching ? "opacity-60" : ""}`}
          aria-busy={switching}
        >
          <SummaryCards summary={summaryQuery.data} isCurrent={isCurrent} />

          <Reveal className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <BudgetProgressCard month={month} />
            </div>
            <div className="min-w-0">
              <InsightsCard month={month} />
            </div>
          </Reveal>

          <div className="grid gap-4 lg:grid-cols-2">
            <Reveal className="min-w-0">
              <SpotlightCard className="h-full overflow-hidden">
                <CardHeader>
                  <CardTitle>Where your money went</CardTitle>
                </CardHeader>
                <CardContent>
                  {summaryQuery.data.by_category.length > 0 ? (
                    <CategoryDonut data={summaryQuery.data.by_category} />
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No category data yet.
                    </p>
                  )}
                </CardContent>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={0.05} className="min-w-0">
              <SpotlightCard className="h-full overflow-hidden">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>Recent expenses</CardTitle>
                  <Link href="/history" className="text-sm font-medium text-primary hover:underline">
                    View all
                  </Link>
                </CardHeader>
                <CardContent>
                  {summaryQuery.data.recent.length > 0 ? (
                    <ExpenseList expenses={summaryQuery.data.recent} />
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nothing here yet.
                    </p>
                  )}
                </CardContent>
              </SpotlightCard>
            </Reveal>
          </div>

          <Reveal>
            <SpotlightCard>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Daily spending</CardTitle>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  {dailyQuery.data?.month_label ?? "This month"}
                </span>
              </CardHeader>
              <CardContent>
                {dailyQuery.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : dailyQuery.data ? (
                  <DailyLine data={dailyQuery.data.points} />
                ) : null}
              </CardContent>
            </SpotlightCard>
          </Reveal>
        </div>
      ) : null}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
