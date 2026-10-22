"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Music,
  Paperclip,
  Send,
  Smile,
  Video as VideoIcon,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import type { AttachmentKind, AttachmentMeta } from "@/hooks/useNotificationFeed";
import { formatSize } from "./MessageAttachments";

export interface ComposerPayload {
  message: string;
  attachmentIds: number[];
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

interface Props {
  /** Envoie le message ; lever une Error pour afficher un message d'erreur. */
  onSubmit: (payload: ComposerPayload) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  /** Position GPS autorisée (réservée aux rôles qui peuvent envoyer un message). */
  allowLocation?: boolean;
  autoFocus?: boolean;
  rows?: number;
}

interface Staged {
  key: string;
  file: File;
  status: "uploading" | "done" | "error";
  progress: number;
  attachment?: AttachmentMeta;
  error?: string;
  preview?: string;
  abort: AbortController;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 10;

const EMOJIS = (
  "😀 😃 😄 😁 😆 😅 😂 🤣 🙂 😉 😊 😍 🥰 😘 😎 🤩 🥳 😇 🤔 🤗 🙄 😬 😴 😢 😭 😡 😱 🤝 🙏 👍 👎 👏 🙌 💪 👌 ✌️ 🤞 👋 " +
  "❤️ 💙 💚 💛 🧡 💜 🔥 ✨ ⭐ 🎉 🎊 🎯 💡 📌 📎 📅 ⏰ ✅ ❌ ⚠️ ❓ ❗ 📢 📍 📷 🎥 🎧 📄 📁 💼 🏫 🏠 🚗 ☀️ 🌧️ 🌱 🍀 🇲🇬"
).split(" ");

const PICKERS: Array<{
  id: string;
  label: string;
  accept: string;
  icon: typeof ImageIcon;
}> = [
  { id: "image", label: "Photo", accept: "image/*", icon: ImageIcon },
  { id: "video", label: "Vidéo", accept: "video/*", icon: VideoIcon },
  { id: "audio", label: "Audio", accept: "audio/*", icon: Music },
  {
    id: "file",
    label: "Document",
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.odt,.ods,.odp,.rtf,.json",
    icon: FileText,
  },
  { id: "archive", label: "Archive ZIP", accept: ".zip,.rar,.7z,.tar,.gz,.tgz", icon: Archive },
];

function iconFor(kind: AttachmentKind | "UNKNOWN") {
  if (kind === "VIDEO") return VideoIcon;
  if (kind === "AUDIO") return Music;
  if (kind === "ARCHIVE") return Archive;
  if (kind === "IMAGE") return ImageIcon;
  return FileText;
}

function guessKind(file: File): AttachmentKind {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type.startsWith("audio/")) return "AUDIO";
  if (/\.(zip|rar|7z|tar|gz|tgz)$/.test(name)) return "ARCHIVE";
  return "FILE";
}

function geoMessage(error: GeolocationPositionError | Error): string {
  const code = (error as GeolocationPositionError).code;
  if (code === 1) return "Autorisation de localisation refusée par le navigateur.";
  if (code === 2) return "Position indisponible pour le moment.";
  if (code === 3) return "Délai dépassé pour obtenir la position.";
  return error.message || "Impossible d'obtenir la position.";
}

export function MessageComposer({
  onSubmit,
  onCancel,
  placeholder = "Votre message…",
  submitLabel = "Envoyer",
  allowLocation = true,
  autoFocus = false,
  rows = 3,
}: Props) {
  const [text, setText] = useState("");
  const [staged, setStaged] = useState<Staged[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [menu, setMenu] = useState<"" | "attach" | "emoji">("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const stagedRef = useRef<Staged[]>([]);

  stagedRef.current = staged;

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenu("");
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Libère les aperçus et annule les envois en cours à la fermeture
  useEffect(
    () => () => {
      stagedRef.current.forEach((item) => {
        if (item.status === "uploading") item.abort.abort();
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    },
    [],
  );

  useEffect(() => {
    if (autoFocus) areaRef.current?.focus();
  }, [autoFocus]);

  const patch = (key: string, changes: Partial<Staged>) =>
    setStaged((cur) => cur.map((item) => (item.key === key ? { ...item, ...changes } : item)));

  const upload = (item: Staged) => {
    api
      .post(
        `/notifications/attachments?name=${encodeURIComponent(item.file.name)}&mime=${encodeURIComponent(
          item.file.type || "application/octet-stream",
        )}`,
        item.file,
        {
          headers: { "Content-Type": "application/octet-stream" },
          timeout: 300_000,
          signal: item.abort.signal,
          onUploadProgress: (event) => {
            const total = event.total || item.file.size || 1;
            patch(item.key, { progress: Math.min(99, Math.round((event.loaded / total) * 100)) });
          },
        },
      )
      .then((res) => patch(item.key, { status: "done", progress: 100, attachment: res.data?.data }))
      .catch((err) => {
        if (item.abort.signal.aborted) return;
        patch(item.key, { status: "error", error: errorMessage(err, "Envoi impossible.") });
      });
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError("");

    const room = MAX_FILES - stagedRef.current.length;
    const files = Array.from(list);

    if (files.length > room) setError(`${MAX_FILES} pièces jointes maximum par message.`);

    const added: Staged[] = [];

    for (const file of files.slice(0, Math.max(room, 0))) {
      if (file.size === 0) {
        setError(`« ${file.name} » est vide.`);
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        setError(`« ${file.name} » dépasse 25 Mo.`);
        continue;
      }

      added.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "uploading",
        progress: 0,
        preview: guessKind(file) === "IMAGE" ? URL.createObjectURL(file) : undefined,
        abort: new AbortController(),
      });
    }

    if (added.length === 0) return;

    setStaged((cur) => [...cur, ...added]);
    added.forEach(upload);
  };

  const removeStaged = (item: Staged) => {
    if (item.status === "uploading") item.abort.abort();
    if (item.preview) URL.revokeObjectURL(item.preview);
    setStaged((cur) => cur.filter((entry) => entry.key !== item.key));
  };

  const pickPosition = () => {
    setError("");
    setMenu("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        setError(geoMessage(err));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const insertEmoji = (emoji: string) => {
    const area = areaRef.current;
    const start = area?.selectionStart ?? text.length;
    const end = area?.selectionEnd ?? text.length;

    setText((cur) => cur.slice(0, start) + emoji + cur.slice(end));

    window.requestAnimationFrame(() => {
      area?.focus();
      const caret = start + emoji.length;
      area?.setSelectionRange(caret, caret);
    });
  };

  const uploading = staged.some((item) => item.status === "uploading");
  const failed = staged.some((item) => item.status === "error");
  const ready = staged.filter((item) => item.status === "done" && item.attachment);
  const empty = !text.trim() && ready.length === 0 && !location;

  const submit = async () => {
    if (sending || uploading || empty) return;

    if (failed) {
      setError("Retirez les fichiers en échec avant d'envoyer.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await onSubmit({
        message: text.trim(),
        attachmentIds: ready.map((item) => (item.attachment as AttachmentMeta).id),
        ...(location ?? {}),
      });

      staged.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      setStaged([]);
      setLocation(null);
      setText("");
      setMenu("");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-2" data-no-press>
      <div className="relative rounded-xl border border-gray-300 bg-white focus-within:border-blue-500">
        <textarea
          ref={areaRef}
          rows={rows}
          value={text}
          maxLength={5000}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void submit();
            }
          }}
          className="block w-full resize-y rounded-t-xl bg-transparent px-4 py-3 text-sm outline-none"
        />

        <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setMenu((cur) => (cur === "emoji" ? "" : "emoji"))}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            title="Emoji"
            aria-label="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setMenu((cur) => (cur === "attach" ? "" : "attach"))}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            title="Joindre un fichier"
            aria-label="Joindre un fichier"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {allowLocation && (
            <button
              type="button"
              onClick={pickPosition}
              disabled={locating}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
              title="Partager ma position actuelle"
              aria-label="Partager ma position actuelle"
            >
              {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
            </button>
          )}

          <span className="ml-auto text-[11px] text-gray-400">Ctrl + Entrée pour envoyer</span>
        </div>

        {menu === "emoji" && (
          <div className="absolute bottom-full left-0 z-30 mb-2 grid max-h-52 w-72 max-w-[92vw] grid-cols-8 gap-0.5 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="rounded-md p-1 text-xl leading-none hover:bg-gray-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {menu === "attach" && (
          <div className="absolute bottom-full left-8 z-30 mb-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
            {PICKERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMenu("");
                  inputs.current[id]?.click();
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon className="h-4 w-4 text-gray-500" /> {label}
              </button>
            ))}
          </div>
        )}

        {PICKERS.map(({ id, accept }) => (
          <input
            key={id}
            ref={(node) => {
              inputs.current[id] = node;
            }}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        ))}
      </div>

      {(staged.length > 0 || location) && (
        <div className="flex flex-wrap gap-2">
          {staged.map((item) => {
            const Icon = iconFor(guessKind(item.file));

            return (
              <div
                key={item.key}
                className={`relative flex max-w-full items-center gap-2 rounded-xl border px-2 py-1.5 pr-8 text-xs ${
                  item.status === "error" ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500">
                    <Icon className="h-5 w-5" />
                  </span>
                )}

                <span className="min-w-0">
                  <span className="block max-w-[11rem] truncate font-medium text-gray-800">{item.file.name}</span>
                  <span className={item.status === "error" ? "text-red-600" : "text-gray-500"}>
                    {item.status === "uploading" && `Envoi… ${item.progress}%`}
                    {item.status === "done" && formatSize(item.file.size)}
                    {item.status === "error" && (item.error ?? "Échec")}
                  </span>
                </span>

                {item.status === "uploading" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-gray-200">
                    <span className="block h-full bg-blue-600 transition-all" style={{ width: `${item.progress}%` }} />
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removeStaged(item)}
                  className="absolute right-1 top-1 rounded-full p-1 text-gray-500 hover:bg-gray-200"
                  aria-label="Retirer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {location && (
            <div className="relative flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5 pr-8 text-xs">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <MapPin className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-medium text-gray-800">Ma position actuelle</span>
                <span className="text-gray-500">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±{Math.round(location.accuracy)} m
                </span>
              </span>
              <button
                type="button"
                onClick={() => setLocation(null)}
                className="absolute right-1 top-1 rounded-full p-1 text-gray-500 hover:bg-emerald-100"
                aria-label="Retirer la position"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
        )}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={sending || uploading || empty}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {uploading ? "Envoi des fichiers…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
