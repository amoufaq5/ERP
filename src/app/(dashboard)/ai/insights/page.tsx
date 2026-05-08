"use client";

import { useMemo } from "react";
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import InsightsPanel from "@/components/shared/insights-panel";
import ScoreCard from "@/components/shared/score-card";
import { useCurrentUser } from "@/lib/user-context";
import { useDataStore } from "@/lib/data-store";
import { generateInsights } from "@/lib/ai/insights-engine";
import {
  getRecommendations,
  type Recommendation,
} from "@/lib/ai/recommendation-engine";
import {
  calculateRepScore,
  calculatePipelineHealth,
  calculateDoctorScore,
  calculateTerritoryHealth,
} from "@/lib/ai/scoring";
import type { UserRole } from "@/lib/auth/role-routes";

// ─── Category colors ────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "visit-optimization": "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "doctor-targeting": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "expense-management": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "territory-coverage": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "pipeline-acceleration": "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
};

const IMPACT_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  high: "default",
  medium: "secondary",
  low: "secondary",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AIInsightsPage() {
  const { user } = useCurrentUser();
  const store = useDataStore();

  // Generate insights & recommendations
  const insights = useMemo(
    () => generateInsights(store, user.role as UserRole, user.id),
    [store, user.role, user.id]
  );

  const recommendations = useMemo(
    () => getRecommendations(user.id, user.role as UserRole, store),
    [user.id, user.role, store]
  );

  // Summary stats
  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const recommendationCount = insights.filter(
    (i) => i.type === "recommendation"
  ).length;
  const forecastCount = insights.filter((i) => i.type === "forecast").length;

  // Score calculations
  const repScore = useMemo(
    () =>
      calculateRepScore(user.id, store.visits, store.weeklyPlans, store.kpis),
    [user.id, store.visits, store.weeklyPlans, store.kpis]
  );

  const pipelineScore = useMemo(
    () => calculatePipelineHealth(store.salesOrders, store.invoices),
    [store.salesOrders, store.invoices]
  );

  // Pick a representative doctor for the score card
  const topDoctor = useMemo(() => {
    const assigned = store.doctors.filter(
      (d) => d.assignedRepId === user.id || user.role !== "MEDICAL_REP"
    );
    return assigned.length > 0 ? assigned[0] : null;
  }, [store.doctors, user.id, user.role]);

  const doctorScore = useMemo(() => {
    if (!topDoctor) return null;
    return calculateDoctorScore(topDoctor, store.visits, store.marketRequests);
  }, [topDoctor, store.visits, store.marketRequests]);

  // Territory score
  const territoryScore = useMemo(() => {
    const bricks = store.territories.filter((t) => t.level === "brick");
    if (bricks.length === 0) return null;
    // Pick first brick with assigned reps, or first brick
    const target =
      bricks.find((t) => t.assignedRepIds.length > 0) ?? bricks[0];
    return calculateTerritoryHealth(target, store.doctors);
  }, [store.territories, store.doctors]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights & Analytics"
        description="Smart analytics and recommendations powered by your field operations data"
        icon={<Brain className="h-6 w-6 text-purple-600" />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={BarChart3}
          title="Total Insights"
          value={insights.length}
          subtitle="Across all categories"
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Critical Alerts"
          value={criticalCount}
          subtitle="Require immediate action"
          iconColor="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
        />
        <StatsCard
          icon={Lightbulb}
          title="Recommendations"
          value={recommendationCount}
          subtitle="Actionable suggestions"
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
        />
        <StatsCard
          icon={Target}
          title="Forecasts"
          value={forecastCount}
          subtitle="Predictive analytics"
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main insights panel */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Insights Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InsightsPanel
                userId={user.id}
                role={user.role}
              />
            </CardContent>
          </Card>

          {/* Action items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Prioritized Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No recommendations at this time
                </p>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <RecommendationRow key={rec.id} rec={rec} index={idx} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar — score cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreCard
                label="Rep Score"
                score={repScore.score}
                factors={repScore.factors}
                trend={repScore.trend}
                size="md"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreCard
                label="Pipeline"
                score={pipelineScore.score}
                factors={pipelineScore.factors}
                trend={pipelineScore.trend}
                size="sm"
              />
            </CardContent>
          </Card>

          {doctorScore && topDoctor && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Doctor Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreCard
                  label={topDoctor.name}
                  score={doctorScore.score}
                  factors={doctorScore.factors}
                  trend={doctorScore.trend}
                  size="sm"
                />
              </CardContent>
            </Card>
          )}

          {territoryScore && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Territory Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreCard
                  label="Territory"
                  score={territoryScore.score}
                  factors={territoryScore.factors}
                  trend={territoryScore.trend}
                  size="sm"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Recommendation Row ─────────────────────────────────────────────────────

function RecommendationRow({
  rec,
  index,
}: {
  rec: Recommendation;
  index: number;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{rec.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant={IMPACT_BADGE[rec.impact] ?? "secondary"}
              className="text-[10px]"
            >
              {rec.impact} impact
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {rec.effort} effort
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{rec.action}</p>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
              CATEGORY_COLORS[rec.category] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {rec.category.replace(/-/g, " ")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Priority: {rec.priority}/10
          </span>
        </div>
      </div>
    </div>
  );
}
