"use client";

import { useParams } from "next/navigation";
import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { milestonesConfig } from "@/lib/resources";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ResourceFormPage config={milestonesConfig} mode="edit" id={params.id} />;
}
