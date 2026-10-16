"use client";

import { useParams } from "next/navigation";
import { ResourceDetailPage } from "@/components/crud/ResourceDetailPage";
import { membersConfig } from "@/lib/resources";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <ResourceDetailPage config={membersConfig} id={params.id} />;
}
