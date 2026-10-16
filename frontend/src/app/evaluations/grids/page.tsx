"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { gridsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={gridsConfig} />;
}
