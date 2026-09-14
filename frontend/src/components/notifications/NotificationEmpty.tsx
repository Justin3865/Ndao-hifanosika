import { BellOff } from "lucide-react";

interface NotificationEmptyProps {
  title?: string;
  message?: string;
}

export default function NotificationEmpty({
  title = "Aucune notification",
  message = "Vous n'avez aucune notification à afficher.",
}: NotificationEmptyProps) {
  return (
    <div className="rounded-xl border bg-white p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <BellOff className="h-7 w-7 text-gray-400" />
      </div>

      <h3 className="mt-4 font-semibold text-gray-900">
        {title}
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        {message}
      </p>
    </div>
  );
}