"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CategoryIcon } from "@/components/categories/category-icon";
import { formatCurrency } from "@/lib/format";
import type { CategoryBreakdown } from "@/lib/types";

export const CHART_COLORS = [
  "#7C3AED",
  "#6D5DEF",
  "#4F46E5",
  "#A78BFA",
  "#8B5CF6",
  "#C4B5FD",
];

export function CategoryDonut({ data }: { data: CategoryBreakdown[] }) {
  const total = data.reduce((sum, c) => sum + Number(c.total), 0);
  const chartData = data.map((c) => ({ ...c, value: Number(c.total) }));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={84}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((entry, i) => (
                <Cell key={entry.category_id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="tnum font-display text-base font-bold">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((c, i) => {
          const pct = total > 0 ? Math.round((Number(c.total) / total) * 100) : 0;
          return (
            <li key={c.category_id} className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                <CategoryIcon icon={c.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
              <span className="tnum text-sm text-muted-foreground">{pct}%</span>
              <span className="tnum w-24 text-right text-sm font-semibold">
                {formatCurrency(c.total)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
