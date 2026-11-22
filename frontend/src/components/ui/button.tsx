"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * Hover styles use the custom `hover-on:` variant (= :not(:disabled):hover, see
 * tailwind.config.ts) so a disabled button keeps a "not-allowed" cursor without
 * also lighting up. Lift / press are Motion springs below, not CSS transforms,
 * so they can be interrupted mid-gesture without snapping.
 */
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,filter] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover-on:brightness-110",
        brand:
          "relative overflow-hidden bg-brand text-white shadow-glow hover-on:brightness-110 hover-on:shadow-glow-lg before:pointer-events-none before:absolute before:inset-y-0 before:-left-full before:w-1/2 before:-skew-x-12 before:bg-sheen before:opacity-60 before:transition-transform before:duration-700 before:ease-out hover-on:before:translate-x-[360%]",
        secondary: "bg-secondary text-secondary-foreground hover-on:bg-secondary/80",
        outline:
          "border border-input bg-background hover-on:bg-accent hover-on:text-accent-foreground",
        ghost: "hover-on:bg-accent hover-on:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover-on:brightness-110",
        link: "text-primary underline-offset-4 hover-on:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

// Raised (filled) variants lift on hover; flat ones only press.
const LIFTING = new Set(["default", "brand", "destructive"]);
const press = { type: "spring", stiffness: 520, damping: 28 } as const;

const MotionSlot = motion.create(Slot);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, ...props }, ref) => {
    // Motion's own handler types (onDrag, onAnimationStart…) differ from the DOM
    // ones; none are passed through here, so the cast is safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Comp: any = asChild ? MotionSlot : motion.button;
    const lifts = LIFTING.has(variant ?? "default") && variant !== "link";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : lifts ? { y: -2 } : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.96, y: 0 }}
        transition={press}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
