"use client";

import { AppLayout } from "@/components/layout";
import { MyInternshipSpace } from "@/components/monitoring/MyInternshipSpace";

/** Espace du stagiaire : sa frise de stage, son agenda quotidien, ses tâches et ses objectifs individuels. */
export default function MonStagePage() {
  return (
    <AppLayout>
      <MyInternshipSpace />
    </AppLayout>
  );
}
