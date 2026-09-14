// src/components/reports/ExportButtons.tsx
"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, File, Printer, Share2, Mail, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils";

export interface ExportButtonsProps {
  onExport?: (format: "pdf" | "excel" | "word" | "csv") => void;
  onPrint?: () => void;
  onShare?: () => void;
  onEmail?: () => void;
  className?: string;
  isLoading?: boolean;
  formats?: ("pdf" | "excel" | "word" | "csv")[];
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const formatIcons = {
  pdf: FileText,
  excel: FileSpreadsheet,
  word: File,
  csv: FileText,
};

const formatLabels = {
  pdf: "PDF",
  excel: "Excel",
  word: "Word",
  csv: "CSV",
};

const formatColors = {
  pdf: "text-red-600",
  excel: "text-green-600",
  word: "text-blue-600",
  csv: "text-purple-600",
};

export function ExportButtons({
  onExport,
  onPrint,
  onShare,
  onEmail,
  className,
  isLoading = false,
  formats = ["pdf", "excel", "word", "csv"],
  showLabel = true,
  size = "md",
}: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatOptions = formats.map((format) => ({
    value: format,
    label: formatLabels[format],
    icon: <formatIcons[format] className={cn("h-4 w-4", formatColors[format])} />,
  }));

  const handleExport = (format: string) => {
    onExport?.(format as "pdf" | "excel" | "word" | "csv");
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: "h-8 text-sm",
    md: "h-10 text-sm",
    lg: "h-12 text-base",
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Dropdown
        options={formatOptions}
        trigger={
          <Button
            variant="primary"
            className={sizeClasses[size]}
            isLoading={isLoading}
            loadingText="Export..."
            leftIcon={<Download className="h-4 w-4" />}
            rightIcon={<ChevronDown className="h-4 w-4" />}
          >
            {showLabel ? "Exporter" : ""}
          </Button>
        }
        onSelect={(value) => handleExport(value)}
        align="left"
      />

      <Button
        variant="outline"
        size="icon"
        onClick={onPrint}
        className={cn(sizeClasses[size], "w-10")}
        title="Imprimer"
      >
        <Printer className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onShare}
        className={cn(sizeClasses[size], "w-10")}
        title="Partager"
      >
        <Share2 className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onEmail}
        className={cn(sizeClasses[size], "w-10")}
        title="Envoyer par email"
      >
        <Mail className="h-4 w-4" />
      </Button>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="animate-spin h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full" />
          Export en cours...
        </div>
      )}
    </div>
  );
}