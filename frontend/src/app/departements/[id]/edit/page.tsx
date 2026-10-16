"use client";

import { useParams } from "next/navigation";
import { ResourceFormPage } from "@/components/crud/ResourceFormPage";
import { departementsConfig } from "@/lib/resources";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ResourceFormPage config={departementsConfig} mode="edit" id={params.id} />;
}
