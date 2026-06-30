import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

const PKR = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Format an amount string/number as PKR, e.g. "₨ 1,250". */
export function formatCurrency(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "₨ 0";
  return `₨ ${PKR.format(Math.round(value))}`;
}

/** Compact form for chart axes: ₨ 12.5k */
export function formatCurrencyCompact(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "₨ 0";
  if (Math.abs(value) >= 1000) return `₨ ${(value / 1000).toFixed(1)}k`;
  return `₨ ${Math.round(value)}`;
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "d MMM yyyy, h:mm a");
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy");
}

/** Friendly relative label used in lists: "Today", "Yesterday" or a date. */
export function friendlyDay(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM yyyy");
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

/** Value for an <input type="datetime-local"> reflecting `date` in local time. */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
