"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { membersConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={membersConfig} />;
}
