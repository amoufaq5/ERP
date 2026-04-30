"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  FileText,
  Table2,
  Upload,
  Database,
  Link2,
  Puzzle,
  Zap,
  Settings,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import StatsCard from "@/components/shared/stats-card";

// ---------------------------------------------------------------------------
// Lazy-loaded module pages
// ---------------------------------------------------------------------------

const DocumentsPage = dynamic(
  () => import("@/app/(dashboard)/documents/page"),
  { ssr: false }
);
const SpreadsheetPage = dynamic(
  () => import("@/app/(dashboard)/spreadsheet/page"),
  { ssr: false }
);
const DataUploadPage = dynamic(
  () => import("@/app/(dashboard)/data-upload/page"),
  { ssr: false }
);
const DataMigrationPage = dynamic(
  () => import("@/app/(dashboard)/data-migration/page"),
  { ssr: false }
);
const IntegrationPage = dynamic(
  () => import("@/app/(dashboard)/integration/page"),
  { ssr: false }
);
const EcosystemPage = dynamic(
  () => import("@/app/(dashboard)/ecosystem/page"),
  { ssr: false }
);
const AutomationPage = dynamic(
  () => import("@/app/(dashboard)/automation/page"),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Tool cards data
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    icon: FileText,
    title: "Documents",
    description: "Manage documents, templates, and file storage",
    tab: "documents",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    icon: Table2,
    title: "Spreadsheet",
    description: "Advanced spreadsheet with formulas and charts",
    tab: "spreadsheet",
    iconBg: "bg-green-100 text-green-700",
  },
  {
    icon: Upload,
    title: "Data Upload",
    description: "Import data from CSV, Excel, and other formats",
    tab: "data-upload",
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    icon: Database,
    title: "Data Migration",
    description: "Migrate data between systems and modules",
    tab: "migration",
    iconBg: "bg-purple-100 text-purple-700",
  },
  {
    icon: Link2,
    title: "Integration",
    description: "Connect with external systems and APIs",
    tab: "integration",
    iconBg: "bg-cyan-100 text-cyan-700",
  },
  {
    icon: Puzzle,
    title: "Ecosystem",
    description: "Manage plugins, extensions, and marketplace",
    tab: "ecosystem",
    iconBg: "bg-pink-100 text-pink-700",
  },
  {
    icon: Zap,
    title: "Automation",
    description: "Create automated workflows and triggers",
    tab: "automation",
    iconBg: "bg-orange-100 text-orange-700",
  },
] as const;

// ---------------------------------------------------------------------------
// System health data
// ---------------------------------------------------------------------------

const SYSTEM_HEALTH = [
  { label: "Database", status: "healthy" as const, detail: "Healthy" },
  { label: "API Gateway", status: "healthy" as const, detail: "Healthy" },
  { label: "File Storage", status: "warning" as const, detail: "67% used" },
  { label: "Background Jobs", status: "healthy" as const, detail: "3 running" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ToolsHubPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tools &amp; Administration
          </h1>
          <p className="text-muted-foreground">
            System tools, data management, and automation workflows
          </p>
        </div>

        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="spreadsheet">Spreadsheet</TabsTrigger>
          <TabsTrigger value="data-upload">Data Upload</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>
      </div>

      {/* ================================================================= */}
      {/* OVERVIEW TAB                                                      */}
      {/* ================================================================= */}
      <TabsContent value="overview" className="space-y-6">
        {/* KPI Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={Link2}
            title="Active Integrations"
            value={8}
            trend={{ value: 2 }}
            iconColor="bg-cyan-100 text-cyan-700"
          />
          <StatsCard
            icon={FileText}
            title="Documents"
            value={156}
            iconColor="bg-blue-100 text-blue-700"
          />
          <StatsCard
            icon={Zap}
            title="Automation Rules"
            value={12}
            iconColor="bg-orange-100 text-orange-700"
          />
          <StatsCard
            icon={Upload}
            title="Data Imports"
            value="34 this month"
            iconColor="bg-amber-100 text-amber-700"
          />
        </div>

        {/* Tools Grid */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Tools</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.tab}
                  className="group cursor-pointer border transition-shadow hover:shadow-md"
                  onClick={() => setActiveTab(tool.tab)}
                >
                  <CardContent className="flex items-start gap-4 p-5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tool.iconBg}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{tool.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                    <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* System Health */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">System Health</h2>
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {SYSTEM_HEALTH.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg border p-4"
                  >
                    {item.status === "healthy" ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p
                        className={`text-xs ${
                          item.status === "healthy"
                            ? "text-green-600"
                            : "text-amber-600"
                        }`}
                      >
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ================================================================= */}
      {/* MODULE TABS                                                       */}
      {/* ================================================================= */}
      <TabsContent value="documents">
        <DocumentsPage />
      </TabsContent>

      <TabsContent value="spreadsheet">
        <SpreadsheetPage />
      </TabsContent>

      <TabsContent value="data-upload">
        <DataUploadPage />
      </TabsContent>

      <TabsContent value="migration">
        <DataMigrationPage />
      </TabsContent>

      <TabsContent value="integration">
        <IntegrationPage />
      </TabsContent>

      <TabsContent value="ecosystem">
        <EcosystemPage />
      </TabsContent>

      <TabsContent value="automation">
        <AutomationPage />
      </TabsContent>
    </Tabs>
  );
}
