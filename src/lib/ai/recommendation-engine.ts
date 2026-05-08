import type { DataStoreState, Doctor, Visit, WeeklyPlan, KPIRecord, MarketRequest, Territory } from "@/lib/data-store";
import type { UserRole } from "@/lib/auth/role-routes";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecommendationCategory =
  | "visit-optimization"
  | "doctor-targeting"
  | "expense-management"
  | "territory-coverage"
  | "pipeline-acceleration";

export interface Recommendation {
  id: string;
  priority: number; // 1-10, higher is more important
  title: string;
  action: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  category: RecommendationCategory;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

let recSeq = 0;
function genId(): string {
  recSeq += 1;
  return `rec-${Date.now().toString(36)}-${recSeq}`;
}

function daysBetween(a: string | Date, b: string | Date): number {
  const msPerDay = 86_400_000;
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / msPerDay
  );
}

const IMPACT_SCORE: Record<string, number> = { high: 3, medium: 2, low: 1 };
const EFFORT_SCORE: Record<string, number> = { low: 3, medium: 2, high: 1 };

// ─── Role-Specific Generators ───────────────────────────────────────────────

function repRecommendations(
  userId: string,
  data: DataStoreState
): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = new Date();

  const myDoctors = data.doctors.filter((d) => d.assignedRepId === userId);
  const myVisits = data.visits.filter((v) => v.repId === userId);

  // Which doctors to visit next — prioritize by classification + days since last visit
  const overdue = myDoctors
    .filter((d) => {
      if (!d.lastVisitAt) return true;
      const expectedDays = d.visitFrequency > 0 ? 30 / d.visitFrequency : 30;
      return daysBetween(now, d.lastVisitAt) > expectedDays * 0.8;
    })
    .sort((a, b) => {
      const classOrder = { A: 0, B: 1, C: 2, D: 3 };
      return (classOrder[a.classification] ?? 3) - (classOrder[b.classification] ?? 3);
    });

  if (overdue.length > 0) {
    const topDoctors = overdue.slice(0, 5);
    recs.push({
      id: genId(),
      priority: 9,
      title: "Priority Doctor Visits",
      action: `Visit these doctors this week: ${topDoctors.map((d) => `${d.name} (${d.classification})`).join(", ")}. They are at or past their visit frequency threshold.`,
      impact: "high",
      effort: "medium",
      category: "visit-optimization",
    });
  }

  // Doctors in trial stage — push to regular
  const trialDoctors = myDoctors.filter(
    (d) => d.buyingLadderStage === "Trial"
  );
  if (trialDoctors.length > 0) {
    recs.push({
      id: genId(),
      priority: 8,
      title: "Convert Trial Doctors to Regular",
      action: `${trialDoctors.length} doctor(s) are in Trial stage: ${trialDoctors.map((d) => d.name).join(", ")}. Increase visit frequency and bring clinical data to convert them to Regular prescribers.`,
      impact: "high",
      effort: "medium",
      category: "doctor-targeting",
    });
  }

  // Optimal route suggestion — group by city/area
  const cityCounts: Record<string, Doctor[]> = {};
  for (const doc of myDoctors) {
    const key = doc.city || "Unknown";
    if (!cityCounts[key]) cityCounts[key] = [];
    cityCounts[key].push(doc);
  }
  const cities = Object.entries(cityCounts).sort(
    (a, b) => b[1].length - a[1].length
  );
  if (cities.length >= 2) {
    recs.push({
      id: genId(),
      priority: 6,
      title: "Optimize Visit Route by Area",
      action: `Cluster your visits by area to minimize travel. Top areas: ${cities.slice(0, 3).map(([city, docs]) => `${city} (${docs.length} doctors)`).join(", ")}.`,
      impact: "medium",
      effort: "low",
      category: "visit-optimization",
    });
  }

  // Expense tip — check if visit samples are well-distributed
  const totalSamples = myVisits.reduce((s, v) => s + v.samplesDistributed, 0);
  const avgSamples = myVisits.length > 0 ? totalSamples / myVisits.length : 0;
  if (avgSamples > 6) {
    recs.push({
      id: genId(),
      priority: 5,
      title: "Optimize Sample Distribution",
      action: `Average samples per visit is ${avgSamples.toFixed(1)}, which is high. Target 3-5 samples per visit for class A/B and 1-2 for class C/D to extend your inventory.`,
      impact: "medium",
      effort: "low",
      category: "expense-management",
    });
  }

  // Focus on KOL doctors
  const kolDoctors = myDoctors.filter((d) => d.isKOL);
  if (kolDoctors.length > 0) {
    const neglectedKOLs = kolDoctors.filter((d) => {
      if (!d.lastVisitAt) return true;
      return daysBetween(now, d.lastVisitAt) > 7;
    });
    if (neglectedKOLs.length > 0) {
      recs.push({
        id: genId(),
        priority: 10,
        title: "Engage Key Opinion Leaders",
        action: `${neglectedKOLs.length} KOL doctor(s) need attention: ${neglectedKOLs.map((d) => d.name).join(", ")}. KOLs influence other prescribers; prioritize them above all others.`,
        impact: "high",
        effort: "low",
        category: "doctor-targeting",
      });
    }
  }

  return recs;
}

function dmRecommendations(
  userId: string,
  data: DataStoreState
): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Which reps need coaching — based on KPI achievement
  const repKPIs = data.kpis.filter(
    (k) => k.period === currentPeriod && k.setBy === userId
  );
  const repScores: Record<string, { total: number; count: number }> = {};
  for (const kpi of repKPIs) {
    if (!repScores[kpi.userId]) repScores[kpi.userId] = { total: 0, count: 0 };
    if (kpi.target > 0) {
      repScores[kpi.userId].total += (kpi.actual / kpi.target) * 100;
      repScores[kpi.userId].count += 1;
    }
  }

  const lowPerformers = Object.entries(repScores)
    .filter(([, s]) => s.count > 0 && s.total / s.count < 75)
    .map(([uid]) => uid);

  if (lowPerformers.length > 0) {
    recs.push({
      id: genId(),
      priority: 9,
      title: "Coaching Needed for Reps",
      action: `${lowPerformers.length} rep(s) are below 75% KPI achievement (${lowPerformers.join(", ")}). Schedule field coaching days with joint visits.`,
      impact: "high",
      effort: "medium",
      category: "visit-optimization",
    });
  }

  // Territory rebalancing — doctors per rep
  const repDoctorCounts: Record<string, number> = {};
  for (const doc of data.doctors) {
    if (doc.assignedRepId) {
      repDoctorCounts[doc.assignedRepId] =
        (repDoctorCounts[doc.assignedRepId] || 0) + 1;
    }
  }
  const counts = Object.values(repDoctorCounts);
  if (counts.length >= 2) {
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    if (max > min * 2) {
      recs.push({
        id: genId(),
        priority: 7,
        title: "Rebalance Territory Assignments",
        action: `Doctor load ranges from ${min} to ${max} per rep. Redistribute doctor assignments for better workload balance.`,
        impact: "high",
        effort: "high",
        category: "territory-coverage",
      });
    }
  }

  // Approval backlogs
  const pendingPlans = data.weeklyPlans.filter(
    (p) => p.status === "SUBMITTED"
  );
  const pendingRequests = data.marketRequests.filter(
    (r) => r.status === "PENDING"
  );
  if (pendingPlans.length + pendingRequests.length > 3) {
    recs.push({
      id: genId(),
      priority: 8,
      title: "Clear Approval Backlog",
      action: `You have ${pendingPlans.length} pending weekly plan(s) and ${pendingRequests.length} market request(s) awaiting review. Clear these to unblock your team.`,
      impact: "medium",
      effort: "low",
      category: "visit-optimization",
    });
  }

  return recs;
}

function bumRecommendations(
  _userId: string,
  data: DataStoreState
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Market share opportunities — look for high-potential unassigned doctors
  const unassigned = data.doctors.filter(
    (d) => !d.assignedRepId && d.classification !== "D"
  );
  if (unassigned.length > 0) {
    const totalPotential = unassigned.reduce(
      (s, d) => s + (d.potentialRevenue ?? 0),
      0
    );
    recs.push({
      id: genId(),
      priority: 9,
      title: "Capture Unassigned Market Potential",
      action: `${unassigned.length} unassigned doctors represent ${totalPotential.toLocaleString()} EGP in potential monthly revenue. Assign reps to capture this opportunity.`,
      impact: "high",
      effort: "medium",
      category: "territory-coverage",
    });
  }

  // Budget reallocation — check cost center spend vs budget
  const overBudget = data.costCenters.filter(
    (cc) => cc.actualSpend > cc.budget * 0.9
  );
  if (overBudget.length > 0) {
    recs.push({
      id: genId(),
      priority: 7,
      title: "Reallocate Budget",
      action: `${overBudget.length} cost center(s) are at 90%+ spend: ${overBudget.map((cc) => cc.name).join(", ")}. Consider reallocating funds from under-utilized budgets.`,
      impact: "medium",
      effort: "medium",
      category: "expense-management",
    });
  }

  // Pipeline acceleration
  const pendingSO = data.salesOrders.filter(
    (so) => so.status === "DRAFT" || so.status === "PENDING_APPROVAL"
  );
  if (pendingSO.length > 0) {
    const totalValue = pendingSO.reduce((s, so) => s + so.total, 0);
    recs.push({
      id: genId(),
      priority: 8,
      title: "Accelerate Sales Pipeline",
      action: `${pendingSO.length} orders worth ${totalValue.toLocaleString()} EGP are in early stages. Fast-track approvals and customer follow-ups to accelerate conversion.`,
      impact: "high",
      effort: "low",
      category: "pipeline-acceleration",
    });
  }

  // Buying ladder advancement opportunities
  const trialDoctors = data.doctors.filter(
    (d) => d.buyingLadderStage === "Trial" && d.assignedRepId
  );
  const awareDoctors = data.doctors.filter(
    (d) => d.buyingLadderStage === "Aware" && d.assignedRepId
  );
  if (trialDoctors.length + awareDoctors.length > 3) {
    recs.push({
      id: genId(),
      priority: 7,
      title: "Buying Ladder Advancement Campaign",
      action: `${trialDoctors.length} Trial and ${awareDoctors.length} Aware doctors can be advanced. Launch targeted campaigns with samples and literature to move them up the ladder.`,
      impact: "high",
      effort: "medium",
      category: "doctor-targeting",
    });
  }

  return recs;
}

function nsmRecommendations(
  _userId: string,
  data: DataStoreState
): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // National performance hotspots
  const kpisByUser = new Map<string, KPIRecord[]>();
  for (const kpi of data.kpis.filter((k) => k.period === currentPeriod)) {
    if (!kpisByUser.has(kpi.userId)) kpisByUser.set(kpi.userId, []);
    kpisByUser.get(kpi.userId)!.push(kpi);
  }

  let underperformerCount = 0;
  for (const [, kpis] of kpisByUser) {
    const avg =
      kpis.reduce((s, k) => s + (k.target > 0 ? (k.actual / k.target) * 100 : 0), 0) /
      Math.max(kpis.length, 1);
    if (avg < 70) underperformerCount++;
  }

  if (underperformerCount > 0) {
    recs.push({
      id: genId(),
      priority: 9,
      title: "Address National Performance Gaps",
      action: `${underperformerCount} team member(s) are below 70% KPI achievement nationally. Initiate performance improvement plans and regional coaching programs.`,
      impact: "high",
      effort: "high",
      category: "visit-optimization",
    });
  }

  // Strategic territory changes — uncovered bricks with high geo share
  const highValueUncovered = data.territories.filter(
    (t) =>
      t.level === "brick" &&
      t.assignedRepIds.length === 0 &&
      (t.geoShare ?? 0) > 1
  );
  if (highValueUncovered.length > 0) {
    recs.push({
      id: genId(),
      priority: 8,
      title: "Strategic Territory Expansion",
      action: `${highValueUncovered.length} uncovered bricks have significant market share potential. Consider hiring or reassigning to cover: ${highValueUncovered.slice(0, 3).map((t) => `${t.name} (${t.geoShare}% share)`).join(", ")}.`,
      impact: "high",
      effort: "high",
      category: "territory-coverage",
    });
  }

  // Headcount analysis — doctors per rep nationally
  const totalDoctors = data.doctors.length;
  const activeReps = new Set(data.doctors.filter((d) => d.assignedRepId).map((d) => d.assignedRepId)).size;
  if (activeReps > 0) {
    const ratio = Math.round(totalDoctors / activeReps);
    if (ratio > 80) {
      recs.push({
        id: genId(),
        priority: 7,
        title: "Headcount Expansion Needed",
        action: `Current doctor-to-rep ratio is ${ratio}:1 (industry standard: 40-60:1). Consider adding ${Math.ceil(totalDoctors / 50 - activeReps)} new reps to improve coverage.`,
        impact: "high",
        effort: "high",
        category: "territory-coverage",
      });
    }
  }

  // Cross-BU synergy opportunities
  if (data.businessUnits.length > 1) {
    const buOverlap = data.doctors.filter(
      (d) =>
        d.assignedRepId &&
        (d.specialty === "Internal Medicine" || d.specialty === "General Practice")
    );
    if (buOverlap.length > 3) {
      recs.push({
        id: genId(),
        priority: 6,
        title: "Cross-BU Synergy Opportunity",
        action: `${buOverlap.length} GP/Internal Medicine doctors can be detailed across multiple BUs. Coordinate joint detailing between business units for maximum impact.`,
        impact: "medium",
        effort: "medium",
        category: "doctor-targeting",
      });
    }
  }

  return recs;
}

// ─── Prioritization ─────────────────────────────────────────────────────────

export function prioritizeActions(
  recommendations: Recommendation[]
): Recommendation[] {
  return [...recommendations].sort((a, b) => {
    const aScore =
      IMPACT_SCORE[a.impact] * EFFORT_SCORE[a.effort] * (a.priority / 10);
    const bScore =
      IMPACT_SCORE[b.impact] * EFFORT_SCORE[b.effort] * (b.priority / 10);
    return bScore - aScore;
  });
}

// ─── Main Function ──────────────────────────────────────────────────────────

export function getRecommendations(
  userId: string,
  role: UserRole,
  data: DataStoreState
): Recommendation[] {
  recSeq = 0;
  let recs: Recommendation[] = [];

  switch (role) {
    case "MEDICAL_REP":
      recs = repRecommendations(userId, data);
      break;
    case "DISTRICT_MANAGER":
      recs = [
        ...dmRecommendations(userId, data),
        ...repRecommendations(userId, data),
      ];
      break;
    case "BUM":
    case "MARKETEER":
      recs = [
        ...bumRecommendations(userId, data),
        ...dmRecommendations(userId, data),
      ];
      break;
    case "NSM":
      recs = [
        ...nsmRecommendations(userId, data),
        ...bumRecommendations(userId, data),
      ];
      break;
    case "ADMIN":
      recs = [
        ...nsmRecommendations(userId, data),
        ...bumRecommendations(userId, data),
        ...dmRecommendations(userId, data),
      ];
      break;
    default:
      // ACCOUNTANT, WAREHOUSE, HR — limited recommendations
      if (data.salesOrders.length > 0 || data.invoices.length > 0) {
        const pendingSO = data.salesOrders.filter(
          (so) => so.status === "PENDING_APPROVAL"
        );
        if (pendingSO.length > 0) {
          recs.push({
            id: genId(),
            priority: 7,
            title: "Pending Sales Order Approvals",
            action: `${pendingSO.length} sales orders await approval. Process these to maintain order flow.`,
            impact: "medium",
            effort: "low",
            category: "pipeline-acceleration",
          });
        }
      }
      break;
  }

  return prioritizeActions(recs);
}
