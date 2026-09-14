interface NotificationBadgeProps {
  label: string;
  variant?: "blue" | "green" | "yellow" | "red" | "gray";
}

const variants = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-700",
};

export default function NotificationBadge({
  label,
  variant = "blue",
}: NotificationBadgeProps) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${variants[variant]}`}
    >
      {label}
    </span>
  );
}