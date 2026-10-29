"use client";
import { useEffect } from "react";

/** Déconnecte après `minutes` min sans activité (réglage « Expiration de session »). */
export function useInactivityLogout(minutes: number, onExpire: () => void) {
  useEffect(() => {
    if (!minutes || minutes <= 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onExpire, minutes * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, onExpire]);
}
