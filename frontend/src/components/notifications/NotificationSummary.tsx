import {
  Archive,
  Bell,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface NotificationSummaryProps {
  total: number;
  unread: number;
  archived: number;
  urgent: number;
}

export default function NotificationSummary({
  total,
  unread,
  archived,
  urgent,
}: NotificationSummaryProps) {
  const cards = [
    {
      label: "Total",
      value: total,
      icon: Bell,
      className: "bg-blue-50 text-blue-600",
    },
    {
      label: "Non lues",
      value: unread,
      icon: CheckCircle2,
      className: "bg-green-50 text-green-600",
    },
    {
      label: "Urgentes",
      value: urgent,
      icon: AlertTriangle,
      className: "bg-red-50 text-red-600",
    },
    {
      label: "Archivées",
      value: archived,
      icon: Archive,
      className: "bg-gray-100 text-gray-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-xl border bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {card.label}
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
              </div>

              <div className={`rounded-lg p-3 ${card.className}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}