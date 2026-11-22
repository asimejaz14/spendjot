import type { Metadata } from "next";

// Tab title: "Spend Jot - Log in" (template lives in the root layout).
export const metadata: Metadata = { title: "Log in" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
