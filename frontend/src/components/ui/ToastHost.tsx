"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ConfirmEventDetail, ToastEventDetail, ToastKind } from "@/lib/toast";

interface ToastItem extends ToastEventDetail {
  id: number;
}

const STYLE: Record<ToastKind, { icon: typeof Info; ring: string; text: string }> = {
  success: { icon: CheckCircle2, ring: "bg-green-100 text-green-600", text: "Succès" },
  error: { icon: XCircle, ring: "bg-red-100 text-red-600", text: "Erreur" },
  info: { icon: Info, ring: "bg-blue-100 text-blue-600", text: "Information" },
  warning: { icon: AlertTriangle, ring: "bg-amber-100 text-amber-600", text: "Attention" },
};

/** À monter une seule fois (layout racine) : toasts au CENTRE de l'écran + confirmation. */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmEventDetail | null>(null);

  useEffect(() => {
    let counter = 0;

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      const id = ++counter + Date.now();

      setToasts((cur) => [...cur.slice(-2), { ...detail, id }]);
      window.setTimeout(
        () => setToasts((cur) => cur.filter((t) => t.id !== id)),
        detail.kind === "error" ? 4200 : 2400
      );
    };

    const onConfirm = (event: Event) => {
      setConfirm((event as CustomEvent<ConfirmEventDetail>).detail);
    };

    window.addEventListener("nh:toast", onToast);
    window.addEventListener("nh:confirm", onConfirm);

    return () => {
      window.removeEventListener("nh:toast", onToast);
      window.removeEventListener("nh:confirm", onConfirm);
    };
  }, []);

  const answer = (value: boolean) => {
    confirm?.resolve(value);
    setConfirm(null);
  };

  return (
    <>
      {/* Toasts centrés */}
      <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4">
        {toasts.map((item) => {
          const style = STYLE[item.kind];
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-[toastIn_0.25s_ease-out] flex-col items-center gap-3 rounded-3xl border border-gray-100 bg-white px-8 py-7 text-center shadow-2xl shadow-black/20"
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${style.ring}`}>
                <Icon className="h-8 w-8" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{style.text}</p>
              <p className="text-base font-medium text-gray-900">{item.message}</p>
            </div>
          );
        })}
      </div>

      {/* Confirmation centrée */}
      {confirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[toastIn_0.2s_ease-out] rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  confirm.danger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                }`}
              >
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{confirm.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{confirm.message}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => answer(false)}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => answer(true)}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white ${
                  confirm.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-700 hover:bg-blue-800"
                }`}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes toastIn{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </>
  );
}
