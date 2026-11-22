import type { Metadata } from "next";

// Tab title: "Spend Jot - Sign up" (template lives in the root layout).
export const metadata: Metadata = { title: "Sign up" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
