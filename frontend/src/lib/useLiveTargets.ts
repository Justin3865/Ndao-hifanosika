"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { getSocket } from "@/lib/socket";

export interface Target {
  id: number;
  firstName: string;
  lastName: string;
  age?: number | null;
  vulnerable?: boolean;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy?: number | null;
  lastSeenAt: string | null;
  trackingEnabled?: boolean;
  project?: { id: number; name: string } | null;
}

/** Bénéficiaires suivis : liste initiale + mises à jour WebSocket en direct. */
export function useLiveTargets(enabled: boolean) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    api
      .get("/tracking/targets")
      .then((res) => setTargets(res.data?.data ?? []))
      .catch(() => setTargets([]))
      .finally(() => setLoading(false));

    const socket = getSocket();
    if (!socket) return;

    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onLocation = (target: Target) =>
      setTargets((cur) => {
        const index = cur.findIndex((t) => t.id === target.id);
        if (index === -1) return [target, ...cur];
        const copy = [...cur];
        copy[index] = { ...copy[index], ...target, trackingEnabled: true };
        return copy;
      });

    const onOffline = ({ id }: { id: number }) =>
      setTargets((cur) =>
        cur.map((t) =>
          t.id === id
            ? { ...t, latitude: null, longitude: null, lastSeenAt: null, trackingEnabled: false }
            : t
        )
      );

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("target:location", onLocation);
    socket.on("target:offline", onOffline);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("target:location", onLocation);
      socket.off("target:offline", onOffline);
    };
  }, [enabled]);

  return { targets, loading, connected };
}

export type Presence = "online" | "recent" | "offline";

export function presenceOf(lastSeenAt?: string | null): Presence {
  if (!lastSeenAt) return "offline";
  const minutes = (Date.now() - new Date(lastSeenAt).getTime()) / 60000;
  if (minutes < 2) return "online";
  if (minutes < 15) return "recent";
  return "offline";
}

export const PRESENCE_COLOR: Record<Presence, string> = {
  online: "#16a34a",
  recent: "#f59e0b",
  offline: "#9ca3af",
};

export const PRESENCE_LABEL: Record<Presence, string> = {
  online: "En ligne",
  recent: "Vu récemment",
  offline: "Hors ligne",
};

/* ------------------------------------------------------------------ */
/* Agents en mission (GPS en direct) et ménages vulnérables             */
/* ------------------------------------------------------------------ */

export interface StaffPosition {
  id: number;
  name: string;
  role?: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  updatedAt: string;
}

export function useLiveStaff(enabled: boolean) {
  const [staff, setStaff] = useState<StaffPosition[]>([]);

  useEffect(() => {
    if (!enabled) return;

    api
      .get("/tracking/staff")
      .then((res) => setStaff(res.data?.data ?? []))
      .catch(() => setStaff([]));

    const socket = getSocket();
    if (!socket) return;

    const onLocation = (position: StaffPosition) =>
      setStaff((cur) => [position, ...cur.filter((s) => s.id !== position.id)]);

    const onOffline = ({ id }: { id: number }) => setStaff((cur) => cur.filter((s) => s.id !== id));

    socket.on("staff:location", onLocation);
    socket.on("staff:offline", onOffline);

    return () => {
      socket.off("staff:location", onLocation);
      socket.off("staff:offline", onOffline);
    };
  }, [enabled]);

  return staff;
}

export interface HouseholdPoint {
  id: number;
  name: string;
  age: number | null;
  locality: string | null;
  zoneName: string | null;
  projectName: string;
  vulnerable: boolean;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  householdSize: number | null;
  monthlyIncome: number | null;
  remoteKm: number | null;
  score: number;
  scoreSgd: number | null;
  scoreMlp: number | null;
  method: "ML" | "HEURISTIQUE";
  suspected: boolean;
  nearestStaff: { id: number; name: string; distanceKm: number } | null;
}

export function useHouseholds(enabled: boolean) {
  const [households, setHouseholds] = useState<HouseholdPoint[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    api
      .get("/ai/households")
      .then((res) => setHouseholds(res.data?.data ?? []))
      .catch(() => setHouseholds([]))
      .finally(() => setLoading(false));
  }, [enabled]);

  return { households, loading };
}

export const scoreColor = (score: number) =>
  score >= 70 ? "#dc2626" : score >= 50 ? "#f97316" : score >= 30 ? "#eab308" : "#6b7280";
