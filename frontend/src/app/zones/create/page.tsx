"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { zonesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={zonesConfig} mode="create" />;
}
