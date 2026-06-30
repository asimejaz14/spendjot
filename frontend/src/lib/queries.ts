"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  Category,
  DashboardSummary,
  ExpenseListResponse,
  MonthlySeries,
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
  expenses: (params: ExpenseQueryParams) => ["expenses", params] as const,
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

export function useMonthlySeries(months = 6) {
  return useQuery({
    queryKey: queryKeys.monthly(months),
    queryFn: async () =>
      (await api.get<MonthlySeries>("/dashboard/monthly", { params: { months } }))
        .data,
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
