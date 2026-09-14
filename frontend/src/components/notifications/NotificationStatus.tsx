import NotificationBadge from "./NotificationBadge";
import type { NotificationStatus as Status } from "./NotificationItem";

interface NotificationStatusProps {
  status: Status;
}

export default function NotificationStatus({
  status,
}: NotificationStatusProps) {
  const config = {
    unread: {
      label: "Non lu",
      variant: "blue" as const,
    },
    read: {
      label: "Lu",
      variant: "green" as const,
    },
    archived: {
      label: "Archivé",
      variant: "gray" as const,
    },
  };

  const item = config[status];

  return (
    <NotificationBadge
      label={item.label}
      variant={item.variant}
    />
  );
}