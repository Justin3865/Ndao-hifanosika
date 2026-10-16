"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { beneficiariesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={beneficiariesConfig} mode="create" />;
}
