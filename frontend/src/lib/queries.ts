"use client";

import {
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
  summary: ["dashboard", "summary"] as const,
  monthly: (months: number) => ["dashboard", "monthly", months] as const,
  daily: ["dashboard", "daily"] as const,
  apiTokens: ["api-tokens"] as const,
  expenses: (params: ExpenseQueryParams) => ["expenses", params] as const,
  budgets: ["budgets"] as const,
  budgetProgress: ["budgets", "progress"] as const,
  insights: ["dashboard", "insights"] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
    staleTime: 1000 * 60 * 60,
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: async () =>
      (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });
}

export function useInsights() {
  return useQuery({
    queryKey: queryKeys.insights,
    queryFn: async () => (await api.get<Insights>("/dashboard/insights")).data,
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

export function useDailySeries() {
  return useQuery({
    queryKey: queryKeys.daily,
    queryFn: async () => (await api.get<DailySeries>("/dashboard/daily")).data,
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

export function useBudgetProgress() {
  return useQuery({
    queryKey: queryKeys.budgetProgress,
    queryFn: async () =>
      (await api.get<BudgetProgress>("/budgets/progress")).data,
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
