import type {
  DataStoreState,
  Doctor,
  Visit,
  WeeklyPlan,
  Territory,
  KPIRecord,
  MarketRequest,
  Task,
  SalesOrder,
  Invoice,
  Customer,
} from "@/lib/data-store";
import type { UserRole } from "@/lib/auth/role-routes";

// ─── Types ──────────────────────────────────────────────────────────────────

export type InsightType = "anomaly" | "trend" | "recommendation" | "alert" | "forecast";
export type InsightSeverity = "info" | "warning" | "critical" | "success";

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric?: { label: string; value: number; unit?: string; change?: number };
  recommendation: string;
  relatedEntities?: { type: string; id: string; label: string }[];
  createdAt: string;
}

export const INSIGHT_CATEGORIES: Record<
  InsightType,
  { icon: string; color: string }
> = {
  anomaly: { icon: "AlertTriangle", color: "text-amber-500" },
  trend: { icon: "TrendingUp", color: "text-blue-500" },
  recommendation: { icon: "Lightbulb", color: "text-purple-500" },
  alert: { icon: "Bell", color: "text-red-500" },
  forecast: { icon: "BarChart3", color: "text-emerald-500" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

let insightSeq = 0;
function genId(): string {
  insightSeq += 1;
  return `insight-${Date.now().toString(36)}-${insightSeq}`;
}

function daysBetween(a: string | Date, b: string | Date): number {
  const msPerDay = 86_400_000;
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / msPerDay
  );
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Analysis Functions ─────────────────────────────────────────────────────

export function analyzeVisitPatterns(
  doctors: Doctor[],
  visits: Visit[],
  plans: WeeklyPlan[],
  userId?: string
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Filter visits to relevant user if provided
  const userVisits = userId
    ? visits.filter((v) => v.repId === userId)
    : visits;

  // 1) Low visit compliance: compare actual visits vs planned
  const approvedPlans = plans.filter(
    (p) => p.status === "APPROVED" && (!userId || p.repId === userId)
  );
  for (const plan of approvedPlans) {
    let planned = 0;
    let executed = 0;
    for (const day of plan.days) {
      planned += day.visits.length;
      executed += day.visits.filter(
        (v) => v.outcome === "successful" || v.outcome === "follow-up needed"
      ).length;
    }
    if (planned > 0) {
      const compliance = Math.round((executed / planned) * 100);
      if (compliance < 70) {
        insights.push({
          id: genId(),
          type: "alert",
          severity: "warning",
          title: "Low Visit Compliance",
          description: `Weekly plan (${plan.weekStartDate.slice(0, 10)}) achieved only ${compliance}% compliance (${executed}/${planned} visits completed).`,
          metric: { label: "Compliance", value: compliance, unit: "%" },
          recommendation:
            "Review missed visits and reschedule high-priority doctors. Consider adjusting plan targets to be more realistic.",
          relatedEntities: [{ type: "plan", id: plan.id, label: `Plan ${plan.weekStartDate.slice(0, 10)}` }],
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // 2) Skipped doctors — doctors with visit frequency but no visit in the expected window
  const assignedDoctors = userId
    ? doctors.filter((d) => d.assignedRepId === userId)
    : doctors.filter((d) => d.assignedRepId);

  for (const doc of assignedDoctors) {
    if (!doc.lastVisitAt) {
      insights.push({
        id: genId(),
        type: "alert",
        severity: "warning",
        title: "Doctor Never Visited",
        description: `${doc.name} (${doc.specialty}, Class ${doc.classification}) is assigned but has no recorded visits.`,
        recommendation: `Schedule a first visit to ${doc.name}. As a class-${doc.classification} doctor, engagement is critical.`,
        relatedEntities: [{ type: "doctor", id: doc.id, label: doc.name }],
        createdAt: now.toISOString(),
      });
      continue;
    }

    const daysSinceVisit = daysBetween(now, doc.lastVisitAt);
    const expectedDays = doc.visitFrequency > 0 ? 30 / doc.visitFrequency : 30;

    if (daysSinceVisit > expectedDays * 1.5) {
      insights.push({
        id: genId(),
        type: "alert",
        severity: doc.classification === "A" ? "critical" : "warning",
        title: "Overdue Doctor Visit",
        description: `${doc.name} (Class ${doc.classification}) has not been visited for ${Math.round(daysSinceVisit)} days. Expected every ${Math.round(expectedDays)} days.`,
        metric: { label: "Days overdue", value: Math.round(daysSinceVisit - expectedDays) },
        recommendation: `Prioritize visiting ${doc.name} this week. ${doc.isKOL ? "This is a KOL — risk of competitor win." : ""}`,
        relatedEntities: [{ type: "doctor", id: doc.id, label: doc.name }],
        createdAt: now.toISOString(),
      });
    }
  }

  // 3) Uneven territory coverage — check if some doctors are visited much more than others
  const visitCounts: Record<string, number> = {};
  for (const v of userVisits) {
    visitCounts[v.doctorId] = (visitCounts[v.doctorId] || 0) + 1;
  }
  const counts = Object.values(visitCounts);
  if (counts.length >= 3) {
    const sd = stdDev(counts);
    const avg = mean(counts);
    if (sd > avg * 0.8 && avg > 0) {
      insights.push({
        id: genId(),
        type: "anomaly",
        severity: "info",
        title: "Uneven Visit Distribution",
        description: `Visit distribution is uneven across doctors. Standard deviation (${sd.toFixed(1)}) is high relative to average (${avg.toFixed(1)} visits).`,
        metric: { label: "Std Dev", value: Number(sd.toFixed(1)) },
        recommendation:
          "Redistribute visits more evenly. Focus on under-visited high-classification doctors.",
        createdAt: now.toISOString(),
      });
    }
  }

  return insights;
}

export function analyzeExpenseAnomalies(
  invoices: Invoice[],
  salesOrders: SalesOrder[]
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Analyze invoice amounts for anomalies
  const amounts = invoices.map((inv) => inv.total);
  if (amounts.length >= 3) {
    const avg = mean(amounts);
    const sd = stdDev(amounts);

    for (const inv of invoices) {
      // Flag unusual amounts (> 2 std dev from mean)
      if (sd > 0 && Math.abs(inv.total - avg) > 2 * sd) {
        insights.push({
          id: genId(),
          type: "anomaly",
          severity: "warning",
          title: "Unusual Invoice Amount",
          description: `Invoice ${inv.number} has an unusual total of ${inv.total.toLocaleString()} ${inv.currency}. Mean is ${Math.round(avg).toLocaleString()}.`,
          metric: { label: "Amount", value: inv.total, unit: inv.currency },
          recommendation:
            "Review this invoice for accuracy. Verify quantities and pricing with the customer order.",
          relatedEntities: [
            { type: "invoice", id: inv.id, label: inv.number },
          ],
          createdAt: now.toISOString(),
        });
      }

      // Flag weekend submissions
      const invDate = new Date(inv.date);
      const day = invDate.getDay();
      if (day === 5 || day === 6) {
        // Friday/Saturday for Egypt
        insights.push({
          id: genId(),
          type: "anomaly",
          severity: "info",
          title: "Weekend Invoice Submission",
          description: `Invoice ${inv.number} was created on a weekend (${invDate.toLocaleDateString("en-US", { weekday: "long" })}).`,
          recommendation:
            "Verify this invoice was intentionally submitted on a weekend. Ensure proper approvals are in place.",
          relatedEntities: [
            { type: "invoice", id: inv.id, label: inv.number },
          ],
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // Check for overdue invoices
  for (const inv of invoices) {
    if (inv.status === "SENT" || inv.status === "PARTIAL") {
      const dueDate = new Date(inv.dueDate);
      if (dueDate < now) {
        const daysOverdue = Math.round(daysBetween(now, dueDate));
        insights.push({
          id: genId(),
          type: "alert",
          severity: daysOverdue > 30 ? "critical" : "warning",
          title: "Overdue Invoice",
          description: `Invoice ${inv.number} is ${daysOverdue} days past due. Outstanding: ${inv.total.toLocaleString()} ${inv.currency}.`,
          metric: { label: "Days overdue", value: daysOverdue },
          recommendation: `Follow up on payment for ${inv.number}. Consider escalating if over 30 days overdue.`,
          relatedEntities: [
            { type: "invoice", id: inv.id, label: inv.number },
          ],
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // Check sales order patterns
  const pendingSO = salesOrders.filter(
    (so) => so.status === "DRAFT" || so.status === "PENDING_APPROVAL"
  );
  if (pendingSO.length > 3) {
    insights.push({
      id: genId(),
      type: "alert",
      severity: "warning",
      title: "Sales Order Bottleneck",
      description: `${pendingSO.length} sales orders are pending approval/draft. This may indicate a processing backlog.`,
      metric: { label: "Pending orders", value: pendingSO.length },
      recommendation:
        "Review and process pending sales orders to avoid delivery delays.",
      createdAt: now.toISOString(),
    });
  }

  return insights;
}

export function analyzeSalesTrends(
  salesOrders: SalesOrder[],
  invoices: Invoice[],
  customers: Customer[]
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Pipeline velocity — average time from draft to delivery
  const completedOrders = salesOrders.filter(
    (so) =>
      so.status === "DELIVERED" || so.status === "INVOICED"
  );
  if (completedOrders.length > 0) {
    const totalValue = completedOrders.reduce((s, so) => s + so.total, 0);
    insights.push({
      id: genId(),
      type: "trend",
      severity: "info",
      title: "Pipeline Revenue",
      description: `Total fulfilled pipeline value: ${totalValue.toLocaleString()} EGP across ${completedOrders.length} orders.`,
      metric: { label: "Pipeline value", value: totalValue, unit: "EGP" },
      recommendation:
        "Maintain momentum by converting pending orders and pursuing new opportunities.",
      createdAt: now.toISOString(),
    });
  }

  // Stalled opportunities — orders stuck in early stages
  const stalledOrders = salesOrders.filter((so) => {
    if (so.status !== "DRAFT" && so.status !== "PENDING_APPROVAL") return false;
    const age = daysBetween(now, so.createdAt);
    return age > 14;
  });
  if (stalledOrders.length > 0) {
    insights.push({
      id: genId(),
      type: "alert",
      severity: "warning",
      title: "Stalled Sales Orders",
      description: `${stalledOrders.length} sales order(s) have been in draft/pending stage for over 2 weeks.`,
      metric: { label: "Stalled orders", value: stalledOrders.length },
      recommendation:
        "Review stalled orders and either advance them or cancel if no longer relevant.",
      relatedEntities: stalledOrders.slice(0, 3).map((so) => ({
        type: "salesOrder",
        id: so.id,
        label: so.number,
      })),
      createdAt: now.toISOString(),
    });
  }

  // Customer concentration risk
  if (customers.length > 0) {
    const totalOutstanding = customers.reduce((s, c) => s + c.outstanding, 0);
    const topCustomer = customers.reduce((top, c) =>
      c.outstanding > top.outstanding ? c : top
    );
    if (totalOutstanding > 0) {
      const concentration = Math.round(
        (topCustomer.outstanding / totalOutstanding) * 100
      );
      if (concentration > 40) {
        insights.push({
          id: genId(),
          type: "recommendation",
          severity: "warning",
          title: "Revenue Concentration Risk",
          description: `${topCustomer.name} accounts for ${concentration}% of total outstanding receivables (${topCustomer.outstanding.toLocaleString()} EGP).`,
          metric: { label: "Concentration", value: concentration, unit: "%" },
          recommendation:
            "Diversify the customer base to reduce dependency on a single account.",
          relatedEntities: [
            { type: "customer", id: topCustomer.id, label: topCustomer.name },
          ],
          createdAt: now.toISOString(),
        });
      }
    }
  }

  return insights;
}

export function analyzeDoctorEngagement(
  doctors: Doctor[],
  visits: Visit[],
  marketRequests: MarketRequest[]
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Buying ladder regression detection
  for (const visit of visits) {
    if (
      visit.buyingLadderBefore &&
      visit.buyingLadderAfter &&
      ladderIndex(visit.buyingLadderAfter) < ladderIndex(visit.buyingLadderBefore)
    ) {
      const doc = doctors.find((d) => d.id === visit.doctorId);
      if (doc) {
        insights.push({
          id: genId(),
          type: "alert",
          severity: "critical",
          title: "Buying Ladder Regression",
          description: `${doc.name} regressed from "${visit.buyingLadderBefore}" to "${visit.buyingLadderAfter}" after visit on ${visit.dateTime.slice(0, 10)}.`,
          recommendation: `Investigate why ${doc.name} downgraded. Consider a follow-up visit with the district manager.`,
          relatedEntities: [
            { type: "doctor", id: doc.id, label: doc.name },
            { type: "visit", id: visit.id, label: `Visit ${visit.dateTime.slice(0, 10)}` },
          ],
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // High-value doctors not visited recently
  const highValue = doctors.filter(
    (d) =>
      d.classification === "A" &&
      d.assignedRepId &&
      (d.potentialRevenue ?? 0) > 50000
  );
  for (const doc of highValue) {
    if (doc.lastVisitAt) {
      const gap = daysBetween(now, doc.lastVisitAt);
      if (gap > 10) {
        insights.push({
          id: genId(),
          type: "recommendation",
          severity: "warning",
          title: "High-Value Doctor Needs Attention",
          description: `${doc.name} (Revenue potential: ${(doc.potentialRevenue ?? 0).toLocaleString()} EGP) has not been visited for ${Math.round(gap)} days.`,
          metric: { label: "Days since last visit", value: Math.round(gap) },
          recommendation: `Schedule a priority visit to ${doc.name}. ${doc.isKOL ? "As a KOL, their influence on other prescribers is significant." : ""}`,
          relatedEntities: [{ type: "doctor", id: doc.id, label: doc.name }],
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // Doctors with pending market requests
  const pendingRequests = marketRequests.filter((r) => r.status === "PENDING");
  if (pendingRequests.length > 3) {
    insights.push({
      id: genId(),
      type: "alert",
      severity: "warning",
      title: "Pending Market Requests Backlog",
      description: `${pendingRequests.length} market requests are awaiting approval, which may impact doctor engagement.`,
      metric: { label: "Pending requests", value: pendingRequests.length },
      recommendation:
        "Process pending requests promptly to maintain doctor relationships.",
      createdAt: now.toISOString(),
    });
  }

  return insights;
}

function ladderIndex(stage: string): number {
  const stages = ["Unaware", "Aware", "Trial", "Regular", "Champion"];
  return stages.indexOf(stage);
}

export function analyzeTeamPerformance(
  kpis: KPIRecord[],
  visits: Visit[],
  plans: WeeklyPlan[],
  allUserIds: string[]
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Find underperformers vs overperformers
  const currentKPIs = kpis.filter((k) => k.period === currentPeriod);
  const userScores: Record<string, { total: number; count: number }> = {};

  for (const kpi of currentKPIs) {
    if (!userScores[kpi.userId]) {
      userScores[kpi.userId] = { total: 0, count: 0 };
    }
    if (kpi.target > 0) {
      userScores[kpi.userId].total += (kpi.actual / kpi.target) * 100;
      userScores[kpi.userId].count += 1;
    }
  }

  for (const [userId, score] of Object.entries(userScores)) {
    const avg = score.count > 0 ? score.total / score.count : 0;
    if (avg < 60 && score.count > 0) {
      insights.push({
        id: genId(),
        type: "alert",
        severity: "critical",
        title: "Underperforming Team Member",
        description: `User ${userId} is at ${Math.round(avg)}% average KPI achievement this month.`,
        metric: { label: "KPI Achievement", value: Math.round(avg), unit: "%" },
        recommendation:
          "Schedule a coaching session to identify blockers and provide support.",
        relatedEntities: [{ type: "user", id: userId, label: userId }],
        createdAt: now.toISOString(),
      });
    } else if (avg > 110) {
      insights.push({
        id: genId(),
        type: "trend",
        severity: "success",
        title: "Top Performer",
        description: `User ${userId} is exceeding targets with ${Math.round(avg)}% average KPI achievement.`,
        metric: { label: "KPI Achievement", value: Math.round(avg), unit: "%" },
        recommendation:
          "Recognize this performance. Consider as a mentor or for best-practice sharing.",
        relatedEntities: [{ type: "user", id: userId, label: userId }],
        createdAt: now.toISOString(),
      });
    }
  }

  // Workload imbalance — visits per rep
  const repVisitCounts: Record<string, number> = {};
  for (const v of visits) {
    repVisitCounts[v.repId] = (repVisitCounts[v.repId] || 0) + 1;
  }
  const visitCountValues = Object.values(repVisitCounts);
  if (visitCountValues.length >= 2) {
    const sd = stdDev(visitCountValues);
    const avg = mean(visitCountValues);
    if (sd > avg * 0.6 && avg > 0) {
      insights.push({
        id: genId(),
        type: "anomaly",
        severity: "info",
        title: "Workload Imbalance Detected",
        description: `Visit workload varies significantly across reps (avg: ${avg.toFixed(0)}, std dev: ${sd.toFixed(1)}). Some reps may be overburdened.`,
        recommendation:
          "Review territory assignments and redistribute workload for better balance.",
        createdAt: now.toISOString(),
      });
    }
  }

  return insights;
}

export function analyzeTerritoryGaps(
  territories: Territory[],
  doctors: Doctor[],
  _allUserIds: string[]
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Check for territories with no assigned reps
  const brickTerritories = territories.filter((t) => t.level === "brick");
  const uncoveredBricks = brickTerritories.filter(
    (t) => t.assignedRepIds.length === 0
  );

  if (uncoveredBricks.length > 0 && brickTerritories.length > 0) {
    const uncoveredPct = Math.round(
      (uncoveredBricks.length / brickTerritories.length) * 100
    );
    insights.push({
      id: genId(),
      type: "alert",
      severity: uncoveredPct > 30 ? "critical" : "warning",
      title: "Uncovered Territory Bricks",
      description: `${uncoveredBricks.length} of ${brickTerritories.length} territory bricks (${uncoveredPct}%) have no assigned medical rep.`,
      metric: { label: "Uncovered", value: uncoveredBricks.length },
      recommendation:
        "Assign reps to uncovered territories or redistribute existing assignments for better coverage.",
      relatedEntities: uncoveredBricks.slice(0, 5).map((t) => ({
        type: "territory",
        id: t.id,
        label: t.name,
      })),
      createdAt: now.toISOString(),
    });
  }

  // Rep-to-doctor ratio imbalance
  const repDoctorCounts: Record<string, number> = {};
  for (const doc of doctors) {
    if (doc.assignedRepId) {
      repDoctorCounts[doc.assignedRepId] =
        (repDoctorCounts[doc.assignedRepId] || 0) + 1;
    }
  }
  const ratios = Object.values(repDoctorCounts);
  if (ratios.length >= 2) {
    const maxRatio = Math.max(...ratios);
    const minRatio = Math.min(...ratios);
    if (maxRatio > minRatio * 3) {
      insights.push({
        id: genId(),
        type: "anomaly",
        severity: "warning",
        title: "Rep-to-Doctor Ratio Imbalance",
        description: `Doctor assignments range from ${minRatio} to ${maxRatio} per rep. Some reps are significantly overloaded.`,
        recommendation:
          "Rebalance doctor assignments across reps for more equitable workload.",
        createdAt: now.toISOString(),
      });
    }
  }

  // Unassigned doctors
  const unassigned = doctors.filter((d) => !d.assignedRepId);
  if (unassigned.length > 0) {
    const highValueUnassigned = unassigned.filter(
      (d) => d.classification === "A" || d.classification === "B"
    );
    if (highValueUnassigned.length > 0) {
      insights.push({
        id: genId(),
        type: "recommendation",
        severity: highValueUnassigned.some((d) => d.classification === "A")
          ? "critical"
          : "warning",
        title: "Unassigned High-Value Doctors",
        description: `${highValueUnassigned.length} class A/B doctor(s) have no assigned rep, resulting in lost engagement opportunities.`,
        metric: { label: "Unassigned A/B doctors", value: highValueUnassigned.length },
        recommendation:
          "Assign reps to these high-value doctors immediately to prevent competitor capture.",
        relatedEntities: highValueUnassigned.slice(0, 5).map((d) => ({
          type: "doctor",
          id: d.id,
          label: d.name,
        })),
        createdAt: now.toISOString(),
      });
    }
  }

  return insights;
}

export function generateForecasts(
  visits: Visit[],
  invoices: Invoice[],
  salesOrders: SalesOrder[]
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Simple linear extrapolation for visit counts — weekly trend
  const weekBuckets: Record<string, number> = {};
  for (const v of visits) {
    const d = new Date(v.dateTime);
    const weekKey = getWeekKey(d);
    weekBuckets[weekKey] = (weekBuckets[weekKey] || 0) + 1;
  }
  const weekKeys = Object.keys(weekBuckets).sort();
  if (weekKeys.length >= 2) {
    const recentWeeks = weekKeys.slice(-4);
    const values = recentWeeks.map((k) => weekBuckets[k]);
    const trend = linearTrend(values);
    const forecast = Math.max(0, Math.round(values[values.length - 1] + trend));
    insights.push({
      id: genId(),
      type: "forecast",
      severity: trend > 0 ? "success" : trend < 0 ? "warning" : "info",
      title: "Visit Count Forecast",
      description: `Based on recent trends, next week's projected visit count is ${forecast}. ${trend > 0 ? "Visits are trending upward." : trend < 0 ? "Visits are declining." : "Visits are stable."}`,
      metric: { label: "Projected visits", value: forecast, change: Math.round(trend) },
      recommendation:
        trend < 0
          ? "Visit activity is declining. Review rep schedules and ensure plans are being executed."
          : "Maintain current visit cadence to sustain growth.",
      createdAt: now.toISOString(),
    });
  }

  // Pipeline value forecast
  const activePipeline = salesOrders.filter(
    (so) =>
      so.status !== "CANCELLED" && so.status !== "DELIVERED" && so.status !== "INVOICED"
  );
  if (activePipeline.length > 0) {
    const totalPipeline = activePipeline.reduce((s, so) => s + so.total, 0);
    // Simple weighted probability based on stage
    const weightedValue = activePipeline.reduce((s, so) => {
      const weight = getStageWeight(so.status);
      return s + so.total * weight;
    }, 0);
    insights.push({
      id: genId(),
      type: "forecast",
      severity: "info",
      title: "Pipeline Value Forecast",
      description: `Active pipeline: ${totalPipeline.toLocaleString()} EGP. Weighted forecast (probability-adjusted): ${Math.round(weightedValue).toLocaleString()} EGP.`,
      metric: { label: "Weighted pipeline", value: Math.round(weightedValue), unit: "EGP" },
      recommendation:
        "Focus on advancing orders in early stages to increase weighted pipeline value.",
      createdAt: now.toISOString(),
    });
  }

  // Invoice collection forecast
  const pendingInvoices = invoices.filter(
    (inv) => inv.status === "SENT" || inv.status === "PARTIAL"
  );
  if (pendingInvoices.length > 0) {
    const totalPending = pendingInvoices.reduce((s, inv) => s + inv.total, 0);
    insights.push({
      id: genId(),
      type: "forecast",
      severity: "info",
      title: "Expected Collections",
      description: `${pendingInvoices.length} pending invoices totaling ${totalPending.toLocaleString()} EGP expected for collection.`,
      metric: { label: "Pending collections", value: totalPending, unit: "EGP" },
      recommendation:
        "Proactively follow up on invoices nearing their due date to improve cash flow.",
      createdAt: now.toISOString(),
    });
  }

  return insights;
}

function getWeekKey(d: Date): string {
  const start = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - start.getTime()) / 86_400_000 + start.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function linearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function getStageWeight(
  status: string
): number {
  switch (status) {
    case "DRAFT": return 0.1;
    case "PENDING_APPROVAL": return 0.2;
    case "CONFIRMED": return 0.5;
    case "PROCESSING": return 0.7;
    case "PREPARING": return 0.8;
    case "SHIPPED": return 0.9;
    default: return 0.3;
  }
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

export function generateInsights(
  data: DataStoreState,
  userRole: UserRole,
  userId?: string
): Insight[] {
  insightSeq = 0; // reset for deterministic IDs within a call
  const allInsights: Insight[] = [];

  const allUserIds = [
    ...new Set([
      ...data.visits.map((v) => v.repId),
      ...data.weeklyPlans.map((p) => p.repId),
      ...data.kpis.map((k) => k.userId),
    ]),
  ];

  // Determine scope based on role
  const isFieldRole = userRole === "MEDICAL_REP";
  const isManagerRole = ["DISTRICT_MANAGER", "BUM", "MARKETEER", "NSM", "ADMIN"].includes(userRole);

  // Visit patterns — always relevant for field/management roles
  if (isFieldRole || isManagerRole) {
    allInsights.push(
      ...analyzeVisitPatterns(
        data.doctors,
        data.visits,
        data.weeklyPlans,
        isFieldRole ? userId : undefined
      )
    );
  }

  // Doctor engagement
  if (isFieldRole || isManagerRole) {
    allInsights.push(
      ...analyzeDoctorEngagement(
        data.doctors,
        data.visits,
        data.marketRequests
      )
    );
  }

  // Sales trends — for managers and finance
  if (isManagerRole || userRole === "ACCOUNTANT") {
    allInsights.push(
      ...analyzeSalesTrends(data.salesOrders, data.invoices, data.customers)
    );
  }

  // Expense anomalies — for managers and finance
  if (isManagerRole || userRole === "ACCOUNTANT") {
    allInsights.push(
      ...analyzeExpenseAnomalies(data.invoices, data.salesOrders)
    );
  }

  // Team performance — for managers only
  if (isManagerRole) {
    allInsights.push(
      ...analyzeTeamPerformance(
        data.kpis,
        data.visits,
        data.weeklyPlans,
        allUserIds
      )
    );
  }

  // Territory gaps — for DMs, BUMs, NSM
  if (["DISTRICT_MANAGER", "BUM", "NSM", "ADMIN"].includes(userRole)) {
    allInsights.push(
      ...analyzeTerritoryGaps(data.territories, data.doctors, allUserIds)
    );
  }

  // Forecasts — available for most roles
  if (isFieldRole || isManagerRole || userRole === "ACCOUNTANT") {
    allInsights.push(
      ...generateForecasts(data.visits, data.invoices, data.salesOrders)
    );
  }

  // Sort by severity priority
  const severityOrder: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3,
  };
  allInsights.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return allInsights;
}
