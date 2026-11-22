"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ClipboardPaste, FileDown, FileUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Spinner } from "@/components/feedback/loaders";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api";
import { downloadImportTemplate } from "@/lib/export";
import { formatCurrency } from "@/lib/format";
import { useBulkCreateExpenses, useCategories, useImportPreview } from "@/lib/queries";
import type { ImportRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_ROWS = 200;

interface Row {
  key: string;
  name: string;
  amount: string;
  category_id: number | null;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  description: string | null;
  /** Notes from the importer ("Unknown category …"); cleared once the row is edited. */
  warnings: string[];
}

type RowErrors = Partial<Record<"name" | "amount" | "category" | "date" | "time", true>>;

let seq = 0;
const nextKey = () => `row-${Date.now()}-${seq++}`;

function blankRow(): Row {
  const now = new Date();
  return {
    key: nextKey(),
    name: "",
    amount: "",
    category_id: null,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    description: null,
    warnings: [],
  };
}

function fromImport(r: ImportRow): Row {
  const base = blankRow();
  const [date, time] = r.spent_at ? r.spent_at.split("T") : [base.date, base.time];
  return {
    ...base,
    name: r.name,
    amount: r.amount ? String(Number(r.amount)) : "",
    category_id: r.category_id,
    date,
    time: time ?? base.time,
    description: r.description,
    warnings: r.warnings,
  };
}

const isBlank = (r: Row) => !r.name.trim() && !r.amount.trim();

function validate(r: Row): RowErrors {
  const e: RowErrors = {};
  if (!r.name.trim()) e.name = true;
  const n = Number(r.amount);
  if (!r.amount.trim() || !Number.isFinite(n) || n <= 0) e.amount = true;
  if (!r.category_id) e.category = true;
  if (!r.date) e.date = true;
  if (!/^\d{2}:\d{2}/.test(r.time)) e.time = true;
  return e;
}

/**
 * Bulk entry: a small spreadsheet-like grid. Type rows, paste cells straight
 * from Excel / Google Sheets, or import an .xlsx / .csv — every path lands in
 * the same grid so the user reviews before anything is saved (all-or-nothing).
 */
export function BulkExpenseForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: categories } = useCategories();
  const bulkCreate = useBulkCreateExpenses();
  const preview = useImportPreview();

  const [rows, setRows] = useState<Row[]>(() => [blankRow(), blankRow(), blankRow()]);
  const [submitted, setSubmitted] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filled = rows.filter((r) => !isBlank(r));
  const errorsByKey = new Map(filled.map((r) => [r.key, validate(r)]));
  const invalidCount = [...errorsByKey.values()].filter((e) => Object.keys(e).length).length;
  const total = filled.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, warnings: [] } : r)));

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    const row = blankRow();
    setRows((rs) => [...rs, row]);
    setFocusKey(row.key);
  };

  const removeRow = (key: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [blankRow()]));

  /** Keep what the user already typed, then append the imported rows. */
  const merge = (incoming: Row[]) => {
    setRows((rs) => {
      const kept = rs.filter((r) => !isBlank(r));
      const room = Math.max(0, MAX_ROWS - kept.length);
      if (incoming.length > room) toast.warning(`Only the first ${room} rows were added (max ${MAX_ROWS}).`);
      return [...kept, ...incoming.slice(0, room)];
    });
  };

  const importFile = async (file: File, source: "file" | "paste") => {
    try {
      const res = await preview.mutateAsync(file);
      merge(res.rows.map(fromImport));
      const flagged = res.rows.filter((r) => r.warnings.length).length;
      const what = source === "paste" ? "Pasted" : "Imported";
      toast.success(
        `${what} ${res.rows.length} ${res.rows.length === 1 ? "row" : "rows"}` +
          (flagged ? ` — ${flagged} need a look` : " — review and save"),
      );
      if (res.truncated) toast.warning(`Only the first ${MAX_ROWS} rows were read.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Paste from Excel / Sheets: tab-separated cells or several lines → rows.
  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!text.includes("\t") && lines.length < 2) return; // ordinary single-value paste
    e.preventDefault();
    void importFile(new File([text], "paste.tsv", { type: "text/tab-separated-values" }), "paste");
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-choosing the same file
    if (file) void importFile(file, "file");
  };

  const onTemplate = async () => {
    try {
      await downloadImportTemplate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submit = async () => {
    setSubmitted(true);
    if (!filled.length) {
      toast.error("Add at least one expense first.");
      return;
    }
    if (invalidCount) {
      toast.error(
        `Fix the highlighted ${invalidCount === 1 ? "row" : `${invalidCount} rows`} first.`,
      );
      return;
    }
    try {
      const res = await bulkCreate.mutateAsync(
        filled.map((r) => ({
          name: r.name.trim(),
          amount: String(Number(r.amount)),
          category_id: r.category_id as number,
          description: r.description?.trim() || null,
          spent_at: new Date(`${r.date}T${r.time}`).toISOString(),
        })),
      );
      toast.success(
        `Added ${res.created} ${res.created === 1 ? "expense" : "expenses"} · ${formatCurrency(res.total_amount)}`,
      );
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const busy = preview.isPending || bulkCreate.isPending;

  return (
    <div className="space-y-4" onPaste={onPaste}>
      {/* Import strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Copy rows from Excel or Google Sheets and <strong className="text-foreground">paste</strong>{" "}
            into any field — columns: Name, Amount, Category, Date, Time, Note.
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {preview.isPending ? <Spinner className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
            Import file
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onTemplate} title="Download an .xlsx template">
            <FileDown className="h-4 w-4" /> Template
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onFileChosen}
          />
        </div>
      </div>

      {/* Column labels (desktop) */}
      <div className="hidden grid-cols-[minmax(0,1.5fr)_6.5rem_minmax(0,1.1fr)_minmax(0,1fr)_7.25rem_2.25rem] gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:grid">
        <span>Name</span>
        <span>Amount (₨)</span>
        <span>Category</span>
        <span>Date</span>
        <span>Time</span>
        <span className="sr-only">Remove</span>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r, idx) => {
            const errs = submitted ? (errorsByKey.get(r.key) ?? {}) : {};
            return (
              <motion.div
                key={r.key}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.16 } }}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
                className="relative rounded-xl border border-border p-3 sm:rounded-none sm:border-0 sm:p-0"
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.5fr)_6.5rem_minmax(0,1.1fr)_minmax(0,1fr)_7.25rem_2.25rem]">
                  <Input
                    aria-label={`Row ${idx + 1} name`}
                    placeholder="e.g. Lunch at Kolachi"
                    value={r.name}
                    autoFocus={r.key === focusKey}
                    onChange={(e) => update(r.key, { name: e.target.value })}
                    aria-invalid={errs.name || undefined}
                    className="col-span-2 h-10 pr-10 aria-[invalid=true]:border-destructive sm:col-span-1 sm:pr-3.5"
                  />
                  <Input
                    aria-label={`Row ${idx + 1} amount`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="0"
                    value={r.amount}
                    onChange={(e) => update(r.key, { amount: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (idx === rows.length - 1) addRow();
                      }
                    }}
                    aria-invalid={errs.amount || undefined}
                    className="tnum h-10 aria-[invalid=true]:border-destructive"
                  />
                  <Select
                    value={r.category_id ? String(r.category_id) : undefined}
                    onValueChange={(v) => update(r.key, { category_id: Number(v) })}
                  >
                    <SelectTrigger
                      aria-label={`Row ${idx + 1} category`}
                      aria-invalid={errs.category || undefined}
                      className="h-10 aria-[invalid=true]:border-destructive"
                    >
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          <span className="flex min-w-0 items-center gap-2">
                            <CategoryIcon icon={c.icon} className="h-4 w-4 shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DatePicker
                    aria-label={`Row ${idx + 1} date`}
                    id={r.key}
                    value={r.date}
                    onChange={(d) => update(r.key, { date: d })}
                    aria-invalid={errs.date}
                    triggerClassName="h-10"
                  />
                  <Input
                    aria-label={`Row ${idx + 1} time`}
                    type="time"
                    value={r.time}
                    onChange={(e) => update(r.key, { time: e.target.value })}
                    aria-invalid={errs.time || undefined}
                    className="tnum h-10 px-3 aria-[invalid=true]:border-destructive"
                  />
                  <motion.button
                    type="button"
                    aria-label={`Remove row ${idx + 1}`}
                    onClick={() => removeRow(r.key)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: "spring", stiffness: 600, damping: 26 }}
                    className="absolute right-4 top-[1.15rem] flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring sm:static sm:h-10 sm:w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                </div>

                <AnimatePresence initial={false}>
                  {r.warnings.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-1.5 overflow-hidden pt-1.5 text-xs text-amber-600 dark:text-amber-400"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {r.warnings.join(" · ")}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= MAX_ROWS}
        className="text-muted-foreground"
      >
        <Plus className="h-4 w-4" /> Add row
      </Button>

      {/* Footer: running summary + save */}
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="tnum text-sm text-muted-foreground">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={filled.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="inline-block font-semibold text-foreground"
            >
              {filled.length}
            </motion.span>
          </AnimatePresence>{" "}
          {filled.length === 1 ? "expense" : "expenses"} ·{" "}
          <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          {submitted && invalidCount > 0 && (
            <span className="ml-2 text-destructive">
              · {invalidCount} {invalidCount === 1 ? "row needs" : "rows need"} fixing
            </span>
          )}
        </p>
        <Button
          type="button"
          variant="brand"
          size="lg"
          onClick={submit}
          disabled={busy || filled.length === 0}
          className={cn("w-full sm:w-auto")}
        >
          {bulkCreate.isPending && <Spinner className="h-4 w-4" />}
          {filled.length > 1 ? `Add ${filled.length} expenses` : "Add expense"}
        </Button>
      </div>
    </div>
  );
}
