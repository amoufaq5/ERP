"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  Target,
  TrendingUp,
  LifeBuoy,
  ArrowRight,
  Clock,
} from "lucide-react";

import { useDataStore } from "@/lib/data-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";

// ---------------------------------------------------------------------------
// Lazy-loaded module pages
// ---------------------------------------------------------------------------

const AccountsPage = dynamic(
  () => import("@/app/(dashboard)/crm/accounts/page"),
  { ssr: false },
);
const ContactsPage = dynamic(
  () => import("@/app/(dashboard)/crm/contacts/page"),
  { ssr: false },
);
const LeadsPage = dynamic(
  () => import("@/app/(dashboard)/crm/leads/page"),
  { ssr: false },
);
const OpportunitiesPage = dynamic(
  () => import("@/app/(dashboard)/crm/opportunities/page"),
  { ssr: false },
);
const CampaignsPage = dynamic(
  () => import("@/app/(dashboard)/crm/campaigns/page"),
  { ssr: false },
);
const TicketsPage = dynamic(
  () => import("@/app/(dashboard)/crm/tickets/page"),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  `EGP ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const PIPELINE_STAGES: {
  label: string;
  count: number;
  color: string;
  bg: string;
}[] = [
  { label: "Prospecting", count: 34, color: "bg-blue-500", bg: "bg-blue-50 text-blue-700" },
  { label: "Qualification", count: 22, color: "bg-cyan-500", bg: "bg-cyan-50 text-cyan-700" },
  { label: "Proposal", count: 15, color: "bg-amber-500", bg: "bg-amber-50 text-amber-700" },
  { label: "Negotiation", count: 8, color: "bg-orange-500", bg: "bg-orange-50 text-orange-700" },
  { label: "Closed Won", count: 12, color: "bg-green-500", bg: "bg-green-50 text-green-700" },
  { label: "Closed Lost", count: 5, color: "bg-red-500", bg: "bg-red-50 text-red-700" },
];

const MAX_PIPELINE_COUNT = Math.max(...PIPELINE_STAGES.map((s) => s.count));

const RECENT_ACTIVITIES: {
  description: string;
  time: string;
}[] = [
  { description: "New lead captured - Pharma Corp", time: "2 hours ago" },
  { description: "Meeting scheduled with MedTech Inc", time: "4 hours ago" },
  { description: "Proposal sent to HealthPlus", time: "yesterday" },
  { description: "Ticket #1234 resolved", time: "yesterday" },
  { description: "Campaign 'Q2 Outreach' launched", time: "2 days ago" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CRMSalesHubPage() {
  const store = useDataStore();

  // ---- KPIs ---------------------------------------------------------------

  const totalAccounts = store.customers.length;

  const pipelineValue = useMemo(
    () => store.customers.reduce((sum, c) => sum + c.outstanding, 0),
    [store.customers],
  );

  // ---- Top 5 accounts by outstanding --------------------------------------

  const topAccounts = useMemo(
    () =>
      [...store.customers]
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 5),
    [store.customers],
  );

  // ---- Render -------------------------------------------------------------

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            CRM Sales Operations
          </h1>
          <p className="text-muted-foreground">
            Unified customer relationship management and sales pipeline
          </p>
        </div>

        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>
      </div>

      {/* ================================================================= */}
      {/* OVERVIEW TAB                                                      */}
      {/* ================================================================= */}
      <TabsContent value="overview" className="space-y-6">
        {/* KPI Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={Building2}
            title="Total Accounts"
            value={totalAccounts}
            change={12}
            changeLabel="vs last period"
            iconColor="bg-blue-100 text-blue-700"
          />
          <StatsCard
            icon={Target}
            title="Active Leads"
            value={34}
            change={8}
            changeLabel="vs last period"
            iconColor="bg-amber-100 text-amber-700"
          />
          <StatsCard
            icon={TrendingUp}
            title="Pipeline Value"
            value={fmt(pipelineValue)}
            change={15}
            changeLabel="vs last period"
            iconColor="bg-green-100 text-green-700"
          />
          <StatsCard
            icon={LifeBuoy}
            title="Open Tickets"
            value={12}
            change={-5}
            changeLabel="vs last period"
            iconColor="bg-purple-100 text-purple-700"
          />
        </div>

        {/* Two-column section: Pipeline + Top Accounts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sales Pipeline Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                Sales Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.label}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${stage.bg}`}
                    >
                      {stage.count}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full ${stage.color} transition-all`}
                      style={{
                        width: `${(stage.count / MAX_PIPELINE_COUNT) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Top Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium text-right">
                        Outstanding
                      </th>
                      <th className="pb-2 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAccounts.map((customer) => (
                      <tr key={customer.id} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{customer.name}</td>
                        <td className="py-2.5 text-muted-foreground">
                          {customer.type}
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          {fmt(customer.outstanding)}
                        </td>
                        <td className="py-2.5 text-center">
                          <StatusBadge status={customer.status} />
                        </td>
                      </tr>
                    ))}
                    {topAccounts.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-4 text-center text-muted-foreground"
                        >
                          No accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {RECENT_ACTIVITIES.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {activity.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ================================================================= */}
      {/* MODULE TABS                                                       */}
      {/* ================================================================= */}
      <TabsContent value="accounts">
        <AccountsPage />
      </TabsContent>

      <TabsContent value="contacts">
        <ContactsPage />
      </TabsContent>

      <TabsContent value="leads">
        <LeadsPage />
      </TabsContent>

      <TabsContent value="opportunities">
        <OpportunitiesPage />
      </TabsContent>

      <TabsContent value="campaigns">
        <CampaignsPage />
      </TabsContent>

      <TabsContent value="tickets">
        <TicketsPage />
      </TabsContent>
    </Tabs>
  );
}
