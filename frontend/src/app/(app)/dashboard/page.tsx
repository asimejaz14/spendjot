"use client";

import { Plus, Sparkles, WalletMinimal } from "lucide-react";
import Link from "next/link";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { MonthlyBar } from "@/components/dashboard/monthly-bar";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ExpenseDialog } from "@/components/expense/expense-dialog";
import { ExpenseList } from "@/components/expense/expense-list";
import { EmptyState } from "@/components/feedback/empty-state";
import { FadeIn } from "@/components/feedback/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useDashboardSummary, useMonthlySeries } from "@/lib/queries";

export default function DashboardPage() {
  const { user } = useAuth();
  const summaryQuery = useDashboardSummary();
  const monthlyQuery = useMonthlySeries(6);

  const firstName = user?.display_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {firstName ? `Hi, ${firstName}` : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s your spending at a glance.</p>
        </div>
        <ExpenseDialog
          trigger={
            <Button variant="brand" className="hidden sm:inline-flex">
              <Plus className="h-5 w-5" /> Add expense
            </Button>
          }
        />
      </header>

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
          title="No expenses yet this month"
          description="Add your first expense to start seeing where your money goes."
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
        <>
          <SummaryCards summary={summaryQuery.data} />

          <div className="grid gap-4 lg:grid-cols-2">
            <FadeIn className="min-w-0">
              <Card className="h-full overflow-hidden">
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
              </Card>
            </FadeIn>

            <FadeIn delay={0.05} className="min-w-0">
              <Card className="h-full overflow-hidden">
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
              </Card>
            </FadeIn>
          </div>

          <FadeIn delay={0.1}>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Monthly spending</CardTitle>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Last 6 months
                </span>
              </CardHeader>
              <CardContent>
                {monthlyQuery.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : monthlyQuery.data ? (
                  <MonthlyBar data={monthlyQuery.data.points} />
                ) : null}
              </CardContent>
            </Card>
          </FadeIn>
        </>
      ) : null}
    </div>
  );
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
