"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Spinner } from "@/components/feedback/loaders";
import { getErrorMessage } from "@/lib/api";
import { toDateTimeLocal } from "@/lib/format";
import {
  useCategories,
  useCreateExpense,
  useParseExpense,
  useUpdateExpense,
} from "@/lib/queries";
import type { Expense } from "@/lib/types";
import { expenseSchema, type ExpenseValues } from "@/lib/validators";

interface ExpenseFormProps {
  expense?: Expense;
  onSuccess: () => void;
}

export function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEdit = Boolean(expense);

  const parseExpense = useParseExpense();
  const [quickText, setQuickText] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: expense?.name ?? "",
      amount: expense?.amount ?? "",
      category_id: expense?.category.id ?? (undefined as unknown as number),
      description: expense?.description ?? "",
      spent_at: expense
        ? toDateTimeLocal(new Date(expense.spent_at))
        : toDateTimeLocal(new Date()),
    },
  });

  const onSubmit = async (values: ExpenseValues) => {
    const payload = {
      name: values.name.trim(),
      amount: String(values.amount),
      category_id: Number(values.category_id),
      description: values.description?.trim() || null,
      spent_at: new Date(values.spent_at).toISOString(),
    };
    try {
      if (isEdit && expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...payload });
        toast.success("Expense updated.");
      } else {
        await createExpense.mutateAsync(payload);
        toast.success("Expense added.");
      }
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitting = createExpense.isPending || updateExpense.isPending;

  const handleQuickParse = async () => {
    const text = quickText.trim();
    if (!text) return;
    try {
      const draft = await parseExpense.mutateAsync(text);
      setValue("name", draft.name, { shouldValidate: true });
      if (draft.amount) setValue("amount", String(Number(draft.amount)), { shouldValidate: true });
      if (draft.category_id)
        setValue("category_id", draft.category_id, { shouldValidate: true });
      setValue("spent_at", toDateTimeLocal(new Date(draft.spent_at)), { shouldValidate: true });
      toast.success("Filled in below — review and add.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {!isEdit && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-secondary/40 p-3">
          <Label htmlFor="quick-add" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick add — just type it
          </Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="quick-add"
              placeholder="e.g. shisha 500 yesterday"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickParse();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleQuickParse}
              disabled={parseExpense.isPending || !quickText.trim()}
            >
              {parseExpense.isPending ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              Fill
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">What did you spend on?</Label>
        <Input id="name" placeholder="e.g. Lunch at Kolachi" autoFocus {...register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₨)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step="1"
            placeholder="0"
            className="tnum"
            {...register("amount")}
          />
          {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={loadingCategories}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCategories ? "Loading…" : "Choose"} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon icon={c.icon} className="h-4 w-4" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category_id && <FieldError>{errors.category_id.message}</FieldError>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="spent_at">When?</Label>
        <Input id="spent_at" type="datetime-local" className="tnum" {...register("spent_at")} />
        {errors.spent_at && <FieldError>{errors.spent_at.message}</FieldError>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Note <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Any extra detail…"
          rows={2}
          {...register("description")}
        />
        {errors.description && <FieldError>{errors.description.message}</FieldError>}
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Spinner className="h-4 w-4" />}
        {isEdit ? "Save changes" : "Add expense"}
      </Button>
      </form>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-destructive">{children}</p>;
}
