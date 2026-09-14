export type NotificationTypeValue =
  | "system"
  | "project"
  | "activity"
  | "evaluation"
  | "report"
  | "internship"
  | "beneficiary"
  | "user"
  | "reminder"
  | "ai";

interface NotificationTypeProps {
  type: NotificationTypeValue;
}

const types = {
  system: "Système",
  project: "Projet",
  activity: "Activité",
  evaluation: "Évaluation",
  report: "Rapport",
  internship: "Stage",
  beneficiary: "Bénéficiaire",
  user: "Utilisateur",
  reminder: "Rappel",
  ai: "IA",
};

export default function NotificationType({
  type,
}: NotificationTypeProps) {
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
      {types[type]}
    </span>
  );
}