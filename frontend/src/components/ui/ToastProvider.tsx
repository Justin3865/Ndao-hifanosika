"use client";

import { ReactNode, useMemo } from "react";
import { toast as bus } from "@/lib/toast";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastApi {
  show: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  create: (message: string, title?: string) => void;
  update: (message: string, title?: string) => void;
  delete: (message: string, title?: string) => void;
  archive: (message: string, title?: string) => void;
  send: (message: string, title?: string) => void;
}

/**
 * Conservé pour compatibilité : l'affichage est désormais assuré par l'unique <ToastHost />
 * (app/layout.tsx), au même endroit pour tout le projet. useToast() ne dépend plus d'aucun
 * contexte et ne peut donc plus lever d'erreur « hors ToastProvider ».
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useToast(): ToastApi {
  return useMemo<ToastApi>(
    () => ({
      show: (message, type = "success", title) => bus[type](message, title),
      success: (m, t) => bus.success(m, t),
      error: (m, t) => bus.error(m, t),
      warning: (m, t) => bus.warning(m, t),
      info: (m, t) => bus.info(m, t),
      create: (m, t) => bus.create(m, t),
      update: (m, t) => bus.update(m, t),
      delete: (m, t) => bus.delete(m, t),
      archive: (m, t) => bus.archive(m, t),
      send: (m, t) => bus.send(m, t),
    }),
    []
  );
}
