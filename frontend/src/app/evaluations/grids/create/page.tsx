"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { gridsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={gridsConfig} mode="create" />;
}
