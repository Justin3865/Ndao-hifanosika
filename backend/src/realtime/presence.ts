/**
 * Présence en ligne du personnel : un utilisateur est « en ligne » tant qu'au moins
 * une de ses connexions WebSocket est ouverte (plusieurs onglets possibles).
 */
const sockets = new Map<number, Set<string>>();
const since = new Map<number, number>();

/** @returns true si l'utilisateur vient de passer en ligne */
export function addPresence(userId: number, socketId: string): boolean {
  const set = sockets.get(userId) ?? new Set<string>();
  const first = set.size === 0;
  set.add(socketId);
  sockets.set(userId, set);
  if (first) since.set(userId, Date.now());
  return first;
}

/** @returns true si l'utilisateur vient de passer hors ligne */
export function removePresence(userId: number, socketId: string): boolean {
  const set = sockets.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size > 0) return false;
  sockets.delete(userId);
  since.delete(userId);
  return true;
}

export const isOnline = (userId: number) => sockets.has(userId);
export const onlineIds = () => Array.from(sockets.keys());
export const onlineSince = (userId: number) => since.get(userId) ?? null;
