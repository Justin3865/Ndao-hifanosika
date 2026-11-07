"use client";

import { useParams } from "next/navigation";
import { ResourceDetailPage } from "@/components/crud/ResourceDetailPage";
import PresenceJournal from "@/components/presence/PresenceJournal";
import { membersConfig } from "@/lib/resources";

export default function Page() {
  const params = useParams<{ id: string }>();

  // Fiche membre + « Présence et tâches » (journal GPS, tâches du jour) ; l'API masque la section si le rôle n'y a pas accès
  const config = {
    ...membersConfig,
    extra: (item: Parameters<NonNullable<typeof membersConfig.extra>>[0]) => (
      <>
        {membersConfig.extra?.(item)}
        <div className="mt-6">
          <PresenceJournal userId={String((item as { id: number | string }).id)} />
        </div>
      </>
    ),
  };

  return <ResourceDetailPage config={config} id={params.id} />;
}
