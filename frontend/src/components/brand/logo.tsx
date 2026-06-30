"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** The gradient "J" app mark (squircle). */
export function LogoIcon({ className }: { className?: string }) {
  // Unique per instance: the logo renders in several places at once (sidebar +
  // mobile header). A shared gradient id would let a hidden (display:none)
  // instance "win" the url(#id) lookup, leaving the visible mark unpainted.
  const gradId = `sjGrad-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 86 86"
      className={className}
      role="img"
      aria-label="Spend Jot"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="0.5" stopColor="#6D5DEF" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="80" height="80" rx="22" fill={`url(#${gradId})`} />
      <g transform="translate(0 2)">
        <path
          d="M56 33 L56 60 Q56 73.5 43 73.5 Q31.5 73.5 30 59.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="12.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="56" cy="17.5" r="8.6" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/** Icon + "Spend Jot" wordmark. */
export function Logo({
  className,
  iconClassName,
  showWordmark = true,
}: {
  className?: string;
  iconClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIcon className={cn("h-9 w-9", iconClassName)} />
      {showWordmark && (
        <span className="font-display text-xl font-bold tracking-tight">
          Spend<span className="text-primary">Jot</span>
        </span>
      )}
    </span>
  );
}
