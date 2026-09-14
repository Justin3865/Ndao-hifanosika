// src/components/ui/ConfirmDialog.tsx
import { forwardRef, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, ModalBody, ModalFooter } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  children?: ReactNode;
  className?: string;
}

const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      isOpen,
      onClose,
      onConfirm,
      title = "Confirmer l'action",
      description,
      confirmLabel = "Confirmer",
      cancelLabel = "Annuler",
      variant = "danger",
      isLoading = false,
      children,
      className,
    },
    ref
  ) => {
    const variantConfig = {
      danger: {
        icon: AlertTriangle,
        iconClassName: "text-red-500",
        confirmVariant: "danger" as const,
        confirmClassName: "bg-red-600 hover:bg-red-700 text-white",
      },
      warning: {
        icon: AlertTriangle,
        iconClassName: "text-yellow-500",
        confirmVariant: "warning" as const,
        confirmClassName: "bg-yellow-500 hover:bg-yellow-600 text-black",
      },
      info: {
        icon: AlertTriangle,
        iconClassName: "text-blue-500",
        confirmVariant: "primary" as const,
        confirmClassName: "",
      },
    };

    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="sm"
        className={cn(className)}
        showCloseButton={!isLoading}
      >
        <ModalBody>
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              variant === "danger" && "bg-red-100 dark:bg-red-900/30",
              variant === "warning" && "bg-yellow-100 dark:bg-yellow-900/30",
              variant === "info" && "bg-blue-100 dark:bg-blue-900/30"
            )}>
              <Icon className={cn("h-6 w-6", config.iconClassName)} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1.5">
                  {description}
                </p>
              )}
              {children && (
                <div className="mt-3 text-sm">{children}</div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            fullWidth
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : variant === "warning" ? "warning" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
            fullWidth
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
);

ConfirmDialog.displayName = "ConfirmDialog";

export { ConfirmDialog };