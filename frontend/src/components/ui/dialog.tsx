"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useControllableOpen, useMediaQuery } from "@/lib/use-controllable-open";
import { cn } from "@/lib/utils";

/** Lets the content stay mounted while Motion plays its exit animation. */
const DialogOpenContext = React.createContext(false);

function Dialog({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  const [open, setOpen] = useControllableOpen(openProp, defaultOpen, onOpenChange);
  return (
    <DialogOpenContext.Provider value={open}>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen} {...props} />
    </DialogOpenContext.Provider>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

// Sheet-like spring: settles quickly with no visible bounce.
const sheetSpring = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

/**
 * Responsive content: a bottom sheet that slides up on mobile, a centered
 * modal that scales in on >= sm. Both animate out before unmounting.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const open = React.useContext(DialogOpenContext);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay forceMount asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              transition={{ duration: 0.22 }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content forceMount asChild ref={ref} {...props}>
            <motion.div
              className={cn(
                "fixed z-50 grid gap-4 border border-border bg-card p-6 shadow-glow",
                // mobile: bottom sheet
                "inset-x-0 bottom-0 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl",
                // desktop: centered modal (margin-auto centring leaves `transform` free for Motion)
                "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl",
                className,
              )}
              initial={isDesktop ? { opacity: 0, scale: 0.95, y: 12 } : { y: "100%" }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                isDesktop
                  ? { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15, ease: "easeIn" } }
                  : { y: "100%", transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } }
              }
              transition={sheetSpring}
            >
              {children}
              <DialogPrimitive.Close asChild>
                <motion.button
                  type="button"
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </motion.button>
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-xl font-semibold tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
