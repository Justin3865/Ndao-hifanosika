"use client";

import { useRouter } from "next/navigation";

import ProjectForm, {
  type ProjectFormData,
} from "@/components/projects/ProjectForm";

export default function CreateProjectPage() {
  const router = useRouter();

  async function handleSubmit(
    data: ProjectFormData
  ) {
    console.log("Création du projet :", data);

    /*
     * Plus tard :
     *
     * await fetch("/api/projects", {
     *   method: "POST",
     *   headers: {
     *     "Content-Type": "application/json",
     *   },
     *   body: JSON.stringify(data),
     * });
     */

    router.push("/projects");
  }

  function handleCancel() {
    router.push("/projects");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Créer un projet
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Ajouter un nouveau projet ou programme à la
          plateforme Ndao Hifanosika.
        </p>
      </div>

      <ProjectForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </main>
  );
}