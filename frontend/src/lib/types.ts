// Shapes mirroring the FastAPI responses.

export type ThemePref = "light" | "dark" | "system";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  display_name: string | null;
  theme: ThemePref;
  currency: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: string; // 2-decimal string from the API
  description: string | null;
  spent_at: string; // ISO
  category: Category;
  created_at: string;
}

export interface ExpenseListResponse {
  items: Expense[];
  total: number;
  page: number;
  page_size: number;
  total_amount: string;
}

export interface CategoryBreakdown {
  category_id: number;
  slug: string;
  name: string;
  icon: string;
  total: string;
  count: number;
}

export interface DashboardSummary {
  month_total: string;
  month_label: string;
  expense_count: number;
  daily_average: string;
  top_category: CategoryBreakdown | null;
  by_category: CategoryBreakdown[];
  recent: Expense[];
}

export interface MonthlyPoint {
  month: string;
  label: string;
  total: string;
  count: number;
}

export interface MonthlySeries {
  points: MonthlyPoint[];
}

export interface ApiErrorShape {
  error: { code: string; message: string };
}
