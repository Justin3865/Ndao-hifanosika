"use client";

import { Brain, Copy, FileText } from "lucide-react";
import { useState } from "react";

interface SummaryResultProps {
  title?: string;
  summary: string;
  generatedAt?: string;
}

export default function SummaryResult({
  title = "Synthèse générée par l'IA",
  summary,
  generatedAt,
}: SummaryResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
            <Brain className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              {title}
            </h3>

            {generatedAt && (
              <p className="text-xs text-gray-500">
                Générée le {generatedAt}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
        >
          <Copy className="h-4 w-4" />

          {copied ? "Copié" : "Copier"}
        </button>
      </div>

      <div className="p-5">
        <div className="flex gap-3">
          <FileText className="mt-1 h-5 w-5 shrink-0 text-gray-400" />

          <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
}