"use client";

import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import type { DailyPoint } from "@/lib/types";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DailyPoint & { value: number | null } }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (point.total === null) return null; // future day — no data
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-glow">
      <p className="font-medium">{format(new Date(point.date), "d MMM")}</p>
      <p className="tnum font-semibold text-primary">{formatCurrency(point.total)}</p>
      <p className="text-xs text-muted-foreground">
        {point.count} {point.count === 1 ? "expense" : "expenses"}
      </p>
    </div>
  );
}

/** Animated area/line of daily spending across the current month (day 1 → end). */
export function DailyLine({ data }: { data: DailyPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    value: d.total === null ? null : Number(d.total),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            {/* soft violet wash under the line */}
            <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
            {/* brand gradient stroke */}
            <linearGradient id="dailyStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.35, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            connectNulls={false}
            stroke="url(#dailyStroke)"
            strokeWidth={2.5}
            fill="url(#dailyFill)"
            dot={false}
            activeDot={{ r: 5, fill: "#7C3AED", stroke: "#fff", strokeWidth: 2 }}
            animationBegin={150}
            animationDuration={1100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
