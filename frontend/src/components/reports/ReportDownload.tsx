"use client";

import { Download } from "lucide-react";

interface ReportDownloadProps {
  url?: string;
  filename?: string;
  label?: string;
}

export default function ReportDownload({
  url,
  filename = "rapport",
  label = "Télécharger",
}: ReportDownloadProps) {
  if (!url) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-400"
      >
        <Download className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <a
      href={url}
      download={filename}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700"
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}