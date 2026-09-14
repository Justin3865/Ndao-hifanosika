"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Save,
} from "lucide-react";

import {
  Internship,
  getInternshipById,
  saveInternshipEvaluation,
} from "@/lib/internships";

export default function InternshipEvaluationPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [internship, setInternship] =
    useState<Internship | null>(null);

  const [technicalSkills, setTechnicalSkills] =
    useState(5);

  const [communication, setCommunication] =
    useState(5);

  const [teamwork, setTeamwork] = useState(5);

  const [punctuality, setPunctuality] = useState(5);

  const [autonomy, setAutonomy] = useState(5);

  const [comments, setComments] = useState("");

  const [evaluator, setEvaluator] = useState("");

  useEffect(() => {
    const data = getInternshipById(id);

    if (!data) {
      return;
    }

    setInternship(data);

    if (data.evaluation) {
      setTechnicalSkills(
        data.evaluation.technicalSkills
      );

      setCommunication(
        data.evaluation.communication
      );

      setTeamwork(data.evaluation.teamwork);

      setPunctuality(
        data.evaluation.punctuality
      );

      setAutonomy(data.evaluation.autonomy);

      setComments(data.evaluation.comments);

      setEvaluator(data.evaluation.evaluator);
    }
  }, [id]);

  const score =
    (
      (technicalSkills +
        communication +
        teamwork +
        punctuality +
        autonomy) /
      5
    ).toFixed(2);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!evaluator.trim()) {
      alert("Veuillez indiquer l'évaluateur.");

      return;
    }

    saveInternshipEvaluation(id, {
      technicalSkills,
      communication,
      teamwork,
      punctuality,
      autonomy,
      comments,
      evaluator,
      evaluationDate: new Date()
        .toISOString()
        .split("T")[0],
    });

    router.push(`/internships/${id}`);
  }

  if (!internship) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-xl bg-white p-10 text-center">
          <p>Stage introuvable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href={`/internships/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au stage
        </Link>

        <section className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
                <ClipboardCheck className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Évaluation du stage
                </h1>

                <p className="text-sm text-gray-500">
                  {internship.internName} —{" "}
                  {internship.reference}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-7 p-6"
          >
            <div className="rounded-xl bg-purple-50 p-5 text-center">
              <p className="text-sm text-purple-700">
                Score global
              </p>

              <p className="mt-1 text-4xl font-bold text-purple-700">
                {score}
                <span className="text-lg">/10</span>
              </p>
            </div>

            <div className="space-y-5">
              <Rating
                label="Compétences techniques"
                value={technicalSkills}
                onChange={setTechnicalSkills}
              />

              <Rating
                label="Communication"
                value={communication}
                onChange={setCommunication}
              />

              <Rating
                label="Travail en équipe"
                value={teamwork}
                onChange={setTeamwork}
              />

              <Rating
                label="Ponctualité"
                value={punctuality}
                onChange={setPunctuality}
              />

              <Rating
                label="Autonomie"
                value={autonomy}
                onChange={setAutonomy}
              />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                Évaluateur *
              </span>

              <input
                value={evaluator}
                onChange={(event) =>
                  setEvaluator(event.target.value)
                }
                placeholder="Nom du responsable"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                Commentaires
              </span>

              <textarea
                rows={6}
                value={comments}
                onChange={(event) =>
                  setComments(event.target.value)
                }
                placeholder="Commentaires et recommandations..."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500"
              />
            </label>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
              <Link
                href={`/internships/${id}`}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700"
              >
                Annuler
              </Link>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
              >
                <Save className="h-4 w-4" />
                Enregistrer l'évaluation
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Rating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>

        <span className="font-bold text-purple-700">
          {value}/10
        </span>
      </div>

      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="w-full accent-purple-600"
      />

      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}