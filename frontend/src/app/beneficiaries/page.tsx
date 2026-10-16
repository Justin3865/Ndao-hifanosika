"use client";

import { ResourceListPage } from "@/components/crud/ResourceListPage";
import { beneficiariesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceListPage config={beneficiariesConfig} />;
}
