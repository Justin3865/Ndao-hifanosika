"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { campaignsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={campaignsConfig} />;
}
