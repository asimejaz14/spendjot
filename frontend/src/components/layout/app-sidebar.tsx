"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/components/expense/expense-dialog";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card/60 px-4 py-6 backdrop-blur md:flex">
      <Link href="/dashboard" className="px-2">
        <Logo />
      </Link>

      <ExpenseDialog
        trigger={
          <Button variant="brand" size="lg" className="mt-8 w-full">
            <Plus className="h-5 w-5" /> Add expense
          </Button>
        }
      />

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <UserMenu align="start" />
        <ThemeToggle />
      </div>
    </aside>
  );
}
