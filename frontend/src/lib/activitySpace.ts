// src/lib/activitySpace.ts
// API de l'espace « participation » des activités et de l'ordre de mérite.

import api from "@/lib/axios";

const base = "/activity-space";

export type ParticipationStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type Level = "L3" | "M2";

export interface MyParticipation {
  id: number;
  activityId: number;
  status: ParticipationStatus;
  hasReport: boolean;
  checkedIn: boolean;
  rating: number | null;
  hasProof: boolean;
}

export interface Participation {
  id: number;
  activityId: number;
  userId: number;
  status: ParticipationStatus;
  message?: string | null;
  report?: string | null;
  reportAt?: string | null;
  hasProof: boolean;
  proofName?: string | null;
  checkedInAt?: string | null;
  rating?: number | null;
  ratingComment?: string | null;
  name?: string;
  level?: Level;
}

export interface ActivityComment {
  id: number;
  body: string;
  createdAt: string;
  mine: boolean;
  authorName: string;
  authorRole: string;
}

export interface SpaceData {
  activityId: number;
  canJoin: boolean;
  canManage: boolean;
  acceptedCount: number;
  mine: Participation | null;
  participants: Participation[];
  comments: ActivityComment[];
}

export interface MeritRow {
  userId: number;
  name: string;
  level: Level;
  rank: number;
  cohortSize: number;
  score: number;
  badge: string;
  components: { quality: number | null; engagement: number; presence: number; volume: number } | null;
  counts: { participations: number; rated: number; reports: number; checkins: number } | null;
}

export interface MeritData {
  period: string;
  scope: "all" | "supervised" | "self";
  weights: { quality: number; engagement: number; presence: number; volume: number };
  target: number;
  unranked?: number;
  generatedAt: string;
  cohorts: Record<Level, MeritRow[]>;
  honor: Partial<Record<Level, Array<{ rank: number; name: string; score: number; badge: string }>>>;
  cohortSizes: Partial<Record<Level, number>>;
}

export interface MyMerit {
  period: string;
  rank: number | null;
  cohortSize: number;
  score: number | null;
  badge: string | null;
  level: Level;
}

export interface HistoryData {
  scope: "all" | "supervised" | "self";
  periods: Array<{ period: string; count: number; closedAt: string }>;
  selected: string | null;
  mine: Array<{ period: string; rank: number; cohortSize: number; score: number; badge: string | null; level: Level }>;
  cohorts: Record<Level, MeritRow[]> | null;
}

export const fetchMine = async () =>
  (await api.get(`${base}/mine`)).data?.data as { mine: MyParticipation[]; accepted: Array<{ activityId: number; count: number }> };

export const fetchSpace = async (id: number | string) => (await api.get(`${base}/${id}/space`)).data?.data as SpaceData;

export const joinActivity = (id: number, message: string) => api.post(`${base}/${id}/join`, { message });
export const leaveActivity = (id: number) => api.delete(`${base}/${id}/join`);
export const decideParticipation = (pid: number, status: "ACCEPTED" | "REJECTED") =>
  api.patch(`${base}/participations/${pid}/decision`, { status });
export const rateParticipation = (pid: number, rating: number, comment: string) =>
  api.patch(`${base}/participations/${pid}/rating`, { rating, comment });
export const saveReport = (id: number, report: string) => api.put(`${base}/${id}/report`, { report });
export const saveProof = (id: number, file: { name: string; mime: string; data: string }) =>
  api.post(`${base}/${id}/proof`, file);
export const checkInActivity = (id: number, position?: { latitude: number; longitude: number }) =>
  api.post(`${base}/${id}/checkin`, position ?? {});
export const addComment = (id: number, body: string) => api.post(`${base}/${id}/comments`, { body });
export const removeComment = (cid: number) => api.delete(`${base}/comments/${cid}`);

export async function openProof(pid: number): Promise<void> {
  const res = await api.get(`${base}/participations/${pid}/proof`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const fetchMerit = async (period?: string) =>
  (await api.get(`${base}/merit`, { params: period ? { period } : {} })).data?.data as MeritData;
export const fetchMyMerit = async () => (await api.get(`${base}/merit/me`)).data?.data as MyMerit | null;
export const fetchMeritHistory = async (period?: string) =>
  (await api.get(`${base}/merit/history`, { params: period ? { period } : {} })).data?.data as HistoryData;
export const closeMeritPeriod = (period: string) => api.post(`${base}/merit/close`, { period });

export const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
};

export const PARTICIPATION_COLORS: Record<ParticipationStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const currentUserId = (): number | null => {
  if (typeof window === "undefined") return null;

  try {
    const id = Number((JSON.parse(localStorage.getItem("user") ?? "{}") as { id?: number }).id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};
