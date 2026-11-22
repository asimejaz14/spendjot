"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Slot } from "@radix-ui/react-slot";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useControllableOpen } from "@/lib/use-controllable-open";
import { cn } from "@/lib/utils";

/** Lets the content know whether to stay mounted for its exit animation. */
const OpenContext = React.createContext(false);

function DropdownMenu({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) {
  const [open, setOpen] = useControllableOpen(openProp, defaultOpen, onOpenChange);
  return (
    <OpenContext.Provider value={open}>
      <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen} {...props} />
    </OpenContext.Provider>
  );
}

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

// Pops out of the trigger with a snappy spring, items cascade in; exits fast.
const menuVariants: Variants = {
  closed: { opacity: 0, scale: 0.94, y: -6, transition: { duration: 0.12, ease: "easeIn" } },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 520, damping: 32, staggerChildren: 0.035 },
  },
};

const itemVariants: Variants = {
  closed: { opacity: 0, x: -6 },
  open: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } },
};

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => {
  const open = React.useContext(OpenContext);
  return (
    <AnimatePresence>
      {open && (
        <DropdownMenuPrimitive.Portal forceMount>
          <DropdownMenuPrimitive.Content forceMount asChild ref={ref} sideOffset={sideOffset} {...props}>
            <motion.div
              className={cn(
                "z-50 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-glow",
                // Scale from the trigger, not the menu's centre (origin-correctness).
                "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
                className,
              )}
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              {children}
            </motion.div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      )}
    </AnimatePresence>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

// `asChild` items (e.g. a <Link>) animate through a Motion-wrapped Slot so the
// link itself stays the focusable, navigable element.
const MotionSlot = motion.create(Slot);

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, children, asChild, ...props }, ref) => {
  const Inner = asChild ? MotionSlot : motion.div;
  return (
  <DropdownMenuPrimitive.Item ref={ref} asChild {...props}>
    <Inner
      variants={itemVariants}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground [&>svg]:transition-transform focus:[&>svg]:scale-110",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
    >
      {children}
    </Inner>
  </DropdownMenuPrimitive.Item>
  );
});
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-border", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
