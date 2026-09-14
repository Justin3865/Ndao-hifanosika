// src/components/ui/Textarea.tsx
import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  rows?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helper,
      rows = 4,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-foreground"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          rows={rows}
          className={cn(
            "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm transition-all resize-y",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "placeholder:text-muted-foreground/60",
            error
              ? "border-red-500 focus:ring-red-500/50 focus:border-red-500"
              : "hover:border-primary/30",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            {error}
          </p>
        )}
        {helper && !error && (
          <p className="text-xs text-muted-foreground">{helper}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };