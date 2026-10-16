"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { departementsConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={departementsConfig} mode="create" />;
}
