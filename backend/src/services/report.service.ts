import { prisma } from "../config/database";

export async function getDashboardStatistics() {
  const [
    projects,
    beneficiaries,
    users,
    evaluations,
    internships,
    activities,
    activeProjects,
    completedProjects,
    activeUsers,
    completedInternships,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.beneficiary.count(),
    prisma.user.count(),
    prisma.evaluation.count(),
    prisma.internship.count(),
    prisma.activity.count(),

    prisma.project.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.project.count({
      where: {
        status: "COMPLETED",
      },
    }),

    prisma.user.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.internship.count({
      where: {
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    totals: {
      projects,
      beneficiaries,
      users,
      evaluations,
      internships,
      activities,
    },
    status: {
      activeProjects,
      completedProjects,
      activeUsers,
      completedInternships,
    },
  };
}

export async function getProjectStatistics(projectId: number) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      activities: true,
      milestones: true,
      beneficiaries: true,
      evaluations: true,
      internships: true,
    },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const completedActivities = project.activities.filter(
    (activity) => activity.status === "COMPLETED",
  ).length;

  const completedMilestones = project.milestones.filter(
    (milestone) => milestone.progress >= 100,
  ).length;

  const scores = project.evaluations
    .map((evaluation) => evaluation.score)
    .filter((score): score is number => score !== null);

  const averageScore =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) /
        scores.length
      : null;

  return {
    project,
    statistics: {
      activities: project.activities.length,
      completedActivities,
      milestones: project.milestones.length,
      completedMilestones,
      beneficiaries: project.beneficiaries.length,
      evaluations: project.evaluations.length,
      internships: project.internships.length,
      averageEvaluationScore: averageScore,
    },
  };
}

export async function getEvaluationStatistics() {
  const evaluations = await prisma.evaluation.findMany();

  const scores = evaluations
    .map((evaluation) => evaluation.score)
    .filter((score): score is number => score !== null);

  const averageScore =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) /
        scores.length
      : null;

  return {
    total: evaluations.length,
    averageScore,
    draft: evaluations.filter(
      (evaluation) => evaluation.status === "DRAFT",
    ).length,
    submitted: evaluations.filter(
      (evaluation) => evaluation.status === "SUBMITTED",
    ).length,
    validated: evaluations.filter(
      (evaluation) => evaluation.status === "VALIDATED",
    ).length,
  };
}

export async function getBeneficiaryStatistics() {
  const beneficiaries = await prisma.beneficiary.findMany();

  return {
    total: beneficiaries.length,
    vulnerable: beneficiaries.filter(
      (beneficiary) => beneficiary.vulnerable,
    ).length,
    male: beneficiaries.filter(
      (beneficiary) => beneficiary.gender === "MALE",
    ).length,
    female: beneficiaries.filter(
      (beneficiary) => beneficiary.gender === "FEMALE",
    ).length,
    other: beneficiaries.filter(
      (beneficiary) => beneficiary.gender === "OTHER",
    ).length,
  };
}