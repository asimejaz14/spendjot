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

export interface Budget {
  id: string;
  category_id: number | null; // null = overall monthly budget
  amount: string;
}

export interface BudgetLine {
  category_id: number;
  slug: string | null;
  name: string;
  icon: string | null;
  budget: string;
  spent: string;
  remaining: string; // budget - spent (negative once over)
  pct: number; // spent / budget
}

export interface OverallProgress {
  budget: string | null;
  spent: string;
  remaining: string | null;
  pct: number | null;
  safe_per_day: string | null;
  projected_month_end: string;
  on_track: boolean | null;
}

export interface BudgetProgress {
  month_label: string;
  day_of_month: number;
  days_in_month: number;
  days_left: number;
  overall: OverallProgress;
  categories: BudgetLine[];
}

export interface ApiErrorShape {
  error: { code: string; message: string };
}
