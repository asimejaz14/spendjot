"use client";

import { format, subMonths } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Sentinel for "the current month" (sent to the API as no `month` param). */
export const CURRENT_MONTH = "current";

/** How many months back the picker offers (including the current one). */
const MONTHS_BACK = 24;

/** Convert a picker value into the API's `month` param ("YYYY-MM" | undefined). */
export function toMonthParam(value: string): string | undefined {
  return value === CURRENT_MONTH ? undefined : value;
}

export function MonthFilter({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const options = useMemo(() => {
    const now = new Date();
    return Array.from({ length: MONTHS_BACK }, (_, i) => {
      const d = subMonths(now, i);
      return {
        value: i === 0 ? CURRENT_MONTH : format(d, "yyyy-MM"),
        label: i === 0 ? `This month · ${format(d, "MMM")}` : format(d, "MMMM yyyy"),
      };
    });
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Choose month"
        className={cn(
          "h-10 w-auto min-w-[11rem] gap-2 rounded-xl bg-card shadow-soft [&>span]:flex-1 [&>span]:text-left",
          className,
        )}
      >
        {/* Icon is an <svg>, not a <span>, so the trigger's line-clamp rule skips it. */}
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
