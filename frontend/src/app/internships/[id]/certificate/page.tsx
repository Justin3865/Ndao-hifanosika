"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Le certificat de stage est désormais délivré (avec QR code) depuis le module Certificats.
export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/certificates/create?internshipId=${params.id}`);
  }, [params.id, router]);

  return null;
}
