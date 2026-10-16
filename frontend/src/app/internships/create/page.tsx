"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { internshipsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={internshipsConfig} mode="create" />;
}
