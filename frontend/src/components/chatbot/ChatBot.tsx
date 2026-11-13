"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { Lang } from "@/lib/i18n/dictionaries";

type Msg = { role: "user" | "bot"; text: string };
const TEXTS: Record<Lang, { hello: string; suggestions: string[]; title: string; placeholder: string; send: string; unavailable: string; none: string }> = {
  fr: { hello: "Bonjour ! Demandez-moi de comparer des zones, de trouver les plus vulnérables, ou comment utiliser la plateforme.", suggestions: ["Quelle zone est la plus vulnérable ?", "Compare Fianarantsoa et Tamatave", "Zones par altitude"], title: "Assistant comparaison", placeholder: "Votre question…", send: "Envoyer", unavailable: "Service indisponible.", none: "Aucune réponse." },
  en: { hello: "Hello! Ask me to compare zones, find the most vulnerable ones, or how to use the platform.", suggestions: ["Which zone is the most vulnerable?", "Compare Fianarantsoa and Tamatave", "Zones by altitude"], title: "Comparison assistant", placeholder: "Your question…", send: "Send", unavailable: "Service unavailable.", none: "No answer." },
  mg: { hello: "Salama! Angataho aho hampitaha faritra, hitady ny marefo indrindra, na hanazava ny fampiasana ny sehatra.", suggestions: ["Iza no faritra marefo indrindra?", "Ampitaho Fianarantsoa sy Tamatave", "Faritra araka ny haavo"], title: "Mpanampy fampitahana", placeholder: "Ny fanontanianao…", send: "Alefa", unavailable: "Tsy mandeha ny serivisy.", none: "Tsy misy valiny." },
};

/** Assistant de comparaison — répond avec les données réelles du backend. */
export default function ChatBot({ onZones }: { onZones?: (zoneIds: number[]) => void }) {
  const { lang } = useI18n();
  const T = TEXTS[lang];
  const [messages, setMessages] = useState<Msg[]>([{ role: "bot", text: T.hello }]);
  useEffect(() => setMessages((m) => (m.length === 1 ? [{ role: "bot", text: T.hello }] : m)), [T]);
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
      const res = await api.post("/ai/chat", { message, lang });
      const data = res.data?.data;
      const rows = (data?.table?.rows ?? [])
        .slice(0, 5)
        .map((row: Array<string | number>) => `• ${row.join(" · ")}`)
        .join("\n");

      setMessages((m) => [...m, { role: "bot", text: [data?.reply, rows].filter(Boolean).join("\n\n") || T.none }]);
      onZones?.(Array.isArray(data?.zoneIds) ? data.zoneIds : []);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: errorMessage(err, T.unavailable) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">
        <Bot className="h-5 w-5 text-blue-600" /> <span data-no-translate>{T.title}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" data-no-translate>
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 whitespace-pre-line ${m.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
            {m.text}
          </div>
        ))}
        {busy && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        <div ref={endRef} />
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {T.suggestions.map((s) => (
          <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-blue-200 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50">{s}</button>
        ))}
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-gray-100 p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={T.placeholder} className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-4 text-white disabled:opacity-50" aria-label={T.send}><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
