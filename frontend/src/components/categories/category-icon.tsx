import {
  Clapperboard,
  Plane,
  Shapes,
  Utensils,
  Zap,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Custom hookah glyph in Lucide's flat, monochrome line style (currentColor). */
function ShishaIcon({ className, strokeWidth = 2, ...props }: LucideProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 3v6" />
      <path d="M12 9c-2.5 0-4 1.6-4 4.5S9.8 21 12 21s4-4.6 4-7.5S14.5 9 12 9Z" />
      <path d="M12 4h4a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3" />
      <path d="M9 21h6" />
      <circle cx="6.5" cy="6" r="1" />
    </svg>
  );
}

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  food: Utensils,
  utility: Zap,
  shisha: ShishaIcon,
  entertainment: Clapperboard,
  travel: Plane,
  misc: Shapes,
};

interface CategoryIconProps {
  icon: string;
  className?: string;
}

export function CategoryIcon({ icon, className }: CategoryIconProps) {
  const Icon = ICONS[icon] ?? Shapes;
  return <Icon className={cn("h-5 w-5", className)} aria-hidden />;
}

/** Small rounded tile holding a category icon — used in lists and cards. */
export function CategoryBadge({
  icon,
  className,
  iconClassName,
}: {
  icon: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <CategoryIcon icon={icon} className={cn("h-5 w-5", iconClassName)} />
    </span>
  );
}
