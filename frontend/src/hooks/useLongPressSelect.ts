"use client";

// Sélection multiple par appui long :
//  - maintenir 2 s sur un message  → entre en mode sélection et coche ce message ;
//  - ensuite, un simple clic / toucher coche ou décoche les autres ;
//  - quand plus rien n'est coché (ou touche Échap) → retour au mode normal.
// Fonctionne à la souris, au doigt et au stylet (Pointer Events).

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

const DEFAULT_DELAY = 2000; // ms
const MOVE_TOLERANCE = 10; // px : au-delà, c'est un défilement, pas un appui long

// Éléments interactifs (menu « ... », boutons d'action, liens) : ils ne déclenchent pas l'appui long
const INTERACTIVE = "button, a, input, textarea, select, [data-no-select]";

export function useLongPressSelect(options: { delay?: number } = {}) {
  const delay = options.delay ?? DEFAULT_DELAY;

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pressingId, setPressingId] = useState<number | null>(null);

  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const fired = useRef(false); // un appui long vient d'avoir lieu : on ignore le « click » qui suit
  const selectingRef = useRef(false);

  selectingRef.current = selecting;

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }

    setPressingId(null);
  }, []);

  const clear = useCallback(() => {
    cancelTimer();
    setSelected(new Set());
    setSelecting(false);
  }, [cancelTimer]);

  const toggle = useCallback((id: number) => {
    setSelected((cur) => {
      const next = new Set(cur);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      if (next.size === 0) setSelecting(false);

      return next;
    });
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelected(new Set(ids));
    setSelecting(ids.length > 0);
  }, []);

  // Échap = annuler la sélection
  useEffect(() => {
    if (!selecting) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, clear]);

  // Nettoyage au démontage
  useEffect(() => () => cancelTimer(), [cancelTimer]);

  /** À étaler sur chaque carte : <article {...sel.bind(item.id)}> */
  const bind = useCallback(
    (id: number) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
        if (selectingRef.current) return; // déjà en mode sélection : le clic suffit

        fired.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
        cancelTimer();
        setPressingId(id);

        timer.current = window.setTimeout(() => {
          timer.current = null;
          fired.current = true;
          setPressingId(null);
          setSelecting(true);
          setSelected(new Set([id]));

          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
        }, delay);
      },

      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (timer.current === null) return;

        const dx = event.clientX - origin.current.x;
        const dy = event.clientY - origin.current.y;

        if (Math.hypot(dx, dy) > MOVE_TOLERANCE) cancelTimer();
      },

      onPointerUp: cancelTimer,
      onPointerCancel: cancelTimer,
      onPointerLeave: cancelTimer,

      // Empêche le menu contextuel du navigateur (appui long tactile / clic droit) pendant l'appui
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (timer.current !== null || selectingRef.current || fired.current) event.preventDefault();
      },

      // Capture : bloque l'ouverture / la navigation normale de la carte pendant la sélection
      onClickCapture: (event: MouseEvent<HTMLElement>) => {
        if (fired.current) {
          fired.current = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (selectingRef.current) {
          event.preventDefault();
          event.stopPropagation();
          toggle(id);
        }
      },
    }),
    [delay, cancelTimer, toggle],
  );

  return {
    selecting,
    selected,
    ids: Array.from(selected),
    count: selected.size,
    isSelected: (id: number) => selected.has(id),
    isPressing: (id: number) => pressingId === id,
    bind,
    toggle,
    selectAll,
    clear,
  };
}
