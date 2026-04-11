"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAppConfig } from "@/lib/config-context";
import { useCurrentUser } from "@/lib/user-context";
import { downloadHTML, buildPrintableReport } from "@/lib/download";
import {
  FlaskConical,
  FileText,
  Microscope,
  Thermometer,
  ClipboardList,
  Pill,
  AlertTriangle,
  Beaker,
  ShieldCheck,
  Activity,
  Fingerprint,
  PackageCheck,
  Cog,
  Search,
  Download,
  Pill as PillIcon,
  type LucideIcon,
} from "lucide-react";

interface PharmaSolution {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: "Production" | "Quality" | "Regulatory" | "Distribution" | "R&D";
}

const PHARMA_SOLUTIONS: PharmaSolution[] = [
  {
    id: "pharma-batch",
    name: "Batch Tracking & Lot Management",
    description: "Track production batches, lot numbers, expiry dates, and recall workflows. EDA / FDA / GMP compliant.",
    icon: FlaskConical,
    category: "Production",
  },
  {
    id: "pharma-regulatory",
    name: "Drug Regulatory Compliance",
    description: "Manage EDA submissions, ANDA/NDA filings, GMP certifications, and full audit trail.",
    icon: FileText,
    category: "Regulatory",
  },
  {
    id: "pharma-qc",
    name: "Quality Control (QC/QA)",
    description: "Lab test management, stability studies, deviations, CAPA, ALCOA+ data integrity.",
    icon: Microscope,
    category: "Quality",
  },
  {
    id: "pharma-coldchain",
    name: "Cold Chain Management",
    description: "2-8°C storage monitoring, last-mile cold chain logistics, IoT temperature alerts.",
    icon: Thermometer,
    category: "Distribution",
  },
  {
    id: "pharma-clinical",
    name: "Clinical Trial Management",
    description: "Phase I-IV trials, patient enrollment, adverse events, regulatory submissions.",
    icon: ClipboardList,
    category: "R&D",
  },
  {
    id: "pharma-distribution",
    name: "Pharmacy Distribution",
    description: "Wholesaler & pharmacy chain management, allocation, scheduled drug compliance.",
    icon: Pill,
    category: "Distribution",
  },
  {
    id: "pharma-expiry",
    name: "Expiry & Recall Management",
    description: "Automated expiry alerts, recall workflows, affected batch tracing & customer notifications.",
    icon: AlertTriangle,
    category: "Quality",
  },
  {
    id: "pharma-rd",
    name: "R&D Pipeline",
    description: "Drug discovery pipeline, compound tracking, IP / patent management.",
    icon: Beaker,
    category: "R&D",
  },
  {
    id: "pharma-gmp",
    name: "GMP Compliance & Audits",
    description: "Good Manufacturing Practice tracking, internal audits, supplier qualifications, EU-GMP / WHO-GMP.",
    icon: ShieldCheck,
    category: "Quality",
  },
  {
    id: "pharma-pv",
    name: "Pharmacovigilance",
    description: "Adverse event reporting, signal detection, periodic safety reports (PSUR/PBRER).",
    icon: Activity,
    category: "Regulatory",
  },
  {
    id: "pharma-serialization",
    name: "Serialization & Track-and-Trace",
    description: "Item-level serialization (DSCSA / EU FMD), aggregation, track & trace through supply chain.",
    icon: Fingerprint,
    category: "Distribution",
  },
  {
    id: "pharma-narcotics",
    name: "Narcotics & Controlled Substances",
    description: "Schedule II-V tracking, DEA / EDA narcotic compliance, secure dispensing & destruction logs.",
    icon: PackageCheck,
    category: "Regulatory",
  },
];

export default function IndustryPage() {
  const { config, toggleIndustrySolution } = useAppConfig();
  const { user } = useCurrentUser();
  const isAdmin = user.role === "ADMIN";
  const [search, setSearch] = useState("");

  const filtered = PHARMA_SOLUTIONS.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = PHARMA_SOLUTIONS.filter(
    (s) => config.industry.enabledSolutions[s.id]
  ).length;

  function handleToggle(id: string) {
    if (!isAdmin) return;
    toggleIndustrySolution(id);
  }

  function handleDownloadTemplate() {
    const html = buildPrintableReport({
      title: "Pharmaceutical Industry Configuration",
      subtitle: `${enabledCount}/${PHARMA_SOLUTIONS.length} solutions active`,
      sections: [
        {
          heading: "Active Solutions",
          rows: PHARMA_SOLUTIONS.filter((s) => config.industry.enabledSolutions[s.id]).map((s) => ({
            Solution: s.name,
            Category: s.category,
            Description: s.description,
          })),
        },
        {
          heading: "Inactive Solutions",
          rows: PHARMA_SOLUTIONS.filter((s) => !config.industry.enabledSolutions[s.id]).map((s) => ({
            Solution: s.name,
            Category: s.category,
            Description: s.description,
          })),
        },
      ],
    });
    downloadHTML("pharma-industry-config.html", html);
  }

  // Pharma KPIs
  const stats = [
    { label: "Active Batches", value: 24 },
    { label: "GMP Compliance", value: "98.5%" },
    { label: "Expiring < 90d", value: 12 },
    { label: "Pending QC", value: 8 },
    { label: "Active Trials", value: 3 },
    { label: "Recall Alerts", value: 0 },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <PillIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Industry Solutions</h1>
          <Badge variant="success" className="ml-2">PHARMACEUTICAL</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Specialized modules and workflows tailored for pharmaceutical manufacturers and distributors
        </p>
      </div>

      {/* Locked-industry banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          This installation is locked to the <strong>Pharmaceutical</strong> industry vertical.
          {isAdmin
            ? " You can enable or disable individual pharma solutions below."
            : " Contact your administrator to change which solutions are active."}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search pharma solutions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-64 text-sm"
            />
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            <Activity className="h-3 w-3 mr-1" />
            {enabledCount} / {PHARMA_SOLUTIONS.length} active
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-sm gap-1.5 whitespace-nowrap"
          onClick={handleDownloadTemplate}
        >
          <Download className="h-4 w-4" />
          Download Configuration
        </Button>
      </div>

      {/* Solutions grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sol) => {
            const Icon = sol.icon;
            const enabled = !!config.industry.enabledSolutions[sol.id];
            return (
              <Card
                key={sol.id}
                className="flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-sm font-semibold leading-tight">
                        {sol.name}
                      </CardTitle>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => handleToggle(sol.id)}
                      disabled={!isAdmin}
                      aria-label={`Toggle ${sol.name}`}
                      className="shrink-0 mt-0.5"
                    />
                  </div>
                </CardHeader>
                <CardContent className="pb-4 flex flex-col gap-3 flex-1">
                  <CardDescription className="text-xs leading-relaxed">
                    {sol.description}
                  </CardDescription>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {sol.category}
                    </Badge>
                    <Badge variant={enabled ? "success" : "secondary"} className="text-xs">
                      {enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Search className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            No solutions found matching{" "}
            <span className="font-medium text-foreground">
              &ldquo;{search}&rdquo;
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs mt-1"
            onClick={() => setSearch("")}
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
