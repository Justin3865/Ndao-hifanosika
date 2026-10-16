"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { departementsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={departementsConfig} />;
}
