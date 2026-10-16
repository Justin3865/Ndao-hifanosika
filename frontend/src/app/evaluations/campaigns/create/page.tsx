"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { campaignsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={campaignsConfig} mode="create" />;
}
