"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExpenseDialog } from "@/components/expense/expense-dialog";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Floating add-expense button (icon-only on mobile) */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <ExpenseDialog
          trigger={
            <button
              aria-label="Add expense"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-glow outline-none ring-offset-background transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-6 w-6" />
            </button>
          }
        />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-background/90 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-brand"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <motion.span
                animate={active ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
              >
                <Icon className="h-5 w-5" />
              </motion.span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
