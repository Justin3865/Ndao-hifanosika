"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Info,
  Pencil,
  PlusCircle,
  Send,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import type { ConfirmEventDetail, ToastEventDetail, ToastKind } from "@/lib/toast";

interface ToastItem extends ToastEventDetail {
  id: number;
}

/**
 * Une couleur par action. Classes écrites en toutes lettres (Tailwind v4 ne détecte
 * pas les classes construites dynamiquement).
 */
const STYLE: Record<ToastKind, { icon: typeof Info; box: string; title: string; ms: number }> = {
  success: { icon: CheckCircle2, box: "bg-green-600", title: "Succès", ms: 3200 },
  create: { icon: PlusCircle, box: "bg-green-600", title: "Créé", ms: 3200 },
  update: { icon: Pencil, box: "bg-blue-600", title: "Modifié", ms: 3200 },
  delete: { icon: Trash2, box: "bg-red-600", title: "Supprimé", ms: 3600 },
  archive: { icon: Archive, box: "bg-orange-600", title: "Annulé", ms: 3600 },
  send: { icon: Send, box: "bg-violet-600", title: "Envoyé", ms: 3200 },
  info: { icon: Info, box: "bg-slate-700", title: "Information", ms: 3600 },
  warning: { icon: TriangleAlert, box: "bg-amber-600", title: "Attention", ms: 4500 },
  error: { icon: XCircle, box: "bg-red-800", title: "Erreur", ms: 5000 },
};

const MAX_VISIBLE = 4;

/** À monter une seule fois (app/layout.tsx) : toasts en HAUT À DROITE + confirmation centrée. */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmEventDetail | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Une seule instance écoute les évènements
    if (window.__nhHost) return;

    window.__nhHost = true;
    setActive(true);

    let counter = 0;

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;

      setToasts((cur) => {
        // Même message déjà affiché : on n'empile pas de doublon
        if (cur.some((t) => t.kind === detail.kind && t.message === detail.message)) return cur;
        return [...cur.slice(-(MAX_VISIBLE - 1)), { ...detail, id: ++counter + Date.now() }];
      });
    };

    const onConfirm = (event: Event) => {
      setConfirm((event as CustomEvent<ConfirmEventDetail>).detail);
    };

    window.addEventListener("nh:toast", onToast);
    window.addEventListener("nh:confirm", onConfirm);

    return () => {
      window.__nhHost = false;
      window.removeEventListener("nh:toast", onToast);
      window.removeEventListener("nh:confirm", onConfirm);
    };
  }, []);

  const dismiss = (id: number) => setToasts((cur) => cur.filter((t) => t.id !== id));

  const answer = (value: boolean) => {
    confirm?.resolve(value);
    setConfirm(null);
  };

  if (!active) return null;

  return (
    <>
      {/* Toasts : toujours au même endroit (haut-droite ; pleine largeur sur mobile) */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-stretch gap-3 p-4 sm:left-auto sm:right-0 sm:w-[26rem]"
      >
        {toasts.map((item) => {
          const style = STYLE[item.kind];
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              role={item.kind === "error" || item.kind === "warning" ? "alert" : "status"}
              className={`nh-toast pointer-events-auto relative overflow-hidden rounded-2xl text-white shadow-xl shadow-black/25 animate-[toastIn_0.25s_ease-out] ${style.box}`}
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    {item.title ?? style.title}
                  </p>
                  <p className="mt-0.5 break-words text-sm font-medium leading-snug">{item.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Fermer"
                  className="rounded-md p-1 text-white/70 transition hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Barre de temps : la fin de l'animation ferme le toast, le survol la met en pause */}
              <div className="h-1 w-full bg-black/15">
                <div
                  className="nh-toast-bar h-full origin-left bg-white/70"
                  style={{ animation: `toastBar ${style.ms}ms linear forwards` }}
                  onAnimationEnd={() => dismiss(item.id)}
                />
              </div>
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

      <style>{`
        @keyframes toastIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
        @keyframes toastBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
        .nh-toast:hover .nh-toast-bar{animation-play-state:paused!important}
      `}</style>
    </>
  );
}
