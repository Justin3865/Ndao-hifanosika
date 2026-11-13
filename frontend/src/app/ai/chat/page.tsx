"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Copy, Pencil, Send, User } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapLine, MapMarker } from "@/components/maps/GoogleMap";
import { errorMessage } from "@/lib/crud";
import { toast } from "@/lib/toast";
import { scoreColor } from "@/lib/useLiveTargets";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { Lang } from "@/lib/i18n/dictionaries";

interface Answer {
  reply: string;
  table?: { columns: string[]; rows: Array<Array<string | number>> };
  map?: {
    points: Array<{ id: string; latitude: number; longitude: number; label: string; kind: "household" | "staff"; score?: number; altitude?: number | null; info?: string }>;
    lines: Array<{ from: string; to: string; label: string }>;
  };
  suggestions: string[];
}

interface Message {
  role: "user" | "bot";
  text: string;
  answer?: Answer;
}

function ResultMap({ answer }: { answer: Answer }) {
  const markers: MapMarker[] = useMemo(
    () =>
      (answer.map?.points ?? []).map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        title: p.label,
        color: p.kind === "staff" ? "#1d4ed8" : scoreColor(p.score ?? 0),
        shape: p.kind === "staff" ? "square" : "circle",
        radius: p.kind === "staff" ? 9 : 10,
        info: `${p.info ?? ""}${p.altitude !== null && p.altitude !== undefined ? ` · altitude ${Math.round(p.altitude)} m` : ""}`,
      })),
    [answer]
  );

  const lines: MapLine[] = useMemo(() => {
    const points = answer.map?.points ?? [];

    return (answer.map?.lines ?? []).flatMap((line, index) => {
      const from = points.find((p) => p.id === line.from);
      const to = points.find((p) => p.id === line.to);
      if (!from || !to) return [];

      return [{ id: `l${index}`, from: { latitude: from.latitude, longitude: from.longitude }, to: { latitude: to.latitude, longitude: to.longitude }, label: line.label }];
    });
  }, [answer]);

  if (markers.length === 0) return null;

  return <GoogleMap markers={markers} lines={lines} height={320} refit className="mt-3" />;
}

// Textes de l'assistant par langue d'interface. Les réponses du serveur sont déjà rédigées dans la langue de la question.
const TEXTS: Record<Lang, { hello: string; suggestions: string[]; placeholder: string; send: string; busy: string; title: string; subtitle: string; unavailable: string; edit: string; cancel: string; copy: string; copied: string; copyFail: string }> = {
  fr: {
    hello: "Bonjour ! Je réponds en français, anglais ou malagasy : chiffres et état des projets, activités, bénéficiaires, évaluations et stages ; ménages vulnérables ; comparaison de zones ; agent le plus proche ; mode d'emploi de la plateforme ; traduction FR / EN / MG.",
    suggestions: ["Combien de projets sont actifs ?", "Quels sont les ménages les plus vulnérables ?", "Comment ajouter un bénéficiaire ?", "Traduis « Enregistrer » en malgache"],
    placeholder: "Posez votre question (FR / EN / MG)...", send: "Envoyer", busy: "Analyse en cours...", title: "Assistant du projet",
    subtitle: "Données réelles · mode d'emploi · traduction FR / EN / MG · carte et GPS", unavailable: "Le chatbot est indisponible pour le moment.", edit: "Modifier le message", cancel: "Annuler", copy: "Copier", copied: "Copié", copyFail: "Copie impossible : sélectionnez le texte à la main.",
  },
  en: {
    hello: "Hello! I answer in French, English or Malagasy: figures and status of projects, activities, beneficiaries, evaluations and internships; vulnerable households; zone comparison; closest agent; how to use the platform; FR / EN / MG translation.",
    suggestions: ["How many projects are active?", "Which households are the most vulnerable?", "How do I add a beneficiary?", "Translate “Save” into Malagasy"],
    placeholder: "Ask your question (FR / EN / MG)...", send: "Send", busy: "Analysing...", title: "Project assistant",
    subtitle: "Real data · how-to help · FR / EN / MG translation · map and GPS", unavailable: "The chatbot is unavailable at the moment.", edit: "Edit message", cancel: "Cancel", copy: "Copy", copied: "Copied", copyFail: "Copy failed: select the text manually.",
  },
  mg: {
    hello: "Salama! Mamaly amin'ny teny malagasy, frantsay na anglisy aho: isa sy toetran'ny tetikasa, hetsika, mpahazo tombontsoa, fanombanana ary stage; tokantrano marefo; fampitahana faritra; mpiasa akaiky indrindra; torolalana momba ny sehatra; fandikana FR / EN / MG.",
    suggestions: ["Firy ny tetikasa mavitrika?", "Iza avy ireo tokantrano marefo indrindra?", "Ahoana no hanampiana mpahazo tombontsoa?", "Adikao amin'ny frantsay: Tahirizina"],
    placeholder: "Soraty ny fanontanianao (FR / EN / MG)...", send: "Alefa", busy: "Eo am-pandalinana...", title: "Mpanampy ny tetikasa",
    subtitle: "Angona tena izy · torolalana · fandikana FR / EN / MG · sarintany sy GPS", unavailable: "Tsy mandeha ny chatbot amin'izao fotoana izao.", edit: "Ovay ny hafatra", cancel: "Foanana", copy: "Adikao", copied: "Voadika", copyFail: "Tsy azo adika : fidio tanana ny soratra.",
  },
};

const greeting = (lang: Lang): Message => ({ role: "bot", text: TEXTS[lang].hello, answer: { reply: "", suggestions: TEXTS[lang].suggestions } });

export default function ChatbotPage() {
  const { lang } = useI18n();
  const T = TEXTS[lang];
  const [messages, setMessages] = useState<Message[]>([greeting(lang)]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // Modification d'un message déjà envoyé (comme dans Claude) : index du message + brouillon
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Tant que la conversation n'a pas commencé, l'accueil suit la langue de l'interface.
  useEffect(() => {
    setMessages((cur) => (cur.length === 1 ? [greeting(lang)] : cur));
  }, [lang]);

  // replaceFrom : index du message modifié. Il est remplacé et tout ce qui le suit (anciennes réponses) est supprimé.
  const ask = async (question: string, replaceFrom?: number) => {
    if (!question.trim() || busy) return;

    setMessages((cur) => [...(replaceFrom === undefined ? cur : cur.slice(0, replaceFrom)), { role: "user", text: question }]);
    setInput("");
    setBusy(true);

    try {
      const res = await api.post("/ai/chat", { message: question, lang });
      const answer = res.data.data as Answer;
      setMessages((cur) => [...cur, { role: "bot", text: answer.reply, answer }]);
    } catch (err) {
      setMessages((cur) => [...cur, { role: "bot", text: errorMessage(err, T.unavailable) }]);
    } finally {
      setBusy(false);
    }
  };

  const copyMessage = async (index: number, text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Contexte non sécurisé (http) : repli sur l'ancienne méthode
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        if (!ok) throw new Error("copy");
      }
      setCopied(index);
      window.setTimeout(() => setCopied((cur) => (cur === index ? null : cur)), 1500);
    } catch {
      toast.warning(T.copyFail);
    }
  };

  const startEdit = (index: number, text: string) => {
    if (busy) return;
    setEditing(index);
    setDraft(text);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEdit = () => {
    const text = draft.trim();
    if (editing === null || !text || busy) return;

    const index = editing;
    cancelEdit();
    void ask(text, index);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  const last = messages[messages.length - 1];

  return (
    <AppLayout>
      <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-4xl flex-col rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white"><Bot className="h-6 w-6" /></span>
          <div>
            <h1 className="font-bold text-gray-900" data-no-translate>{T.title}</h1>
            <p className="text-xs text-gray-500" data-no-translate>{T.subtitle}</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5" data-no-translate>
          {messages.map((m, index) => (
            <div key={index} className={`group flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>

              {editing === index ? (
                <div className="w-full max-w-[85%] space-y-2 rounded-2xl border border-blue-300 bg-white p-3">
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Escape") cancelEdit();
                      else if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit();
                      }
                    }}
                    maxLength={500}
                    rows={Math.min(6, Math.max(2, draft.split("\n").length))}
                    aria-label={T.edit}
                    className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={cancelEdit} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      {T.cancel}
                    </button>
                    <button type="button" onClick={saveEdit} disabled={!draft.trim()} className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
                      {T.send}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={m.role === "user" ? "flex min-w-0 max-w-[85%] flex-col items-end gap-1" : "contents"}>
              <div className={`${m.role === "user" ? "max-w-full" : "max-w-[85%]"} space-y-2 rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-blue-800 text-white" : "bg-slate-50 text-gray-800"}`}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>

                {m.answer?.table && (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>{m.answer.table.columns.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold">{c}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-800">
                        {m.answer.table.rows.map((row, i) => (
                          <tr key={i}>{row.map((cell, j) => <td key={j} className="px-3 py-2">{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {m.answer && <ResultMap answer={m.answer} />}
              </div>

              {/* Actions sous le message : copier + modifier (visibles au survol, toujours sur écran tactile) */}
              {m.role === "user" && (
                <div className="flex items-center gap-1 pr-1 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => void copyMessage(index, m.text)}
                    title={copied === index ? T.copied : T.copy}
                    aria-label={copied === index ? T.copied : T.copy}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    {copied === index ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  {!busy && (
                    <button
                      type="button"
                      onClick={() => startEdit(index, m.text)}
                      title={T.edit}
                      aria-label={T.edit}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
                </div>
              )}
            </div>
          ))}

          {busy && <p className="text-sm text-gray-400">{T.busy}</p>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-gray-100 p-4">
          {last?.answer?.suggestions && (
            <div className="mb-3 flex flex-wrap gap-2" data-no-translate>
              {last.answer.suggestions.map((s) => (
                <button key={s} type="button" onClick={() => void ask(s)} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={T.placeholder} data-no-translate
              maxLength={500}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
            <button type="submit" disabled={busy || !input.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
              <Send className="h-4 w-4" /> <span data-no-translate>{T.send}</span>
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
