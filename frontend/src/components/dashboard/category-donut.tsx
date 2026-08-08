"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import { CategoryIcon } from "@/components/categories/category-icon";
import { AnimatedNumber } from "@/components/feedback/animated-number";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryBreakdown } from "@/lib/types";

export const CHART_COLORS = [
  "#7C3AED",
  "#6D5DEF",
  "#4F46E5",
  "#A78BFA",
  "#8B5CF6",
  "#C4B5FD",
];

// The hovered slice grows slightly and casts a soft shadow.
function ActiveSlice(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g style={{ filter: `drop-shadow(0 6px 14px ${fill}66)` }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={4}
      />
    </g>
  );
}

export function CategoryDonut({ data }: { data: CategoryBreakdown[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((sum, c) => sum + Number(c.total), 0);
  const chartData = data.map((c) => ({ ...c, value: Number(c.total) }));

  // Center readout follows the hovered slice, else shows the grand total.
  const focus = active !== null ? data[active] : null;
  const focusValue = focus ? Number(focus.total) : total;
  const focusLabel = focus ? focus.name : "Total";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
              activeIndex={active ?? undefined}
              activeShape={ActiveSlice}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              animationBegin={120}
              animationDuration={900}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={entry.category_id}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  className="cursor-pointer transition-opacity"
                  opacity={active === null || active === i ? 1 : 0.4}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="max-w-[6rem] truncate text-xs text-muted-foreground">
            {focusLabel}
          </span>
          <AnimatedNumber
            value={focusValue}
            duration={0.6}
            format={(v) => formatCurrency(v)}
            className="tnum font-display text-base font-bold"
          />
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((c, i) => {
          const pct = total > 0 ? Math.round((Number(c.total) / total) * 100) : 0;
          const color = CHART_COLORS[i % CHART_COLORS.length];
          const dim = active !== null && active !== i;
          return (
            <li
              key={c.category_id}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-1 py-0.5 transition-opacity",
                dim && "opacity-45",
              )}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white transition-transform group-hover:scale-110"
                style={{ backgroundColor: color }}
              >
                <CategoryIcon icon={c.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">{c.name}</span>
                  <span className="tnum shrink-0 text-sm font-semibold">
                    {formatCurrency(c.total)}
                  </span>
                </div>
                {/* animated percentage bar — scaleX (GPU) rather than width (layout) */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full w-full rounded-full"
                    style={{ backgroundColor: color, transformOrigin: "left" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: pct / 100 }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.15 + i * 0.05 }}
                  />
                </div>
              </div>
              <span className="tnum w-9 shrink-0 text-right text-xs text-muted-foreground">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
