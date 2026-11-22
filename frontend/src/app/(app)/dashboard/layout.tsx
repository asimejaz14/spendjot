import type { Metadata } from "next";

// Tab title: "Spend Jot - Dashboard" (template lives in the root layout).
export const metadata: Metadata = { title: "Dashboard" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
