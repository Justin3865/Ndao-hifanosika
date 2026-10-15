import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-5xl font-bold text-gray-900">403</h1>
      <p className="text-gray-600">
        Vous n&apos;avez pas la permission d&apos;accéder à cette page.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
