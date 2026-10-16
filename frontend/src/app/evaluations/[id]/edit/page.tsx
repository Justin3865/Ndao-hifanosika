"use client";

import { useParams } from "next/navigation";
import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { evaluationsConfig } from "@/lib/resources";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ResourceFormPage config={evaluationsConfig} mode="edit" id={params.id} />;
}
