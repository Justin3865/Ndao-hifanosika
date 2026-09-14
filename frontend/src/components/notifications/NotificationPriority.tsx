export type NotificationPriorityValue =
  | "low"
  | "normal"
  | "high"
  | "urgent";

interface NotificationPriorityProps {
  priority: NotificationPriorityValue;
}

export default function NotificationPriority({
  priority,
}: NotificationPriorityProps) {
  const config = {
    low: {
      label: "Faible",
      className: "text-gray-500",
    },
    normal: {
      label: "Normale",
      className: "text-blue-600",
    },
    high: {
      label: "Haute",
      className: "text-orange-600",
    },
    urgent: {
      label: "Urgente",
      className: "font-semibold text-red-600",
    },
  };

  const item = config[priority];

  return (
    <span className={`text-xs ${item.className}`}>
      • {item.label}
    </span>
  );
}