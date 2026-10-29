"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, LogOut } from "lucide-react";
import { authService } from "@/services/auth.service";

/**
 * Expiration de session par inactivité (Paramètres > Sécurité > Expiration de session).
 *
 * L'activité (souris, clavier, défilement, toucher) est horodatée dans localStorage : toutes les
 * fenêtres du navigateur partagent donc le même compteur. Une minute avant la fin, une fenêtre
 * propose de rester connecté ; à l'échéance, la session est fermée (jeton de rafraîchissement révoqué).
 */

const ACTIVITY_KEY = "ndao-last-activity";
const EXPIRED_FLAG = "ndao-session-expired";
const WARNING_SECONDS = 60;
const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel", "click"] as const;

const authenticated = (): boolean =>
  typeof window !== "undefined" && !!localStorage.getItem("accessToken") && !!localStorage.getItem("user");

export function SessionGuard({ minutes }: { minutes: number }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const warningRef = useRef(false);
  const closing = useRef(false);

  const touch = useCallback(() => {
    try {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* stockage indisponible : la session n'expirera pas */
    }
  }, []);

  // Message affiché après une déconnexion automatique
  useEffect(() => {
    if (!authenticated()) localStorage.removeItem(ACTIVITY_KEY);

    if (localStorage.getItem(EXPIRED_FLAG)) {
      localStorage.removeItem(EXPIRED_FLAG);
      setExpired(true);

      const timer = window.setTimeout(() => setExpired(false), 15_000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const limit = Math.max(1, minutes) * 60_000;
    let lastWrite = 0;

    const logout = () => {
      if (closing.current) return;
      closing.current = true;

      localStorage.setItem(EXPIRED_FLAG, "1");
      localStorage.removeItem(ACTIVITY_KEY);
      void authService.logout();
    };

    const onActivity = () => {
      // Pendant l'avertissement, seul le bouton « Rester connecté » prolonge la session
      if (warningRef.current || !authenticated()) return;

      const now = Date.now();
      if (now - lastWrite < 1000) return;

      lastWrite = now;
      touch();
    };

    const tick = () => {
      if (!authenticated()) {
        localStorage.removeItem(ACTIVITY_KEY);
        warningRef.current = false;
        setRemaining(null);
        return;
      }

      const last = Number(localStorage.getItem(ACTIVITY_KEY) || 0);

      if (!last) {
        touch(); // première seconde après la connexion
        return;
      }

      const idle = Date.now() - last;

      if (idle >= limit) {
        logout();
        return;
      }

      const left = Math.ceil((limit - idle) / 1000);
      const warn = left <= WARNING_SECONDS;

      warningRef.current = warn;
      setRemaining(warn ? left : null);
    };

    for (const name of EVENTS) window.addEventListener(name, onActivity, { passive: true, capture: true });

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => {
      for (const name of EVENTS) window.removeEventListener(name, onActivity, { capture: true });
      window.clearInterval(timer);
    };
  }, [minutes, touch]);

  const stay = () => {
    warningRef.current = false;
    setRemaining(null);
    touch();
  };

  return (
    <>
      {expired && (
        <div className="fixed left-1/2 top-4 z-[190] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-lg">
          <Clock className="h-4 w-4 shrink-0" />
          Votre session a expiré après une période d&apos;inactivité. Reconnectez-vous.
          <button type="button" onClick={() => setExpired(false)} className="font-semibold underline">
            Fermer
          </button>
        </div>
      )}

      {remaining !== null && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">Toujours là ?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pour votre sécurité, vous allez être déconnecté dans <span className="font-bold text-slate-900">{remaining} s</span> faute d&apos;activité.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void authService.logout()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" /> Me déconnecter
              </button>
              <button type="button" onClick={stay} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Rester connecté
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
