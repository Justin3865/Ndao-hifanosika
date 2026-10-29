"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/axios";
import { useSettings } from "@/components/providers/settings-provider";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { isPublicPath } from "@/lib/publicPaths";

/** Applique « Expiration de session » : déconnexion après N minutes d'inactivité. */
export function SessionGuard() {
  const { settings, hydrated } = useSettings();
  const pathname = usePathname();
  const active = hydrated && !isPublicPath(pathname);
  const minutes = active ? Number(settings.sessionTimeout) : 0;

  const onExpire = useCallback(async () => {
    // ADAPTER : si vous avez une fonction logout() dans votre AuthContext, appelez-la ici à la place.
    try {
      await api.post("/auth/logout", undefined, { validateStatus: () => true });
    } catch { /* on redirige quand même */ }
    window.location.href = "/login?expired=1";
  }, []);

  useInactivityLogout(minutes, onExpire);
  return null;
}
