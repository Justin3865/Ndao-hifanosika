"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  Printer,
} from "lucide-react";

import {
  Internship,
  formatInternshipDate,
  getInternshipById,
  issueCertificate,
} from "@/lib/internships";

export default function InternshipCertificatePage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [internship, setInternship] =
    useState<Internship | null>(null);

  useEffect(() => {
    setInternship(
      getInternshipById(id) ?? null
    );
  }, [id]);

  function handleGenerate() {
    if (!internship) {
      return;
    }

    const updated = issueCertificate(
      internship.id
    );

    setInternship(updated ?? null);
  }

  function handlePrint() {
    window.print();
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
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="print:hidden">
          <Link
            href={`/internships/${id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au stage
          </Link>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3 print:hidden">
          {!internship.certificateIssued && (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600"
            >
              <Award className="h-4 w-4" />
              Générer le certificat
            </button>
          )}

          {internship.certificateIssued && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              Imprimer / PDF
            </button>
          )}
        </div>

        {!internship.certificateIssued ? (
          <section className="rounded-2xl bg-white p-12 text-center shadow-sm print:hidden">
            <Award className="mx-auto h-16 w-16 text-yellow-500" />

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Certificat non encore délivré
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-gray-500">
              Le certificat sera généré lorsque le stage
              aura été validé.
            </p>

            <button
              type="button"
              onClick={handleGenerate}
              className="mt-6 rounded-lg bg-yellow-500 px-5 py-3 text-sm font-semibold text-white hover:bg-yellow-600"
            >
              Générer maintenant
            </button>
          </section>
        ) : (
          <>
            {/* Certificat */}
            <section
              id="certificate"
              className="border-8 border-double border-gray-300 bg-white p-8 shadow-lg md:p-16 print:border-4 print:shadow-none"
            >
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                  <Award className="h-10 w-10" />
                </div>

                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                  Ndao Hifanosika
                </p>

                <h1 className="mt-5 text-3xl font-bold uppercase tracking-wide text-gray-900 md:text-4xl">
                  Certificat de stage
                </h1>

                <div className="mx-auto mt-5 h-1 w-24 bg-yellow-500" />

                <p className="mt-10 text-lg text-gray-600">
                  Nous certifions par la présente que
                </p>

                <h2 className="mt-4 text-3xl font-bold text-gray-900">
                  {internship.internName}
                </h2>

                <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-600">
                  étudiant(e) à{" "}
                  <strong>
                    {internship.institution}
                  </strong>
                  , en{" "}
                  <strong>
                    {internship.level}
                  </strong>
                  , a effectué un stage au sein de
                  Ndao Hifanosika dans le département{" "}
                  <strong>
                    {internship.department}
                  </strong>
                  .
                </p>

                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-600">
                  Le stage s'est déroulé du{" "}
                  <strong>
                    {formatInternshipDate(
                      internship.startDate
                    )}
                  </strong>{" "}
                  au{" "}
                  <strong>
                    {formatInternshipDate(
                      internship.endDate
                    )}
                  </strong>
                  .
                </p>

                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-600">
                  Domaine :{" "}
                  <strong>{internship.field}</strong>
                </p>

                {internship.projectName && (
                  <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-600">
                    Projet :{" "}
                    <strong>
                      {internship.projectName}
                    </strong>
                  </p>
                )}

                <p className="mt-12 text-sm text-gray-500">
                  Fait pour servir et valoir ce que de
                  droit.
                </p>

                <div className="mt-16 grid grid-cols-2 gap-10">
                  <div>
                    <div className="mx-auto mb-3 h-px max-w-[180px] bg-gray-300" />

                    <p className="text-sm font-semibold text-gray-700">
                      Responsable
                    </p>
                  </div>

                  <div>
                    <div className="mx-auto mb-3 h-px max-w-[180px] bg-gray-300" />

                    <p className="text-sm font-semibold text-gray-700">
                      Direction
                    </p>
                  </div>
                </div>

                <div className="mt-12 text-xs text-gray-400">
                  Numéro du certificat :{" "}
                  {internship.certificateNumber}
                </div>
              </div>
            </section>

            <div className="flex items-center justify-center gap-2 text-sm text-green-600 print:hidden">
              <CheckCircle2 className="h-4 w-4" />
              Certificat généré avec succès.
            </div>
          </>
        )}
      </div>
    </main>
  );
}