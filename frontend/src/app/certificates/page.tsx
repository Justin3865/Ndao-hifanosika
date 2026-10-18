"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { certificatesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={certificatesConfig} />;
}
