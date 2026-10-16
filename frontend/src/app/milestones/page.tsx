"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { milestonesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={milestonesConfig} />;
}
