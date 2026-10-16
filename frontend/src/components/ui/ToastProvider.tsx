"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Toast, ToastType } from "./Toast";

interface ToastItem { id: number; message: string; type: ToastType; title?: string }
interface ToastApi {
  show: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Toasts affichés au CENTRE de l'écran, disparaissent seuls après 3,5 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const show = useCallback((message: string, type: ToastType = "success", title?: string) => {
    const id = nextId.current++;
    setItems((l) => [...l.slice(-2), { id, message, type, title }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (m, t) => show(m, "success", t),
    error: (m, t) => show(m, "error", t),
    warning: (m, t) => show(m, "warning", t),
    info: (m, t) => show(m, "info", t),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-3 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-md animate-[fadeIn_.2s_ease-out]">
            <Toast message={t.message} type={t.type} title={t.title} onClose={() => dismiss(t.id)} className="max-w-none shadow-2xl" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>.");
  return ctx;
}
