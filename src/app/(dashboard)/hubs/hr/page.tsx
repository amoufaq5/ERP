"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Users,
  Briefcase,
  UserSearch,
  GraduationCap,
  ArrowRight,
  ClipboardList,
  CalendarCheck,
  UserPlus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useApiDataStore } from "@/lib/api/use-api-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/shared/stats-card";

// ---------------------------------------------------------------------------
// Lazy-loaded module pages
// ---------------------------------------------------------------------------

const HRPage = dynamic(
  () => import("@/app/(dashboard)/erp/hr/page"),
  { ssr: false }
);
const JobsPage = dynamic(
  () => import("@/app/(dashboard)/ats/jobs/page"),
  { ssr: false }
);
const CandidatesPage = dynamic(
  () => import("@/app/(dashboard)/ats/candidates/page"),
  { ssr: false }
);
const InterviewsPage = dynamic(
  () => import("@/app/(dashboard)/ats/interviews/page"),
  { ssr: false }
);
const OnboardingPage = dynamic(
  () => import("@/app/(dashboard)/ats/onboarding/page"),
  { ssr: false }
);
const TrainingPage = dynamic(
  () => import("@/app/(dashboard)/ats/training/page"),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const PIPELINE_STAGES: { label: string; count: number; color: string }[] = [
  { label: "Applied", count: 87, color: "bg-blue-500" },
  { label: "Screening", count: 34, color: "bg-indigo-500" },
  { label: "Interview", count: 18, color: "bg-violet-500" },
  { label: "Offer", count: 5, color: "bg-amber-500" },
  { label: "Hired", count: 3, color: "bg-green-500" },
];

const MAX_PIPELINE = Math.max(...PIPELINE_STAGES.map((s) => s.count));

const DEPARTMENT_DATA = [
  { department: "Engineering", employees: 62 },
  { department: "Sales", employees: 45 },
  { department: "Operations", employees: 38 },
  { department: "IT", employees: 30 },
  { department: "Marketing", employees: 28 },
  { department: "Finance", employees: 22 },
  { department: "HR", employees: 15 },
  { department: "Legal", employees: 8 },
];

const QUICK_LINKS: {
  title: string;
  description: string;
  href: string;
  tab: string;
  icon: React.ElementType;
}[] = [
  {
    title: "HR & Payroll",
    description: "Employees, departments, leave & payroll",
    href: "/erp/hr",
    tab: "hr",
    icon: Users,
  },
  {
    title: "Jobs",
    description: "Open positions & job postings",
    href: "/ats/jobs",
    tab: "jobs",
    icon: Briefcase,
  },
  {
    title: "Candidates",
    description: "Applicant tracking & pipeline",
    href: "/ats/candidates",
    tab: "candidates",
    icon: UserSearch,
  },
  {
    title: "Interviews",
    description: "Schedule & manage interviews",
    href: "/ats/interviews",
    tab: "interviews",
    icon: CalendarCheck,
  },
  {
    title: "Onboarding",
    description: "New hire onboarding workflows",
    href: "/ats/onboarding",
    tab: "onboarding",
    icon: ClipboardList,
  },
  {
    title: "Training",
    description: "Training programs & certifications",
    href: "/ats/training",
    tab: "training",
    icon: GraduationCap,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HRTalentHubPage() {
  useApiDataStore();

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            HR &amp; Talent Management
          </h1>
          <p className="text-muted-foreground">
            Unified workforce and talent acquisition dashboard
          </p>
        </div>

        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hr">HR &amp; Payroll</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>
      </div>

      {/* ================================================================= */}
      {/* OVERVIEW TAB                                                      */}
      {/* ================================================================= */}
      <TabsContent value="overview" className="space-y-6">
        {/* KPI Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={Users}
            title="Total Employees"
            value={248}
            subtitle="Active workforce"
            change={3}
            changeLabel="vs last quarter"
            iconColor="bg-blue-100 text-blue-700"
          />
          <StatsCard
            icon={Briefcase}
            title="Open Positions"
            value={12}
            subtitle="Across 5 departments"
            iconColor="bg-amber-100 text-amber-700"
          />
          <StatsCard
            icon={UserSearch}
            title="Active Candidates"
            value={87}
            subtitle="In hiring pipeline"
            iconColor="bg-violet-100 text-violet-700"
          />
          <StatsCard
            icon={GraduationCap}
            title="Training Programs"
            value={15}
            subtitle="Currently running"
            iconColor="bg-green-100 text-green-700"
          />
        </div>

        {/* Two-column section: Hiring Pipeline + Department Distribution */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Hiring Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                Hiring Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PIPELINE_STAGES.map((stage) => (
                  <div key={stage.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {stage.count}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${stage.color} transition-all`}
                        style={{
                          width: `${(stage.count / MAX_PIPELINE) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Department Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={DEPARTMENT_DATA}
                    layout="vertical"
                    margin={{ top: 0, right: 20, bottom: 0, left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="department"
                      fontSize={12}
                      width={75}
                    />
                    <Tooltip
                      formatter={(value) =>
                        `${value} employees`
                      }
                    />
                    <Bar
                      dataKey="employees"
                      name="Employees"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.tab} href={link.href}>
                  <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{link.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </TabsContent>

      {/* ================================================================= */}
      {/* MODULE TABS                                                       */}
      {/* ================================================================= */}
      <TabsContent value="hr" className="mt-0">
        <HRPage />
      </TabsContent>

      <TabsContent value="jobs" className="mt-0">
        <JobsPage />
      </TabsContent>

      <TabsContent value="candidates" className="mt-0">
        <CandidatesPage />
      </TabsContent>

      <TabsContent value="interviews" className="mt-0">
        <InterviewsPage />
      </TabsContent>

      <TabsContent value="onboarding" className="mt-0">
        <OnboardingPage />
      </TabsContent>

      <TabsContent value="training" className="mt-0">
        <TrainingPage />
      </TabsContent>
    </Tabs>
  );
}
