"use client";

import { CalendarDays } from "lucide-react";

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  className = "",
  error,
}: DatePickerProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {label}

          {required && (
            <span className="ml-1 text-red-500">*</span>
          )}
        </label>
      )}

      <div className="relative">
        <CalendarDays
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 text-sm text-gray-900 outline-none transition
            ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            }
            ${
              disabled
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : ""
            }
          `}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default DatePicker;