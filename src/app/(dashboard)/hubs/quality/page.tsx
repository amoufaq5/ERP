"use client";

import dynamic from "next/dynamic";
import {
  ShieldCheck,
  CheckSquare,
  Scale,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";

// ---------------------------------------------------------------------------
// Lazy-loaded module pages
// ---------------------------------------------------------------------------
const QAQCPage = dynamic(() => import("@/app/(dashboard)/qaqc/page"), {
  loading: () => <ModuleLoadingFallback />,
});
const SafetyPage = dynamic(() => import("@/app/(dashboard)/safety/page"), {
  loading: () => <ModuleLoadingFallback />,
});
const CompliancePage = dynamic(
  () => import("@/app/(dashboard)/compliance/page"),
  { loading: () => <ModuleLoadingFallback /> },
);

function ModuleLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
interface QualityMetric {
  label: string;
  value: number;
  color: string;
}

const qualityMetrics: QualityMetric[] = [
  { label: "Batches Tested", value: 156, color: "text-foreground" },
  { label: "Passed", value: 148, color: "text-green-600" },
  { label: "Failed", value: 8, color: "text-red-500" },
  { label: "Pending Review", value: 12, color: "text-yellow-600" },
];

interface SafetyStat {
  label: string;
  value: string | number;
  color: string;
}

const safetyStats: SafetyStat[] = [
  { label: "Days Without Incident", value: 47, color: "text-green-600" },
  { label: "Open Safety Tickets", value: 3, color: "text-yellow-600" },
  { label: "Training Completion", value: "89%", color: "text-blue-600" },
  { label: "Near Misses This Month", value: 2, color: "text-orange-500" },
];

interface ComplianceMetric {
  label: string;
  value: number;
  color: string;
}

const complianceMetrics: ComplianceMetric[] = [
  { label: "Audits Completed", value: 24, color: "text-green-600" },
  { label: "Pending Audits", value: 3, color: "text-yellow-600" },
  { label: "Overdue Items", value: 1, color: "text-red-500" },
  { label: "Certificates Expiring Soon", value: 2, color: "text-orange-500" },
];

type AlertSeverity = "Critical" | "Warning" | "Info";

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: string;
  module: string;
}

const recentAlerts: Alert[] = [
  {
    id: "ALT-001",
    title: "NCR #2847 — Critical defect in Batch B-1042",
    description:
      "Dimensional tolerance exceeded upper control limit by 0.3mm. Batch quarantined pending disposition.",
    severity: "Critical",
    module: "Quality",
    timestamp: "2 hours ago",
  },
  {
    id: "ALT-002",
    title: "Safety training deadline approaching",
    description:
      "12 employees have not completed mandatory forklift recertification due by April 30.",
    severity: "Warning",
    module: "Safety",
    timestamp: "5 hours ago",
  },
  {
    id: "ALT-003",
    title: "ISO 9001 surveillance audit scheduled",
    description:
      "External audit confirmed for May 15–16. Pre-audit checklist available for review.",
    severity: "Info",
    module: "Compliance",
    timestamp: "1 day ago",
  },
  {
    id: "ALT-004",
    title: "Elevated near-miss rate in Warehouse Zone C",
    description:
      "Two near-miss incidents reported within 7 days. Root cause investigation initiated.",
    severity: "Warning",
    module: "Safety",
    timestamp: "1 day ago",
  },
  {
    id: "ALT-005",
    title: "Environmental permit renewal overdue",
    description:
      "Stormwater discharge permit expired on April 18. Renewal application submitted; awaiting agency response.",
    severity: "Critical",
    module: "Compliance",
    timestamp: "3 days ago",
  },
];

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  Warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Info: "bg-blue-100 text-blue-800 border-blue-200",
};

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={CheckSquare}
          title="QA Pass Rate"
          value="94.7%"
          change={2.1}
          changeLabel="vs last month"
          iconColor="bg-green-100 text-green-700"
        />
        <StatsCard
          icon={ShieldCheck}
          title="Safety Score"
          value="98.2 / 100"
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          icon={AlertTriangle}
          title="Open NCRs"
          value={7}
          subtitle="Non-conformance reports"
          iconColor="bg-yellow-100 text-yellow-700"
        />
        <StatsCard
          icon={Scale}
          title="Compliance Rate"
          value="96.8%"
          iconColor="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Three-column module summary grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quality Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Quality</CardTitle>
                <CardDescription>Recent QA metrics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {qualityMetrics.map((m) => (
                <li
                  key={m.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className={`font-semibold ${m.color}`}>{m.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Safety Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Safety</CardTitle>
                <CardDescription>Workplace safety stats</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {safetyStats.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={`font-semibold ${s.color}`}>{s.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Compliance Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Compliance</CardTitle>
                <CardDescription>Regulatory compliance metrics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {complianceMetrics.map((c) => (
                <li
                  key={c.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className={`font-semibold ${c.color}`}>{c.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Recent Alerts</CardTitle>
          </div>
          <CardDescription>
            Latest quality, safety, and compliance notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {recentAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[alert.severity]}`}
                  >
                    {alert.severity}
                  </span>
                  <StatusBadge status={alert.module} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {alert.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {alert.timestamp}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function QualitySafetyComplianceHubPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Quality, Safety &amp; Compliance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unified quality management, workplace safety, and regulatory
          compliance
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="qaqc">QA/QC</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="qaqc">
          <QAQCPage />
        </TabsContent>

        <TabsContent value="safety">
          <SafetyPage />
        </TabsContent>

        <TabsContent value="compliance">
          <CompliancePage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
