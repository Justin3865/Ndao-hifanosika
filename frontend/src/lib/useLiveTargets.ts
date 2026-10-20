"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import { haversineKm } from "@/lib/geo";

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
  surveyed: boolean;
  lastSurveyAt: string | null;
  distanceToHqKm: number | null;
  lastSurvey: {
    agentName: string;
    createdAt: string;
    householdSize: number | null;
    monthlyIncome: number | null;
    childrenUnder5: number | null;
    outOfSchoolChildren: number | null;
    mealsPerDay: number | null;
    hasDisability: boolean;
    healthIssues: boolean | null;
    waterAccess: boolean | null;
    electricityAccess: boolean | null;
    housingType: string | null;
    vulnerable: boolean;
    notes: string | null;
  } | null;
}

export function useHouseholds(enabled: boolean) {
  const [households, setHouseholds] = useState<HouseholdPoint[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const load = () =>
      api
        .get("/ai/households")
        .then((res) => setHouseholds(res.data?.data ?? []))
        .catch(() => setHouseholds([]))
        .finally(() => setLoading(false));

    void load();

    // Une nouvelle enquête (ou un réentraînement) met la liste à jour tout de suite
    const socket = getSocket();
    socket?.on("survey:new", load);
    const timer = window.setInterval(load, 120000);

    return () => {
      socket?.off("survey:new", load);
      window.clearInterval(timer);
    };
  }, [enabled]);

  return { households, loading };
}

export const scoreColor = (score: number) =>
  score >= 70 ? "#dc2626" : score >= 50 ? "#f97316" : score >= 30 ? "#eab308" : "#6b7280";

/* ------------------------------------------------------------------ */
/* Agents de terrain : en mission / en ligne / hors ligne               */
/* ------------------------------------------------------------------ */

export type AgentStatusKey = "MISSION" | "LOST" | "ONLINE" | "OFFLINE";

export interface Agent {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  department: string | null;
  status: AgentStatusKey;
  online: boolean;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy?: number | null;
  heading?: number | null;
  updatedAt: string | null;
  missionId: number | null;
  missionStartedAt: string | null;
  distanceToHqKm: number | null;
  surveysToday: number;
  surveysTotal: number;
  /** Agent hors liste « terrain » mais en mission (ex. administrateur) */
  extra?: boolean;
}

export const AGENT_COLOR: Record<AgentStatusKey, string> = {
  MISSION: "#16a34a",
  LOST: "#f59e0b",
  ONLINE: "#2563eb",
  OFFLINE: "#9ca3af",
};

export const AGENT_LABEL: Record<AgentStatusKey, string> = {
  MISSION: "En mission",
  LOST: "Signal perdu",
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
};

/** Un signal de plus de 3 minutes devient « signal perdu ». */
export function agentStatus(agent: Agent): AgentStatusKey {
  if (agent.status === "MISSION" && agent.updatedAt && Date.now() - new Date(agent.updatedAt).getTime() > 180000) {
    return "LOST";
  }

  return agent.status;
}

export function useAgents(enabled: boolean, hq: { latitude: number; longitude: number } | null) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(enabled);
  const hqRef = useRef(hq);
  hqRef.current = hq;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const load = () =>
      api
        .get("/tracking/agents")
        .then((res) => setAgents((cur) => [...(res.data?.data ?? []), ...cur.filter((a) => a.extra && a.status === "MISSION")]))
        .catch(() => undefined)
        .finally(() => setLoading(false));

    void load();
    const timer = window.setInterval(load, 60000);

    const socket = getSocket();

    const onLocation = (p: {
      id: number; name: string; role: string; latitude: number; longitude: number; altitude: number | null;
      accuracy: number | null; heading: number | null; missionId: number; updatedAt: string;
    }) =>
      setAgents((cur) => {
        const h = hqRef.current;
        const patch = {
          status: "MISSION" as const,
          online: true,
          latitude: p.latitude,
          longitude: p.longitude,
          altitude: p.altitude,
          accuracy: p.accuracy,
          heading: p.heading,
          updatedAt: p.updatedAt,
          missionId: p.missionId,
          distanceToHqKm: h ? Math.round(haversineKm(h.latitude, h.longitude, p.latitude, p.longitude) * 10) / 10 : null,
        };

        const index = cur.findIndex((a) => a.id === p.id);

        if (index === -1) {
          return [
            ...cur,
            { id: p.id, name: p.name, role: p.role, phone: null, department: null, missionStartedAt: null, surveysToday: 0, surveysTotal: 0, extra: true, ...patch },
          ];
        }

        const copy = [...cur];
        copy[index] = { ...copy[index], ...patch };
        return copy;
      });

    const onOffline = ({ id }: { id: number }) =>
      setAgents((cur) =>
        cur
          .filter((a) => !(a.extra && a.id === id))
          .map((a) =>
            a.id === id
              ? { ...a, status: a.online ? ("ONLINE" as const) : ("OFFLINE" as const), latitude: null, longitude: null, altitude: null, accuracy: null, heading: null, distanceToHqKm: null, missionId: null }
              : a
          )
      );

    const onPresence = ({ id, online }: { id: number; online: boolean }) =>
      setAgents((cur) =>
        cur.map((a) =>
          a.id !== id
            ? a
            : { ...a, online, status: a.status === "MISSION" || a.status === "LOST" ? a.status : online ? ("ONLINE" as const) : ("OFFLINE" as const) }
        )
      );

    socket?.on("staff:location", onLocation);
    socket?.on("staff:offline", onOffline);
    socket?.on("presence:update", onPresence);

    return () => {
      window.clearInterval(timer);
      socket?.off("staff:location", onLocation);
      socket?.off("staff:offline", onOffline);
      socket?.off("presence:update", onPresence);
    };
  }, [enabled]);

  return { agents, loading };
}

export interface FieldSummary {
  agentsTotal: number;
  agentsOnline: number;
  agentsOnMission: number;
  surveyedHouseholds: number;
  priorityHouseholds: number;
  priorityToSurvey: number;
  method: "ML" | "HEURISTIQUE";
  hq: { name: string; address: string | null; latitude: number; longitude: number } | null;
}

export function useFieldSummary(enabled: boolean) {
  const [summary, setSummary] = useState<FieldSummary | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () =>
      api
        .get("/tracking/summary")
        .then((res) => setSummary(res.data?.data ?? null))
        .catch(() => setSummary(null));

    void load();
    const socket = getSocket();
    socket?.on("survey:new", load);
    const timer = window.setInterval(load, 60000);

    return () => {
      socket?.off("survey:new", load);
      window.clearInterval(timer);
    };
  }, [enabled]);

  return summary;
}
