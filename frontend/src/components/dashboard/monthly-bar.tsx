"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import type { MonthlyPoint } from "@/lib/types";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyPoint }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-glow">
      <p className="font-medium">{point.label}</p>
      <p className="tnum font-semibold text-primary">{formatCurrency(point.total)}</p>
      <p className="text-xs text-muted-foreground">
        {point.count} {point.count === 1 ? "expense" : "expenses"}
      </p>
    </div>
  );
}

export function MonthlyBar({ data }: { data: MonthlyPoint[] }) {
  const chartData = data.map((d) => ({ ...d, value: Number(d.total) }));
  const maxValue = Math.max(...chartData.map((d) => d.value), 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
            {chartData.map((entry) => (
              <Cell
                key={entry.month}
                fill={entry.value === maxValue && maxValue > 0 ? "url(#barGrad)" : "#A78BFA"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
