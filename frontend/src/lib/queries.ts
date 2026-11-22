"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  ApiToken,
  ApiTokenCreated,
  Budget,
  BudgetProgress,
  Category,
  DashboardSummary,
  ExpenseListResponse,
  Insights,
  DailySeries,
  MonthlySeries,
  ParsedExpense,
  User,
} from "./types";

export interface ExpenseQueryParams {
  page?: number;
  page_size?: number;
  start?: string;
  end?: string;
  category_id?: number;
  search?: string;
}

export const queryKeys = {
  categories: ["categories"] as const,
  summary: (month?: string) => ["dashboard", "summary", month ?? "current"] as const,
  monthly: (months: number) => ["dashboard", "monthly", months] as const,
  daily: (month?: string) => ["dashboard", "daily", month ?? "current"] as const,
  apiTokens: ["api-tokens"] as const,
  expenses: (params: ExpenseQueryParams) => ["expenses", params] as const,
  budgets: ["budgets"] as const,
  budgetProgress: (month?: string) => ["budgets", "progress", month ?? "current"] as const,
  insights: (month?: string) => ["dashboard", "insights", month ?? "current"] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
    staleTime: 1000 * 60 * 60,
  });
}

/** `month` is "YYYY-MM"; omit for the current month. */
const monthParams = (month?: string) => (month ? { month } : {});

export function useDashboardSummary(month?: string) {
  return useQuery({
    queryKey: queryKeys.summary(month),
    queryFn: async () =>
      (await api.get<DashboardSummary>("/dashboard/summary", { params: monthParams(month) }))
        .data,
    // Keep the previous month on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function useInsights(month?: string) {
  return useQuery({
    queryKey: queryKeys.insights(month),
    queryFn: async () =>
      (await api.get<Insights>("/dashboard/insights", { params: monthParams(month) })).data,
    placeholderData: keepPreviousData,
  });
}

export function useMonthlySeries(months = 6) {
  return useQuery({
    queryKey: queryKeys.monthly(months),
    queryFn: async () =>
      (await api.get<MonthlySeries>("/dashboard/monthly", { params: { months } }))
        .data,
  });
}

export function useDailySeries(month?: string) {
  return useQuery({
    queryKey: queryKeys.daily(month),
    queryFn: async () =>
      (await api.get<DailySeries>("/dashboard/daily", { params: monthParams(month) })).data,
    placeholderData: keepPreviousData,
  });
}

export function useApiTokens() {
  return useQuery({
    queryKey: queryKeys.apiTokens,
    queryFn: async () => (await api.get<ApiToken[]>("/tokens")).data,
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await api.post<ApiTokenCreated>("/tokens", { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.apiTokens }),
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tokens/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.apiTokens }),
  });
}

export function useExpenses(params: ExpenseQueryParams) {
  return useQuery({
    queryKey: queryKeys.expenses(params),
    queryFn: async () =>
      (await api.get<ExpenseListResponse>("/expenses", { params })).data,
  });
}

interface ExpensePayload {
  name: string;
  amount: string;
  category_id: number;
  description?: string | null;
  spent_at?: string | null;
}

function useInvalidateExpenses() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useParseExpense() {
  return useMutation({
    mutationFn: async (text: string) =>
      (await api.post<ParsedExpense>("/expenses/parse", { text })).data,
  });
}

export function useCreateExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async (payload: ExpensePayload) =>
      (await api.post("/expenses", payload)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async ({ id, ...payload }: ExpensePayload & { id: string }) =>
      (await api.patch(`/expenses/${id}`, payload)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/expenses/${id}`)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<User, "display_name" | "theme" | "currency">>) =>
      (await api.patch<User>("/me", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });
}

export function useChangePin() {
  return useMutation({
    mutationFn: async (payload: { current_pin: string; new_pin: string }) =>
      (await api.post("/auth/change-pin", payload)).data,
  });
}

export function useForgotPin() {
  return useMutation({
    mutationFn: async (email: string) =>
      (await api.post("/auth/forgot-pin", { email })).data,
  });
}

export function useResetPin() {
  return useMutation({
    mutationFn: async (payload: { email: string; code: string; new_pin: string }) =>
      (await api.post<{ access_token: string }>("/auth/reset-pin", payload)).data,
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: async () => (await api.get<Budget[]>("/budgets")).data,
  });
}

export function useBudgetProgress(month?: string) {
  return useQuery({
    queryKey: queryKeys.budgetProgress(month),
    queryFn: async () =>
      (await api.get<BudgetProgress>("/budgets/progress", { params: monthParams(month) })).data,
    placeholderData: keepPreviousData,
  });
}

function useInvalidateBudgets() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["budgets"] });
}

export function useSetBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async (payload: { category_id: number | null; amount: string }) =>
      (await api.put<Budget>("/budgets", payload)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async (category_id: number | null) =>
      (
        await api.delete("/budgets", {
          params: category_id === null ? {} : { category_id },
        })
      ).data,
    onSuccess: invalidate,
  });
}
