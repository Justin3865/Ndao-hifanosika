// src/lib/toast.ts
// Notifications centrées à l'écran + boîte de confirmation (remplace alert/confirm).

export type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastEventDetail {
  kind: ToastKind;
  message: string;
}

export interface ConfirmEventDetail {
  message: string;
  title: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

function emit(kind: ToastKind, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastEventDetail>("nh:toast", { detail: { kind, message } }));
}

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
  info: (message: string) => emit("info", message),
  warning: (message: string) => emit("warning", message),
};

export function confirmDialog(
  message: string,
  options: { title?: string; confirmLabel?: string; danger?: boolean } = {}
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent<ConfirmEventDetail>("nh:confirm", {
        detail: {
          message,
          title: options.title ?? "Confirmation",
          confirmLabel: options.confirmLabel ?? "Confirmer",
          danger: options.danger ?? true,
          resolve,
        },
      })
    );
  });
}
