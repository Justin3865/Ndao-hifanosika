"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { projectsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={projectsConfig} mode="create" />;
}
