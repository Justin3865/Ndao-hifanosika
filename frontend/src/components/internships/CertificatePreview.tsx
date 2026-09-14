"use client";

interface CertificatePreviewProps {
  internName: string;
  project: string;
  startDate: string;
  endDate: string;
  reference?: string;
}

export default function CertificatePreview({
  internName,
  project,
  startDate,
  endDate,
  reference,
}: CertificatePreviewProps) {
  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-3xl border-4 border-gray-200 p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest">
          Ndao Hifanosika
        </p>

        <h1 className="mt-8 text-3xl font-bold">
          CERTIFICAT DE STAGE
        </h1>

        <p className="mt-8 text-gray-600">
          Certifie que
        </p>

        <h2 className="my-4 text-2xl font-bold">
          {internName}
        </h2>

        <p className="mx-auto max-w-xl text-gray-600">
          a effectué un stage au sein de Ndao Hifanosika
          dans le cadre du projet
        </p>

        <p className="mt-4 text-xl font-semibold">
          {project}
        </p>

        <p className="mt-6 text-gray-600">
          du <strong>{startDate}</strong> au{" "}
          <strong>{endDate}</strong>.
        </p>

        {reference && (
          <p className="mt-8 text-xs text-gray-500">
            Référence : {reference}
          </p>
        )}

        <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
          <div className="border-t pt-3">
            Responsable RH
          </div>

          <div className="border-t pt-3">
            Direction
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Générer le certificat
        </button>
      </div>
    </div>
  );
}