"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
      <Link href="/dashboard" aria-label="Spend Jot home">
        <Logo iconClassName="h-8 w-8" />
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
