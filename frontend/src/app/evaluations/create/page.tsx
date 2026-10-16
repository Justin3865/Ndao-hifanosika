"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { evaluationsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={evaluationsConfig} mode="create" />;
}
