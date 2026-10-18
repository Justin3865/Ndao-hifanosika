"use client";

import { useParams } from "next/navigation";
import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { zonesConfig } from "@/lib/resources";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ResourceFormPage config={zonesConfig} mode="edit" id={params.id} />;
}
