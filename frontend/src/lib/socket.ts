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

  if (socket && currentToken === token) return socket;

  socket?.disconnect();
  currentToken = token;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = "";
}
