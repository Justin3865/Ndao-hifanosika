// src/components/ui/Checkbox.tsx
import { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | ReactNode;
  description?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      id,
      checked,
      defaultChecked,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || label?.toString().toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={checkboxId}
          className={cn(
            "flex items-start gap-3 cursor-pointer group",
            props.disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              id={checkboxId}
              type="checkbox"
              ref={ref}
              checked={checked}
              defaultChecked={defaultChecked}
              className="sr-only peer"
              {...props}
            />
            <div
              className={cn(
                "w-5 h-5 rounded border-2 border-input bg-background transition-all",
                "peer-focus:ring-2 peer-focus:ring-primary/50 peer-focus:ring-offset-2",
                "group-hover:border-primary/50",
                checked && "border-primary bg-primary group-hover:bg-primary/90",
                error && "border-red-500",
                props.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {checked && (
                <Check className="h-full w-full text-white p-0.5 animate-in zoom-in-50 duration-100" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {label && (
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </label>
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };