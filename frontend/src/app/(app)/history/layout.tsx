import type { Metadata } from "next";

// Tab title: "Spend Jot - History" (template lives in the root layout).
export const metadata: Metadata = { title: "History" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
