"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { evaluationsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={evaluationsConfig} />;
}
