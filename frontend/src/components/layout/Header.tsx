"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, User } from "lucide-react";
import api from "@/lib/axios";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "./NotificationBell";
import { closeSocket } from "@/lib/socket";
import { roleLabel } from "@/lib/roles";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface Me {
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
}

// Profil gardé en mémoire : pas de clignotement de la photo à chaque page
let cachedMe: Me | null = null;

function Avatar({ me, size = 40 }: { me: Me | null; size?: number }) {
  const initials = me
    ? `${me.firstName?.[0] ?? ""}${me.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  if (me?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={me.avatarUrl}
        alt="Photo de profil"
        className="rounded-full object-cover ring-2 ring-white"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-900 font-semibold text-white ring-2 ring-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

export default function Header({ setMobileMenuOpen }: HeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [me, setMe] = useState<Me | null>(cachedMe);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadMe = () =>
    api
      .get("/profile")
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          cachedMe = data;
          setMe(data);
        }
      })
      .catch(() => {
        try {
          setMe(JSON.parse(localStorage.getItem("user") ?? "null"));
        } catch {
          setMe(null);
        }
      });

  useEffect(() => {
    loadMe();
    window.addEventListener("profile:updated", loadMe);
    return () => window.removeEventListener("profile:updated", loadMe);
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await api.post("/auth/logout");
    } catch {
      /* la session locale est supprimée dans tous les cas */
    }

    closeSocket();

    [
      "accessToken",
      "refreshToken",
      "user",
      "isAuthenticated",
      "userEmail",
      "rememberMe",
      "userId",
      "userNom",
      "userPrenom",
      "userRole",
    ].forEach((key) => localStorage.removeItem(key));

    router.replace("/");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl p-2.5 text-gray-600 hover:bg-gray-100 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="lg:hidden">
              <Logo size={34} withText={false} />
            </div>

            <p className="hidden text-sm text-gray-500 lg:block">
              Plateforme de suivi &amp; évaluation —{" "}
              <span className="font-semibold text-blue-900">Ndao Hifanosika</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-3 rounded-xl py-1.5 pl-2 pr-3 transition hover:bg-gray-100"
              >
                <Avatar me={me} />
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-sm font-semibold text-gray-900">
                    {me ? `${me.firstName} ${me.lastName}` : "..."}
                  </p>
                  <p className="text-xs text-gray-500">{roleLabel(me?.role)}</p>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                    <Avatar me={me} size={44} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {me ? `${me.firstName} ${me.lastName}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">{roleLabel(me?.role)}</p>
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" /> Mon profil
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmLogout(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {confirmLogout && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">Se déconnecter ?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Votre session sera fermée sur cet appareil.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loggingOut ? "Déconnexion..." : "Se déconnecter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
