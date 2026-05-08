import type {
  Doctor,
  Visit,
  MarketRequest,
  WeeklyPlan,
  KPIRecord,
  Territory,
  SalesOrder,
  Invoice,
} from "@/lib/data-store";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScoreFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number; // value * weight (weighted contribution to final score)
}

export interface ScoreResult {
  score: number; // 0-100
  factors: ScoreFactor[];
  trend: "up" | "down" | "stable";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function daysBetween(a: string | Date, b: string | Date): number {
  const msPerDay = 86_400_000;
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / msPerDay
  );
}

function weightedAverage(factors: ScoreFactor[]): number {
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  if (totalWeight === 0) return 0;
  return factors.reduce((s, f) => s + f.contribution, 0) / totalWeight;
}

const LADDER_SCORE: Record<string, number> = {
  Unaware: 0,
  Aware: 25,
  Trial: 50,
  Regular: 75,
  Champion: 100,
};

// ─── Doctor Engagement Score ────────────────────────────────────────────────

export function calculateDoctorScore(
  doctor: Doctor,
  visits: Visit[],
  requests: MarketRequest[]
): ScoreResult {
  const now = new Date();
  const doctorVisits = visits.filter((v) => v.doctorId === doctor.id);
  const doctorRequests = requests.filter((r) => r.doctorId === doctor.id);

  // Factor 1: Visit Frequency Compliance (0-100)
  let visitCompliance = 0;
  if (doctor.visitFrequency > 0 && doctorVisits.length > 0) {
    // Count visits in the last 30 days
    const recentVisits = doctorVisits.filter(
      (v) => daysBetween(now, v.dateTime) <= 30
    ).length;
    visitCompliance = clamp(
      (recentVisits / doctor.visitFrequency) * 100,
      0,
      100
    );
  }

  // Factor 2: Buying Ladder Stage (0-100)
  const ladderScore = LADDER_SCORE[doctor.buyingLadderStage] ?? 0;

  // Factor 3: Recency — how recently was the last visit (0-100)
  let recency = 0;
  if (doctor.lastVisitAt) {
    const days = daysBetween(now, doctor.lastVisitAt);
    // Full score if visited in last 3 days, decays to 0 at 45 days
    recency = clamp(100 - (days / 45) * 100, 0, 100);
  }

  // Factor 4: Request Activity (0-100)
  const recentRequests = doctorRequests.filter(
    (r) => daysBetween(now, r.createdAt) <= 60
  ).length;
  const requestActivity = clamp(recentRequests * 25, 0, 100);

  // Factor 5: Classification potential (0-100)
  const classScore: Record<string, number> = { A: 100, B: 75, C: 50, D: 25 };
  const classification = classScore[doctor.classification] ?? 50;

  const factors: ScoreFactor[] = [
    {
      name: "Visit Compliance",
      value: Math.round(visitCompliance),
      weight: 0.3,
      contribution: visitCompliance * 0.3,
    },
    {
      name: "Buying Ladder",
      value: ladderScore,
      weight: 0.25,
      contribution: ladderScore * 0.25,
    },
    {
      name: "Recency",
      value: Math.round(recency),
      weight: 0.2,
      contribution: recency * 0.2,
    },
    {
      name: "Request Activity",
      value: Math.round(requestActivity),
      weight: 0.1,
      contribution: requestActivity * 0.1,
    },
    {
      name: "Classification",
      value: classification,
      weight: 0.15,
      contribution: classification * 0.15,
    },
  ];

  const score = clamp(Math.round(weightedAverage(factors)), 0, 100);

  // Trend — compare recent visits vs older visits
  const last30 = doctorVisits.filter(
    (v) => daysBetween(now, v.dateTime) <= 30
  ).length;
  const prev30 = doctorVisits.filter((v) => {
    const d = daysBetween(now, v.dateTime);
    return d > 30 && d <= 60;
  }).length;

  let trend: "up" | "down" | "stable" = "stable";
  if (last30 > prev30) trend = "up";
  else if (last30 < prev30) trend = "down";

  return { score, factors, trend };
}

// ─── Rep Performance Score ──────────────────────────────────────────────────

export function calculateRepScore(
  repId: string,
  visits: Visit[],
  plans: WeeklyPlan[],
  kpis: KPIRecord[]
): ScoreResult {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const repVisits = visits.filter((v) => v.repId === repId);
  const repPlans = plans.filter((p) => p.repId === repId);
  const repKPIs = kpis.filter(
    (k) => k.userId === repId && k.period === currentPeriod
  );

  // Factor 1: Visit volume (0-100)
  const recentVisits = repVisits.filter(
    (v) => daysBetween(now, v.dateTime) <= 30
  ).length;
  // Assume 160 visits/month as ideal
  const visitVolume = clamp((recentVisits / 40) * 100, 0, 100); // 40 per week is max

  // Factor 2: Plan compliance (0-100)
  let planCompliance = 100;
  const approvedPlans = repPlans.filter((p) => p.status === "APPROVED");
  if (approvedPlans.length > 0) {
    let totalPlanned = 0;
    let totalExecuted = 0;
    for (const plan of approvedPlans) {
      for (const day of plan.days) {
        totalPlanned += day.visits.length;
        totalExecuted += day.visits.filter(
          (v) => v.outcome === "successful" || v.outcome === "follow-up needed"
        ).length;
      }
    }
    planCompliance =
      totalPlanned > 0
        ? clamp((totalExecuted / totalPlanned) * 100, 0, 100)
        : 50;
  }

  // Factor 3: KPI achievement (0-100)
  let kpiAchievement = 50; // default if no KPIs
  if (repKPIs.length > 0) {
    const totalAchievement = repKPIs.reduce((s, k) => {
      return s + (k.target > 0 ? (k.actual / k.target) * 100 : 0);
    }, 0);
    kpiAchievement = clamp(totalAchievement / repKPIs.length, 0, 100);
  }

  // Factor 4: Visit quality — average duration (0-100)
  const avgDuration =
    repVisits.length > 0
      ? repVisits.reduce((s, v) => s + v.durationMin, 0) / repVisits.length
      : 0;
  // Ideal: 20-30 min. Score drops below 15 or above 45
  let durationScore = 0;
  if (avgDuration >= 20 && avgDuration <= 30) {
    durationScore = 100;
  } else if (avgDuration > 0) {
    durationScore = clamp(
      100 - Math.abs(avgDuration - 25) * 4,
      0,
      100
    );
  }

  // Factor 5: GPS compliance (0-100)
  const gpsVerified = repVisits.filter((v) => v.gpsVerified).length;
  const gpsCompliance =
    repVisits.length > 0 ? (gpsVerified / repVisits.length) * 100 : 50;

  const factors: ScoreFactor[] = [
    {
      name: "Visit Volume",
      value: Math.round(visitVolume),
      weight: 0.2,
      contribution: visitVolume * 0.2,
    },
    {
      name: "Plan Compliance",
      value: Math.round(planCompliance),
      weight: 0.25,
      contribution: planCompliance * 0.25,
    },
    {
      name: "KPI Achievement",
      value: Math.round(kpiAchievement),
      weight: 0.3,
      contribution: kpiAchievement * 0.3,
    },
    {
      name: "Visit Quality",
      value: Math.round(durationScore),
      weight: 0.15,
      contribution: durationScore * 0.15,
    },
    {
      name: "GPS Compliance",
      value: Math.round(gpsCompliance),
      weight: 0.1,
      contribution: gpsCompliance * 0.1,
    },
  ];

  const score = clamp(Math.round(weightedAverage(factors)), 0, 100);

  // Trend — compare this month KPIs to last month
  const lastPeriod = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  const lastKPIs = kpis.filter(
    (k) => k.userId === repId && k.period === lastPeriod
  );
  let trend: "up" | "down" | "stable" = "stable";
  if (repKPIs.length > 0 && lastKPIs.length > 0) {
    const currentAvg =
      repKPIs.reduce((s, k) => s + (k.target > 0 ? k.actual / k.target : 0), 0) /
      repKPIs.length;
    const lastAvg =
      lastKPIs.reduce((s, k) => s + (k.target > 0 ? k.actual / k.target : 0), 0) /
      lastKPIs.length;
    if (currentAvg > lastAvg * 1.05) trend = "up";
    else if (currentAvg < lastAvg * 0.95) trend = "down";
  }

  return { score, factors, trend };
}

// ─── Territory Health Score ─────────────────────────────────────────────────

export function calculateTerritoryHealth(
  territory: Territory,
  doctors: Doctor[],
  allTerritoryDoctors?: Doctor[]
): ScoreResult {
  // Find doctors in this territory (by brickId match)
  const territoryDoctors = allTerritoryDoctors
    ? allTerritoryDoctors
    : doctors.filter((d) => d.brickId === territory.id);

  // Factor 1: Rep coverage (0-100) — are reps assigned?
  const repCoverage = territory.assignedRepIds.length > 0 ? 100 : 0;

  // Factor 2: Doctor assignment rate (0-100)
  const assignedDoctors = territoryDoctors.filter(
    (d) => d.assignedRepId
  ).length;
  const assignmentRate =
    territoryDoctors.length > 0
      ? (assignedDoctors / territoryDoctors.length) * 100
      : territory.assignedRepIds.length > 0
      ? 50
      : 0;

  // Factor 3: High-value doctor coverage (0-100)
  const hvDoctors = territoryDoctors.filter(
    (d) => d.classification === "A" || d.classification === "B"
  );
  const hvAssigned = hvDoctors.filter((d) => d.assignedRepId).length;
  const hvCoverage =
    hvDoctors.length > 0 ? (hvAssigned / hvDoctors.length) * 100 : 50;

  // Factor 4: Rep-to-doctor ratio health (0-100)
  let ratioScore = 50;
  if (territory.assignedRepIds.length > 0 && territoryDoctors.length > 0) {
    const ratio = territoryDoctors.length / territory.assignedRepIds.length;
    // Ideal: 40-60 doctors per rep
    if (ratio >= 40 && ratio <= 60) {
      ratioScore = 100;
    } else {
      ratioScore = clamp(100 - Math.abs(ratio - 50) * 2, 0, 100);
    }
  }

  // Factor 5: Market share potential (0-100)
  const geoShareScore = clamp((territory.geoShare ?? 0) * 20, 0, 100);

  const factors: ScoreFactor[] = [
    {
      name: "Rep Coverage",
      value: Math.round(repCoverage),
      weight: 0.3,
      contribution: repCoverage * 0.3,
    },
    {
      name: "Doctor Assignment",
      value: Math.round(assignmentRate),
      weight: 0.25,
      contribution: assignmentRate * 0.25,
    },
    {
      name: "HV Doctor Coverage",
      value: Math.round(hvCoverage),
      weight: 0.2,
      contribution: hvCoverage * 0.2,
    },
    {
      name: "Rep:Doctor Ratio",
      value: Math.round(ratioScore),
      weight: 0.15,
      contribution: ratioScore * 0.15,
    },
    {
      name: "Market Potential",
      value: Math.round(geoShareScore),
      weight: 0.1,
      contribution: geoShareScore * 0.1,
    },
  ];

  const score = clamp(Math.round(weightedAverage(factors)), 0, 100);

  // Trend — simple: if reps are assigned, trend up; if uncovered, trend down
  let trend: "up" | "down" | "stable" = "stable";
  if (repCoverage === 0 && territoryDoctors.length > 0) trend = "down";
  else if (repCoverage > 0 && hvCoverage > 80) trend = "up";

  return { score, factors, trend };
}

// ─── Pipeline Health Score ──────────────────────────────────────────────────

export function calculatePipelineHealth(
  salesOrders: SalesOrder[],
  invoices: Invoice[]
): ScoreResult {
  const now = new Date();

  // Factor 1: Conversion rate (0-100) — how many orders reached delivered/invoiced
  const totalOrders = salesOrders.length;
  const completedOrders = salesOrders.filter(
    (so) => so.status === "DELIVERED" || so.status === "INVOICED"
  ).length;
  const conversionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // Factor 2: Pipeline velocity (0-100) — age of active orders (lower is better)
  const activeOrders = salesOrders.filter(
    (so) =>
      so.status !== "CANCELLED" &&
      so.status !== "DELIVERED" &&
      so.status !== "INVOICED"
  );
  const avgAge =
    activeOrders.length > 0
      ? activeOrders.reduce((s, so) => s + daysBetween(now, so.createdAt), 0) /
        activeOrders.length
      : 0;
  // Ideal: < 7 days average age
  const velocityScore = clamp(100 - avgAge * 3, 0, 100);

  // Factor 3: Invoice collection health (0-100)
  const paidInvoices = invoices.filter(
    (inv) => inv.status === "PAID"
  ).length;
  const totalInvoices = invoices.length;
  const collectionRate =
    totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 50;

  // Factor 4: Pipeline value coverage (0-100) — active pipeline vs collected
  const pipelineValue = activeOrders.reduce((s, so) => s + so.total, 0);
  const collectedValue = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((s, inv) => s + inv.total, 0);
  const coverageScore =
    collectedValue > 0
      ? clamp((pipelineValue / collectedValue) * 50, 0, 100)
      : pipelineValue > 0
      ? 50
      : 0;

  // Factor 5: Order stage distribution (0-100) — balanced across stages
  const stageCountsObj: Record<string, number> = {};
  for (const so of activeOrders) {
    stageCountsObj[so.status] = (stageCountsObj[so.status] || 0) + 1;
  }
  const stageCounts = Object.values(stageCountsObj);
  const stageBalance =
    stageCounts.length > 1
      ? clamp(100 - (Math.max(...stageCounts) - Math.min(...stageCounts)) * 15, 0, 100)
      : stageCounts.length === 1
      ? 60
      : 0;

  const factors: ScoreFactor[] = [
    {
      name: "Conversion Rate",
      value: Math.round(conversionRate),
      weight: 0.3,
      contribution: conversionRate * 0.3,
    },
    {
      name: "Pipeline Velocity",
      value: Math.round(velocityScore),
      weight: 0.25,
      contribution: velocityScore * 0.25,
    },
    {
      name: "Collection Rate",
      value: Math.round(collectionRate),
      weight: 0.2,
      contribution: collectionRate * 0.2,
    },
    {
      name: "Pipeline Coverage",
      value: Math.round(coverageScore),
      weight: 0.15,
      contribution: coverageScore * 0.15,
    },
    {
      name: "Stage Balance",
      value: Math.round(stageBalance),
      weight: 0.1,
      contribution: stageBalance * 0.1,
    },
  ];

  const score = clamp(Math.round(weightedAverage(factors)), 0, 100);

  // Trend
  let trend: "up" | "down" | "stable" = "stable";
  if (conversionRate > 60 && velocityScore > 60) trend = "up";
  else if (conversionRate < 30 || velocityScore < 30) trend = "down";

  return { score, factors, trend };
}
