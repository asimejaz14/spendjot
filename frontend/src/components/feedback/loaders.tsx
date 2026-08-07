import { Loader2 } from "lucide-react";
import { LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin", className)} aria-hidden />;
}

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-muted-foreground">
      <div className="relative">
        {/* soft halo */}
        <span className="absolute inset-0 -z-10 rounded-[26px] bg-brand blur-2xl opacity-40 animate-pulse-glow" />
        <div className="animate-float">
          <LogoIcon className="h-14 w-14 drop-shadow-lg" />
        </div>
      </div>
      <p className="animate-pulse text-sm font-medium">{label}</p>
    </div>
  );
}
