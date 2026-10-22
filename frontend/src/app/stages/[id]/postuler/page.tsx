"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";
import {
  InternshipOffer,
  apiRequest,
  formatDate,
  getStoredUser,
  goToAuth,
  isClosed,
} from "@/lib/stages";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B8FAE] focus:ring-2 focus:ring-[#1B8FAE]/20";

export default function PostulerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [allowed, setAllowed] = useState(false);
  const [offer, setOffer] = useState<InternshipOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [level, setLevel] = useState("");
  const [motivation, setMotivation] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  /* ROUTE PROTÉGÉE : connexion ou inscription obligatoire */
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      goToAuth(router, pathname, "login");
      return;
    }
    setAllowed(true);
  }, [router, pathname]);

  useEffect(() => {
    if (!allowed || !id) return;

    (async () => {
      try {
        const data = await apiRequest(`/internship-offers/${id}`);
        setOffer(data.data ?? data);
      } catch (e: any) {
        if (e?.status === 401) {
          goToAuth(router, pathname, "login");
          return;
        }
        setError(e?.message || "Ce stage est introuvable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed, id, router, pathname]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!motivation.trim()) {
      setError("Veuillez rédiger votre lettre de motivation.");
      return;
    }

    setSending(true);
    try {
      await apiRequest(`/internship-offers/${id}/applications`, {
        method: "POST",
        body: JSON.stringify({
          phone: phone.trim() || null,
          school: school.trim() || null,
          level: level.trim() || null,
          motivation: motivation.trim(),
        }),
      });
      setSent(true);
    } catch (e: any) {
      if (e?.status === 401) {
        goToAuth(router, pathname, "login");
        return;
      }
      setError(e?.message || "Impossible d'envoyer votre candidature.");
    } finally {
      setSending(false);
    }
  };

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Vérification de votre connexion...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/stages"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#1F5FA0]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux stages
        </Link>

        {loading && (
          <p className="mt-10 text-center text-sm text-gray-500">
            Chargement...
          </p>
        )}

        {!loading && !offer && (
          <div className="mt-8 rounded-2xl border border-[#D01C7F]/30 bg-[#D01C7F]/5 p-6 text-center text-sm text-[#D01C7F]">
            {error || "Ce stage est introuvable."}
          </div>
        )}

        {offer && (
          <>
            <div className="mt-6 rounded-2xl border border-[#1B8FAE]/20 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold">{offer.title}</h1>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {offer.description}
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                {offer.location && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#1B8FAE]" />
                    {offer.location}
                  </li>
                )}
                {offer.duration && (
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#1B8FAE]" />
                    {offer.duration}
                  </li>
                )}
                {offer.deadline && (
                  <li
                    className={`flex items-center gap-2 font-medium ${
                      isClosed(offer) ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Date limite : {formatDate(offer.deadline)}
                  </li>
                )}
              </ul>
            </div>

            {sent ? (
              <div className="mt-6 rounded-2xl border border-[#1B8FAE]/30 bg-white p-8 text-center shadow-sm">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#1B8FAE]" />
                <h2 className="mt-4 text-xl font-bold">
                  Candidature envoyée
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Merci ! Nous étudierons votre candidature et reviendrons
                  vers vous.
                </p>
                <Link
                  href="/stages"
                  className="mt-6 inline-block rounded-xl bg-[#1F5FA0] px-5 py-3 text-sm font-bold text-white hover:bg-[#194d82]"
                >
                  Voir les autres stages
                </Link>
              </div>
            ) : isClosed(offer) ? (
              <div className="mt-6 rounded-2xl bg-red-50 p-6 text-center text-sm font-semibold text-red-600">
                Candidature terminée : les candidatures pour ce stage sont fermées.
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold">Votre candidature</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Téléphone
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="034 00 000 00"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Niveau d&apos;études
                    </label>
                    <input
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      placeholder="Ex : Licence 3"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Établissement
                  </label>
                  <input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Université / école"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Lettre de motivation *
                  </label>
                  <textarea
                    rows={6}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Expliquez pourquoi ce stage vous intéresse..."
                    className={inputClass}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-[#D01C7F]/10 px-4 py-3 text-sm text-[#D01C7F]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-xl bg-[#D01C7F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b3176c] disabled:opacity-60"
                >
                  {sending ? "Envoi..." : "Envoyer ma candidature"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
