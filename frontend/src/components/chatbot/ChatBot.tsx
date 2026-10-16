"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";

type Msg = { role: "user" | "bot"; text: string };
const SUGGESTIONS = ["Quelle zone est la plus vulnérable ?", "Compare Fianarantsoa et Tamatave", "Zones par altitude"];

/** Assistant de comparaison — répond avec les données réelles du backend. */
export default function ChatBot({ onZones }: { onZones?: (zoneIds: number[]) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Bonjour ! Demandez-moi de comparer des zones ou de trouver les plus vulnérables." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.post("/ai/chat", { message });
      setMessages((m) => [...m, { role: "bot", text: res.data?.data?.answer ?? "Aucune réponse." }]);
      onZones?.((res.data?.data?.zones ?? []).map((z: { id: number }) => z.id));
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: errorMessage(err, "Service indisponible.") }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">
        <Bot className="h-5 w-5 text-blue-600" /> Assistant comparaison
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${m.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
            {m.text}
          </div>
        ))}
        {busy && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        <div ref={endRef} />
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-blue-200 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50">{s}</button>
        ))}
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-gray-100 p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Votre question…" className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-4 text-white disabled:opacity-50" aria-label="Envoyer"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
