// src/components/ui/Dropdown.tsx
import { forwardRef, ReactNode, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
  renderTrigger?: (selected: DropdownOption | null) => ReactNode;
  renderOption?: (option: DropdownOption, isSelected: boolean) => ReactNode;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Sélectionner...",
      label,
      error,
      disabled = false,
      className,
      triggerClassName,
      menuClassName,
      align = "left",
      size = "md",
      renderTrigger,
      renderOption,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
      }
    };

    const handleSelect = (option: DropdownOption) => {
      if (!option.disabled) {
        onChange?.(option.value);
        setIsOpen(false);
      }
    };

    const sizeClasses = {
      sm: "py-1.5 px-3 text-sm",
      md: "py-2.5 px-4 text-sm",
      lg: "py-3 px-5 text-base",
    };

    return (
      <div ref={dropdownRef} className={cn("relative", className)}>
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between rounded-xl border border-input bg-background transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
            "hover:border-primary/30",
            disabled && "cursor-not-allowed opacity-50",
            error && "border-red-500 focus:ring-red-500/50 focus:border-red-500",
            sizeClasses[size],
            triggerClassName
          )}
        >
          {renderTrigger ? (
            renderTrigger(selectedOption || null)
          ) : (
            <>
              <span className={cn(
                "truncate",
                !selectedOption && "text-muted-foreground/60"
              )}>
                {selectedOption?.label || placeholder}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ml-2",
                isOpen && "rotate-180"
              )} />
            </>
          )}
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute z-50 mt-1 w-full min-w-[180px] rounded-xl border border-border/50 bg-card shadow-lg overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150",
              align === "right" && "right-0",
              menuClassName
            )}
          >
            <div className="py-1 max-h-64 overflow-y-auto">
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isDivider = option.divider;

                if (isDivider) {
                  return (
                    <div
                      key={`divider-${index}`}
                      className="h-px bg-border/50 my-1"
                    />
                  );
                }

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                      "hover:bg-muted",
                      isSelected && "bg-primary/5 text-primary",
                      option.disabled && "opacity-50 cursor-not-allowed",
                      "focus:outline-none focus:bg-muted"
                    )}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <>
                        {option.icon && (
                          <span className="flex-shrink-0">{option.icon}</span>
                        )}
                        <span className="flex-1 text-left">{option.label}</span>
                        {isSelected && (
                          <span className="flex-shrink-0 text-primary">✓</span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Dropdown.displayName = "Dropdown";

export { Dropdown };