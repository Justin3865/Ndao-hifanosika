// src/lib/socket.ts — connexion WebSocket (socket.io) du personnel connecté
import { io, Socket } from "socket.io-client";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;
let currentToken = "";

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  if (socket) {
    // Jeton renouvelé : on garde la MÊME instance (les écouteurs déjà posés restent valables)
    // et on se reconnecte avec le nouveau jeton.
    if (currentToken !== token) {
      currentToken = token;
      socket.disconnect().connect();
    } else if (!socket.connected && !socket.active) {
      // connexion refusée plus tôt (jeton expiré) : nouvelle tentative avec le jeton courant
      socket.connect();
    }

    return socket;
  }

  currentToken = token;
  socket = io(SOCKET_URL, {
    // fonction : à chaque (re)connexion le jeton le plus récent est utilisé
    auth: (cb) => cb({ token: localStorage.getItem("accessToken") ?? "" }),
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = "";
}