"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MonthlyBar } from "@/components/dashboard/monthly-bar";
import { ExpenseList } from "@/components/expense/expense-list";
import { EmptyState } from "@/components/feedback/empty-state";
import { FadeIn } from "@/components/feedback/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import {
  useCategories,
  useExpenses,
  useMonthlySeries,
  type ExpenseQueryParams,
} from "@/lib/queries";

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const { data: categories } = useCategories();
  const monthlyQuery = useMonthlySeries(12);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter change resets to page 1.
  useEffect(() => setPage(1), [search, categoryId, startDate, endDate]);

  const params: ExpenseQueryParams = useMemo(() => {
    const p: ExpenseQueryParams = { page, page_size: PAGE_SIZE };
    if (search) p.search = search;
    if (categoryId !== "all") p.category_id = Number(categoryId);
    if (startDate) p.start = new Date(`${startDate}T00:00:00`).toISOString();
    if (endDate) p.end = new Date(`${endDate}T23:59:59`).toISOString();
    return p;
  }, [page, search, categoryId, startDate, endDate]);

  const { data, isLoading, isError } = useExpenses(params);

  const hasFilters =
    Boolean(search) || categoryId !== "all" || Boolean(startDate) || Boolean(endDate);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategoryId("all");
    setStartDate("");
    setEndDate("");
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">
          Browse and search everything you&apos;ve spent.
        </p>
      </header>

      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle>Spending by month</CardTitle>
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

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </CardTitle>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {data ? `${data.total} ${data.total === 1 ? "expense" : "expenses"}` : "Results"}
          </CardTitle>
          {data && data.total > 0 && (
            <span className="tnum text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatCurrency(data.total_amount)}</span>
            </span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              We couldn&apos;t load your expenses. Please try again.
            </p>
          ) : data && data.items.length > 0 ? (
            <>
              <ExpenseList expenses={data.items} />
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<Search className="h-7 w-7" />}
              title={hasFilters ? "No matching expenses" : "No expenses yet"}
              description={
                hasFilters
                  ? "Try adjusting your filters or clearing them."
                  : "Once you add expenses, they'll show up here."
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
