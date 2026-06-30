"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo, LogoIcon } from "@/components/brand/logo";
import { FullPageLoader } from "@/components/feedback/loaders";
import { useAuth } from "@/lib/auth-context";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) return <FullPageLoader />;

  return (
    <div className="flex min-h-screen">
      {/* Brand panel (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="relative flex items-center gap-3">
          <LogoIcon className="h-11 w-11 drop-shadow" />
          <span className="font-display text-2xl font-bold">Spend Jot</span>
        </div>
        <div className="relative space-y-4">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Jot expenses
            <br />
            in seconds.
          </h1>
          <p className="max-w-sm text-white/80">
            Track where your money goes, see your month at a glance, and stay on top of
            your spending — beautifully simple.
          </p>
        </div>
        <p className="relative text-sm text-white/60">
          Your data stays yours. Secure 6-digit PIN access.
        </p>
      </div>

      {/* Form area */}
      <div className="bg-aurora relative flex w-full flex-col justify-center px-6 py-10 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo iconClassName="h-10 w-10" className="text-2xl" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
