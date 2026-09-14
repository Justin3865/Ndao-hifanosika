import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="flex flex-col gap-3 px-4 py-5 text-sm text-gray-500 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} Ndao Hifanosika. Tous droits réservés.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/about"
            className="transition hover:text-blue-600"
          >
            À propos
          </Link>

          <Link
            href="/contact"
            className="transition hover:text-blue-600"
          >
            Contact
          </Link>

          <Link
            href="/help"
            className="transition hover:text-blue-600"
          >
            Aide
          </Link>

          <Link
            href="/privacy"
            className="transition hover:text-blue-600"
          >
            Confidentialité
          </Link>
        </div>
      </div>
    </footer>
  );
}