"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { activitiesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={activitiesConfig} mode="create" />;
}
