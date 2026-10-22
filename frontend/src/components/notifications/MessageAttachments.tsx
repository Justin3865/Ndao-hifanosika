"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Music,
  Play,
  Video as VideoIcon,
} from "lucide-react";
import api from "@/lib/axios";
import type { AttachmentMeta } from "@/hooks/useNotificationFeed";

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

async function fetchBlob(id: number): Promise<Blob> {
  const res = await api.get(`/notifications/attachments/${id}/file`, {
    responseType: "blob",
    timeout: 120_000,
  });
  return res.data as Blob;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Charge le fichier (avec le jeton d'authentification) et fournit une URL locale. */
function useAttachmentUrl(id: number, auto: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wanted, setWanted] = useState(auto);

  useEffect(() => {
    if (!wanted) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    setLoading(true);
    setFailed(false);

    fetchBlob(id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, wanted]);

  return { url, loading, failed, load: () => setWanted(true) };
}

function DownloadButton({ file }: { file: AttachmentMeta }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      saveBlob(await fetchBlob(file.id), file.name);
    } catch {
      /* échec silencieux : l'utilisateur peut réessayer */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      title="Télécharger"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">Télécharger</span>
    </button>
  );
}

function ImageAttachment({ file }: { file: AttachmentMeta }) {
  // Les grosses images ne sont chargées qu'à la demande
  const { url, loading, failed, load } = useAttachmentUrl(file.id, file.size <= 3 * 1024 * 1024);

  return (
    <div className="space-y-1">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.name}
          onClick={() => window.open(url, "_blank", "noopener")}
          className="max-h-64 max-w-full cursor-zoom-in rounded-xl border border-gray-200 object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={load}
          className="flex h-28 w-48 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 hover:bg-gray-100"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {failed ? "Échec — réessayer" : `Afficher l'image (${formatSize(file.size)})`}
        </button>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
        <span className="truncate">{file.name} · {formatSize(file.size)}</span>
        <DownloadButton file={file} />
      </div>
    </div>
  );
}

function MediaAttachment({ file }: { file: AttachmentMeta }) {
  const isVideo = file.kind === "VIDEO";
  const { url, loading, failed, load } = useAttachmentUrl(file.id, false);

  return (
    <div className="space-y-1">
      {url ? (
        isVideo ? (
          <video src={url} controls autoPlay className="max-h-72 max-w-full rounded-xl bg-black" />
        ) : (
          <audio src={url} controls autoPlay className="w-full max-w-sm" />
        )
      ) : (
        <button
          type="button"
          onClick={load}
          className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-left hover:bg-gray-100"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isVideo ? (
              <Play className="h-5 w-5" />
            ) : (
              <Music className="h-5 w-5" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-gray-900">{file.name}</span>
            <span className="text-xs text-gray-500">
              {failed ? "Échec du chargement — réessayer" : `${isVideo ? "Vidéo" : "Audio"} · ${formatSize(file.size)} · toucher pour lire`}
            </span>
          </span>
        </button>
      )}
      <div className="flex justify-end">
        <DownloadButton file={file} />
      </div>
    </div>
  );
}

function FileAttachment({ file }: { file: AttachmentMeta }) {
  const Icon = file.kind === "ARCHIVE" ? Archive : file.kind === "VIDEO" ? VideoIcon : FileText;

  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">{file.name}</span>
        <span className="text-xs text-gray-500">
          {file.kind === "ARCHIVE" ? "Archive" : "Fichier"} · {formatSize(file.size)}
        </span>
      </span>
      <DownloadButton file={file} />
    </div>
  );
}

export function LocationCard({
  latitude,
  longitude,
  accuracy,
}: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}) {
  const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return (
    <div className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <MapPin className="h-5 w-5" />
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-medium text-gray-900">Position partagée</span>
        <span className="block text-xs text-gray-600">
          {coords}
          {accuracy ? ` · ±${Math.round(accuracy)} m` : ""}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
          >
            Google Maps <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
          >
            OpenStreetMap <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </span>
    </div>
  );
}

interface Props {
  attachments: AttachmentMeta[];
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

/** Affiche les pièces jointes d'un message, selon leur catégorie, et la position. */
export function MessageAttachments({ attachments, latitude, longitude, accuracy }: Props) {
  const hasLocation = typeof latitude === "number" && typeof longitude === "number";

  if (attachments.length === 0 && !hasLocation) return null;

  return (
    <div className="mt-2 space-y-2" data-no-press>
      {attachments.map((file) => {
        if (file.kind === "IMAGE") return <ImageAttachment key={file.id} file={file} />;
        if (file.kind === "VIDEO" || file.kind === "AUDIO") return <MediaAttachment key={file.id} file={file} />;
        return <FileAttachment key={file.id} file={file} />;
      })}

      {hasLocation && <LocationCard latitude={latitude as number} longitude={longitude as number} accuracy={accuracy} />}
    </div>
  );
}
