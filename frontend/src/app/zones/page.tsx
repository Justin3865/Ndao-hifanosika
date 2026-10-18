"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { zonesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={zonesConfig} />;
}
