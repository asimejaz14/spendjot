import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-sm",
        // Focus ring + border glide in/out instead of snapping; the caret wears the brand colour.
        "caret-primary transition-[color,background-color,border-color,box-shadow] duration-200 ease-out-strong motion-reduce:transition-none",
        "hover:border-foreground/25 focus-visible:border-ring/60",
        "placeholder:text-muted-foreground placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
