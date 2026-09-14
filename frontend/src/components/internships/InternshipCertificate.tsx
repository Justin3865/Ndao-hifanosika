"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Download,
  Printer,
  Mail,
  Share2,
  GraduationCap,
  Check,
  Building2,
  Calendar,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface InternshipCertificateProps {
  certificateId: string;

  studentName: string;
  level: string;
  establishment: string;

  subject: string;

  startDate: string;
  endDate: string;
  issuedDate?: string;

  tutorName: string;
  tutorTitle: string;

  department: string;

  finalGrade: number;
  comments: string;

  location?: string;

  className?: string;

  onGenerate?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  onSend?: () => void;
  onShare?: () => void;

  isLoading?: boolean;
}

export function InternshipCertificate({
  certificateId,
  studentName,
  level,
  establishment,
  subject,
  startDate,
  endDate,
  issuedDate,
  tutorName,
  tutorTitle,
  department,
  finalGrade,
  comments,
  location = "Antananarivo",
  className,
  onGenerate,
  onDownload,
  onPrint,
  onSend,
  onShare,
  isLoading = false,
}: InternshipCertificateProps) {
  const [isGenerated, setIsGenerated] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isShared, setIsShared] = useState(false);

  /**
   * Numéro stable du certificat.
   *
   * IMPORTANT :
   * Il ne faut pas utiliser Math.random() ici.
   * Le numéro doit rester identique pendant toute la durée
   * de vie du certificat.
   */
  const certificateNumber = useMemo(() => {
    const year = new Date().getFullYear();

    return `CERT-${year}-${certificateId}`;
  }, [certificateId]);

  /**
   * Formatage des dates.
   */
  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  /**
   * Note sécurisée entre 0 et 20.
   */
  const safeGrade = Math.min(
    20,
    Math.max(0, finalGrade)
  );

  /**
   * Appréciation automatique.
   */
  const gradeLabel = useMemo(() => {
    if (safeGrade >= 16) return "Excellent";
    if (safeGrade >= 14) return "Très bien";
    if (safeGrade >= 12) return "Bien";
    if (safeGrade >= 10) return "Satisfaisant";

    return "À améliorer";
  }, [safeGrade]);

  /**
   * Génération.
   */
  const handleGenerate = () => {
    setIsGenerated(true);
    onGenerate?.();
  };

  /**
   * Envoi email.
   */
  const handleSend = () => {
    setIsSent(true);

    onSend?.();

    setTimeout(() => {
      setIsSent(false);
    }, 3000);
  };

  /**
   * Partage.
   */
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Attestation de stage",
          text: `Attestation de stage de ${studentName}`,
        });
      }

      setIsShared(true);
      onShare?.();

      setTimeout(() => {
        setIsShared(false);
      }, 3000);
    } catch {
      onShare?.();
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />

            <h2 className="text-2xl font-bold">
              Attestation de stage
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Génération et gestion de l'attestation de stage
            de {studentName}.
          </p>
        </div>

        <Badge
          variant="outline"
          className="w-fit gap-1"
        >
          <FileText className="h-3 w-3" />

          {certificateNumber}
        </Badge>
      </div>

      {/* =====================================================
          INFORMATIONS
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-4">
        <InfoCard
          icon={<User className="h-4 w-4" />}
          label="Stagiaire"
          value={studentName}
        />

        <InfoCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Niveau"
          value={level}
        />

        <InfoCard
          icon={<Building2 className="h-4 w-4" />}
          label="Établissement"
          value={establishment}
        />

        <InfoCard
          icon={<Calendar className="h-4 w-4" />}
          label="Département"
          value={department}
        />
      </div>

      {/* =====================================================
          CERTIFICAT
      ====================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Aperçu de l'attestation
          </CardTitle>

          <CardDescription>
            Prévisualisation du document officiel.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-8">
          <div
            id="internship-certificate"
            className="mx-auto max-w-4xl border-4 border-double border-border bg-white p-6 text-gray-900 shadow-sm md:p-12"
          >
            {/* -------------------------------------------------
                EN-TÊTE
            -------------------------------------------------- */}

            <div className="border-b pb-8 text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GraduationCap className="h-7 w-7" />
                </div>

                <div className="text-left">
                  <h1 className="text-xl font-bold md:text-2xl">
                    ONG Ndao Hifanosika
                  </h1>

                  <p className="text-sm text-muted-foreground">
                    Plateforme de Suivi & Évaluation
                  </p>
                </div>
              </div>

              <h2 className="mt-6 text-2xl font-bold uppercase tracking-wide md:text-3xl">
                Attestation de stage
              </h2>

              <p className="mt-3 text-sm text-muted-foreground">
                N° {certificateNumber}
              </p>
            </div>

            {/* -------------------------------------------------
                CORPS
            -------------------------------------------------- */}

            <div className="mt-8 space-y-5">
              <p className="text-sm leading-7 md:text-base">
                Je soussigné(e),{" "}
                <strong>{tutorName}</strong>,{" "}
                <strong>{tutorTitle}</strong> au sein de
                l'ONG Ndao Hifanosika, atteste que
                <strong> {studentName}</strong>, étudiant(e)
                en <strong>{level}</strong> à{" "}
                <strong>{establishment}</strong>, a effectué
                un stage au sein de notre organisation.
              </p>

              {/* Période */}

              <div className="grid gap-4 rounded-lg bg-muted/30 p-5 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Date de début
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatDate(startDate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Date de fin
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatDate(endDate)}
                  </p>
                </div>
              </div>

              {/* Sujet */}

              <div>
                <p className="text-sm leading-7 md:text-base">
                  Le stage avait pour sujet :
                </p>

                <div className="mt-2 rounded-lg border bg-muted/20 p-4">
                  <p className="font-semibold italic">
                    « {subject} »
                  </p>
                </div>
              </div>

              {/* Département */}

              <p className="text-sm leading-7 md:text-base">
                Le stage a été réalisé au sein du département{" "}
                <strong>{department}</strong>, sous la
                responsabilité de <strong>{tutorName}</strong>.
              </p>

              {/* Commentaires */}

              {comments && (
                <div className="rounded-lg bg-muted/30 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Appréciation
                  </p>

                  <p className="text-sm italic leading-6">
                    « {comments} »
                  </p>
                </div>
              )}

              {/* Note */}

              <div className="flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Note finale
                  </p>

                  <p className="text-3xl font-bold">
                    {safeGrade.toFixed(2)}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / 20
                    </span>
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="w-fit"
                >
                  {gradeLabel}
                </Badge>
              </div>

              <p className="text-sm leading-7 md:text-base">
                Cette attestation est délivrée à
                l'intéressé(e) pour servir et valoir ce que
                de droit.
              </p>
            </div>

            {/* -------------------------------------------------
                SIGNATURE
            -------------------------------------------------- */}

            <div className="mt-12 border-t pt-8">
              <div className="flex justify-end">
                <div className="min-w-[220px] text-center">
                  <p className="text-sm">
                    Fait à {location},{" "}
                    {issuedDate
                      ? `le ${formatDate(issuedDate)}`
                      : `le ${formatDate(
                          new Date().toISOString()
                        )}`}
                  </p>

                  <div className="mt-12">
                    <p className="font-semibold">
                      {tutorName}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {tutorTitle}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      ONG Ndao Hifanosika
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------
                FOOTER
            -------------------------------------------------- */}

            <div className="mt-10 border-t pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Document officiel — Référence{" "}
                {certificateNumber}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Valable sous réserve de validation et du
                cachet officiel de l'ONG.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleGenerate}
          isLoading={isLoading}
          leftIcon={
            <FileText className="h-4 w-4" />
          }
        >
          {isGenerated
            ? "Attestation générée"
            : "Générer l'attestation"}
        </Button>

        <Button
          variant="outline"
          onClick={onDownload}
          leftIcon={
            <Download className="h-4 w-4" />
          }
        >
          Télécharger
        </Button>

        <Button
          variant="outline"
          onClick={onPrint}
          leftIcon={
            <Printer className="h-4 w-4" />
          }
        >
          Imprimer
        </Button>

        <Button
          variant="outline"
          onClick={handleSend}
          leftIcon={
            <Mail className="h-4 w-4" />
          }
        >
          Envoyer par email
        </Button>

        <Button
          variant="outline"
          onClick={handleShare}
          leftIcon={
            isShared ? (
              <Check className="h-4 w-4" />
            ) : (
              <Share2 className="h-4 w-4" />
            )
          }
        >
          {isShared ? "Partagé" : "Partager"}
        </Button>
      </div>

      {/* =====================================================
          SUCCESS MESSAGE
      ====================================================== */}

      {isSent && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
          <Check className="h-5 w-5 text-green-600" />

          <p className="text-sm text-green-700 dark:text-green-300">
            L'attestation de {studentName} a été envoyée
            avec succès.
          </p>
        </div>
      )}

      {isGenerated && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
          <Check className="h-5 w-5 text-blue-600" />

          <p className="text-sm text-blue-700 dark:text-blue-300">
            L'attestation {certificateNumber} est prête.
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   INFO CARD
============================================================ */

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}

        <span className="text-xs font-medium uppercase">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate font-semibold">
        {value}
      </p>
    </div>
  );
}

export default InternshipCertificate;