/**
 * Pages accessibles sans connexion : pas de synchronisation des réglages ni de déconnexion
 * automatique ici. ADAPTER cette liste aux routes publiques de votre application.
 */
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/verification", "/apply"];

export function isPublicPath(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
