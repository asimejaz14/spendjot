"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { motion, type Variants } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "group flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-sm",
      "transition-[border-color,box-shadow,transform] duration-200 hover:border-foreground/25 active:scale-[0.99] data-[state=open]:border-foreground/30",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "[&>span]:line-clamp-1 [&>span]:min-w-0 [&>span]:text-left data-[placeholder]:text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      {/* Chevron flips while open (CSS: Radix toggles data-state on the trigger). */}
      <ChevronDown className="h-4 w-4 shrink-0 opacity-60 transition-transform duration-300 ease-out-strong group-data-[state=open]:rotate-180" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

// Panel springs out of the trigger; options cascade in just behind it.
const panelVariants: Variants = {
  closed: { opacity: 0, scale: 0.95, y: -6 },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 520,
      damping: 34,
      staggerChildren: 0.018,
      delayChildren: 0.02,
    },
  },
};

const optionVariants: Variants = {
  closed: { opacity: 0, y: -4 },
  open: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 520, damping: 32 } },
};

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      // Radix positions this layer; the Motion panel inside carries the visuals
      // so its transform never fights Radix's positioning transform.
      className={cn(
        "relative z-50 flex max-h-72 min-w-[8rem] flex-col",
        position === "popper" && "data-[side=bottom]:translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <motion.div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-glow origin-[var(--radix-select-content-transform-origin)]"
        variants={panelVariants}
        initial="closed"
        animate="open"
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1.5",
            position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </motion.div>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} asChild {...props}>
    <motion.div
      variants={optionVariants}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground data-[state=checked]:font-medium",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
    >
      <span className="absolute right-3 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator asChild>
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 20 }}
          >
            <Check className="h-4 w-4" />
          </motion.span>
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </motion.div>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
