import type { Metadata } from "next";

// Tab title: "Spend Jot - Settings" (template lives in the root layout).
export const metadata: Metadata = { title: "Settings" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
