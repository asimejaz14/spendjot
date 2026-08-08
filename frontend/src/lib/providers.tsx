"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {/* reducedMotion="user" makes every framer-motion animation honour the
            OS "reduce motion" setting — it drops transform/layout movement and
            keeps opacity. (The CSS guard in globals.css only covers CSS
            animations, not framer-motion's JS-driven ones.) */}
        <MotionConfig reducedMotion="user">
          <AuthProvider>{children}</AuthProvider>
        </MotionConfig>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            className: "font-sans rounded-2xl border border-border shadow-glow",
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
