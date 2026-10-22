"use client";

import { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from "react";

/** Durée d'appui avant l'ouverture des actions (entre 1 et 2 secondes). */
export const LONG_PRESS_MS = 1000;

const MOVE_TOLERANCE = 10; // px : au-delà, c'est un défilement, pas un appui

interface Options {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

/**
 * Appui long (souris, doigt, stylet).
 *  - `pressing` : true pendant l'appui (pour afficher une barre de progression)
 *  - clic droit à la souris : ouvre directement les actions
 *  - un appui long déclenché n'exécute pas le clic simple qui suit
 */
export function useLongPress({ onLongPress, onClick, delay = LONG_PRESS_MS }: Options) {
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const pointerType = useRef("mouse");
  const latest = useRef(onLongPress);

  latest.current = onLongPress;

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      fired.current = false; // un appui long non suivi d'un clic ne doit pas bloquer le prochain
      if (event.pointerType === "mouse" && event.button !== 0) return;

      // Boutons / liens / champs à l'intérieur de la carte : pas d'appui long
      if ((event.target as HTMLElement).closest("button, a, input, textarea, select, audio, video, [data-no-press]")) {
        return;
      }

      pointerType.current = event.pointerType;
      start.current = { x: event.clientX, y: event.clientY };
      setPressing(true);

      timer.current = window.setTimeout(() => {
        timer.current = null;
        fired.current = true;
        setPressing(false);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(15);
        latest.current();
      }, delay);
    },
    [delay],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (timer.current === null) return;

      if (
        Math.abs(event.clientX - start.current.x) > MOVE_TOLERANCE ||
        Math.abs(event.clientY - start.current.y) > MOVE_TOLERANCE
      ) {
        cancel();
      }
    },
    [cancel],
  );

  const onContextMenu = useCallback((event: ReactMouseEvent) => {
    if ((event.target as HTMLElement).closest("a, input, textarea, audio, video")) return;

    event.preventDefault();

    // Souris : clic droit = actions tout de suite. Tactile : on attend la fin du délai.
    if (pointerType.current === "mouse") {
      cancel();
      latest.current();
    }
  }, [cancel]);

  const onClickCapture = useCallback(
    (event: ReactMouseEvent) => {
      if (fired.current) {
        fired.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if ((event.target as HTMLElement).closest("button, a, input, textarea, select, audio, video, [data-no-press]")) {
        return;
      }

      onClick?.();
    },
    [onClick],
  );

  return {
    pressing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu,
      onClickCapture,
    },
  };
}
