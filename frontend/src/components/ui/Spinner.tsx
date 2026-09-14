// src/components/ui/Spinner.tsx
import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "white" | "muted";
}

const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", variant = "primary", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-2",
      lg: "h-8 w-8 border-3",
      xl: "h-12 w-12 border-4",
    };

    const variantClasses = {
      primary: "border-primary/20 border-t-primary",
      white: "border-white/20 border-t-white",
      muted: "border-muted-foreground/20 border-t-muted-foreground",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-block animate-spin rounded-full",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Spinner.displayName = "Spinner";

// Composant pour afficher un spinner centré
export interface SpinnerOverlayProps extends HTMLAttributes<HTMLDivElement> {
  spinnerProps?: SpinnerProps;
  label?: string;
}

const SpinnerOverlay = forwardRef<HTMLDivElement, SpinnerOverlayProps>(
  ({ className, spinnerProps, label = "Chargement...", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-8",
          className
        )}
        {...props}
      >
        <Spinner size="lg" {...spinnerProps} />
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
        {children}
      </div>
    );
  }
);

SpinnerOverlay.displayName = "SpinnerOverlay";

export { Spinner, SpinnerOverlay };