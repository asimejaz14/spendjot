"use client";

import { motion } from "framer-motion";
import { BarChart3, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo, LogoIcon } from "@/components/brand/logo";
import { FullPageLoader } from "@/components/feedback/loaders";
import { useAuth } from "@/lib/auth-context";

const FEATURES = [
  { icon: Zap, title: "Jot in seconds", body: "Add an expense faster than you can find your wallet." },
  { icon: BarChart3, title: "See it clearly", body: "Charts and insights that make your month obvious." },
  { icon: ShieldCheck, title: "Yours alone", body: "Private by design, secured with a 6-digit PIN." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) return <FullPageLoader />;

  return (
    <div className="flex min-h-screen">
      {/* Brand panel (desktop) — living gradient with drifting aurora orbs. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-mesh bg-[length:200%_200%] p-12 text-white animate-gradient-pan lg:flex">
        <div className="aurora-field">
          <span className="aurora-blob left-[-10%] top-[8%] h-72 w-72 animate-float" style={{ background: "#A78BFA" }} />
          <span className="aurora-blob right-[-8%] top-[30%] h-64 w-64 animate-float-slow" style={{ background: "#4F46E5" }} />
          <span className="aurora-blob bottom-[-6%] left-[25%] h-72 w-72 animate-float" style={{ background: "#C4B5FD", animationDelay: "1.5s" }} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_20%,rgba(255,255,255,0.22),transparent_60%)]" />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative flex items-center gap-3"
        >
          <LogoIcon className="h-11 w-11 drop-shadow" />
          <span className="font-display text-2xl font-bold">Spend Jot</span>
        </motion.div>

        <div className="relative space-y-8">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            className="font-display text-[2.75rem] font-bold leading-[1.05]"
          >
            Jot expenses
            <br />
            in seconds.
          </motion.h1>

          <motion.ul
            className="space-y-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <motion.li
                  key={f.title}
                  variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0 } }}
                  transition={{ type: "spring", stiffness: 240, damping: 22 }}
                  className="flex items-start gap-3.5"
                >
                  <span className="ring-sheen flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-sm text-white/75">{f.body}</p>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>

        <p className="relative text-sm text-white/60">
          Your data stays yours. Secure 6-digit PIN access.
        </p>
      </div>

      {/* Form area */}
      <div className="bg-aurora relative flex w-full flex-col justify-center overflow-hidden px-6 py-10 lg:w-1/2">
        <div className="aurora-field lg:hidden">
          <span className="aurora-blob left-[-20%] top-[-10%] h-64 w-64 animate-float" style={{ background: "rgba(167,139,250,0.5)" }} />
          <span className="aurora-blob bottom-[-10%] right-[-15%] h-56 w-56 animate-float-slow" style={{ background: "rgba(79,70,229,0.4)" }} />
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo iconClassName="h-10 w-10" className="text-2xl" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
