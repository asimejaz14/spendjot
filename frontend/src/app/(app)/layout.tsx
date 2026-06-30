"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { FullPageLoader } from "@/components/feedback/loaders";
import { useAuth } from "@/lib/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();
  const appliedTheme = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Apply the user's saved theme preference once after they load.
  useEffect(() => {
    if (user && !appliedTheme.current) {
      appliedTheme.current = true;
      setTheme(user.theme);
    }
  }, [user, setTheme]);

  if (loading || !user) {
    return <FullPageLoader label="Getting things ready…" />;
  }

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className="md:pl-64">
        <MobileHeader />
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:px-8 md:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
