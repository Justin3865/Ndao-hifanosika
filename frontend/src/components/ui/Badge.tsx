// src/components/ui/Badge.tsx
import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
        danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
        orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
        gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        outline: "border border-border text-foreground bg-transparent",
        ghost: "bg-transparent text-foreground hover:bg-muted",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      dot,
      dotColor,
      removable,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              dotColor || (variant === "success" ? "bg-green-500" : 
                         variant === "warning" ? "bg-yellow-500" :
                         variant === "danger" ? "bg-red-500" :
                         variant === "info" ? "bg-blue-500" :
                         variant === "purple" ? "bg-purple-500" :
                         variant === "pink" ? "bg-pink-500" :
                         variant === "orange" ? "bg-orange-500" :
                         variant === "teal" ? "bg-teal-500" :
                         "bg-primary")
            )}
          />
        )}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Supprimer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };