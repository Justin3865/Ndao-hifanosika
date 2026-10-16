"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { projectsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={projectsConfig} />;
}
