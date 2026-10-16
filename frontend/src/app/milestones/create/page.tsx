"use client";

import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { milestonesConfig } from "@/lib/resources";

export default function Page() {
  return <ResourceFormPage config={milestonesConfig} mode="create" />;
}
