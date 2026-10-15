"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /login n'existe pas comme vraie page :
 * le login est géré par le modal de la page d'accueil (/).
 * Cette page redirige simplement vers /?login=true
 * en conservant returnUrl.
 */
export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get("returnUrl");

    const target = returnUrl
      ? `/?login=true&returnUrl=${encodeURIComponent(returnUrl)}`
      : "/?login=true";

    router.replace(target);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Redirection vers la connexion...</p>
    </div>
  );
}
