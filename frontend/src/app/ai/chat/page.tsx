"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapLine, MapMarker } from "@/components/maps/GoogleMap";
import { errorMessage } from "@/lib/crud";
import { scoreColor } from "@/lib/useLiveTargets";

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

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Bonjour ! Je peux classer les ménages les plus vulnérables, comparer des zones (ex. Ankalamavony et Andrainjato), trouver l'agent le plus proche et vous donner l'altitude. Je comprends le français et le malgache.",
      answer: {
        reply: "",
        suggestions: [
          "Quels sont les ménages les plus vulnérables ?",
          "Compare Fianarantsoa et Antananarivo",
          "Quel agent est le plus proche du ménage prioritaire ?",
          "Quelle est la fiabilité du modèle ?",
        ],
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;

    setMessages((cur) => [...cur, { role: "user", text: question }]);
    setInput("");
    setBusy(true);

    try {
      const res = await api.post("/ai/chat", { message: question });
      const answer = res.data.data as Answer;
      setMessages((cur) => [...cur, { role: "bot", text: answer.reply, answer }]);
    } catch (err) {
      setMessages((cur) => [...cur, { role: "bot", text: errorMessage(err, "Le chatbot est indisponible pour le moment.") }]);
    } finally {
      setBusy(false);
    }
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
            <h1 className="font-bold text-gray-900">Assistant vulnérabilité</h1>
            <p className="text-xs text-gray-500">Données réelles · modèles SGD + réseau de neurones · carte et GPS</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {messages.map((m, index) => (
            <div key={index} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>

              <div className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-blue-800 text-white" : "bg-slate-50 text-gray-800"}`}>
                <p>{m.text}</p>

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
            </div>
          ))}

          {busy && <p className="text-sm text-gray-400">Analyse en cours...</p>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-gray-100 p-4">
          {last?.answer?.suggestions && (
            <div className="mb-3 flex flex-wrap gap-2">
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
              placeholder="Posez votre question (FR / MG)..."
              maxLength={500}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
            <button type="submit" disabled={busy || !input.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
              <Send className="h-4 w-4" /> Envoyer
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
