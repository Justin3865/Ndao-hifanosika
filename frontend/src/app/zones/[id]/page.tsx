"use client";

import { useParams } from "next/navigation";
import { ResourceDetailPage } from "@/components/crud/ResourceDetailPage";
import { zonesConfig } from "@/lib/resources";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ResourceDetailPage config={zonesConfig} id={params.id} />;
}
