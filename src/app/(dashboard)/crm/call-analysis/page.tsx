"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, Users, TrendingUp, Target, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useCurrentUser } from "@/lib/user-context";
import { downloadCSV } from "@/lib/download";
import { useTranslation } from "@/lib/i18n/i18n-context";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Egyptian work week is Sat-Thu (6 days). ~26 working days per month. */
const WORKING_DAYS_PER_MONTH = 26;

function getMonthOptions(): { label: string; value: string }[] {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
    months.push({ label, value });
  }
  return months;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isVisitInMonth(dateTime: string, month: string): boolean {
  if (!dateTime) return false;
  return dateTime.startsWith(month);
}

// ─── Row type ───────────────────────────────────────────────────────────────

interface EmployeeRow {
  id: string;
  name: string;
  role: string;
  bu: string;
  buId: string;
  callFrequency: number;
  callRate: number;
  amVisits: number;
  pmVisits: number;
  totalVisits: number;
  uniqueDoctors: number;
  assignedDoctors: number;
  coveragePct: number;
  approvedPlans: number;
  totalPlans: number;
  planCompliancePct: number;
}

// ─── Role label mapping ─────────────────────────────────────────────────────

const ROLE_DISPLAY: Record<string, string> = {
  MEDICAL_REP: "Medical Rep",
  DISTRICT_MANAGER: "District Manager",
  MARKETEER: "Marketeer",
  BUM: "BUM",
};

const CRM_ROLES = ["MEDICAL_REP", "DISTRICT_MANAGER", "MARKETEER", "BUM"];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CallAnalysisPage() {
  const store = useApiDataStore();
  const { allUsers } = useCurrentUser();
  const { t } = useTranslation();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [selectedBU, setSelectedBU] = useState("ALL");
  const [selectedDM, setSelectedDM] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");

  const monthOptions = useMemo(() => getMonthOptions(), []);

  // Business unit options
  const buOptions = useMemo(() => {
    const bus = (store.businessUnits ?? []) as { id: string; name: string }[];
    return bus.map((bu) => ({ label: bu.name, value: bu.id }));
  }, [store.businessUnits]);

  // DM options
  const dmUsers = useMemo(() => {
    return allUsers.filter((u) => u.role === "DISTRICT_MANAGER");
  }, [allUsers]);

  // All CRM field employees
  const crmEmployees = useMemo(() => {
    return allUsers.filter((u) => CRM_ROLES.includes(u.role));
  }, [allUsers]);

  // Build rows
  const rows: EmployeeRow[] = useMemo(() => {
    const visits = (store.visits ?? []) as {
      id: string; repId: string; doctorId: string; dateTime: string;
      session: "AM" | "PM"; status: string; buId?: string | null;
    }[];
    const doctors = (store.doctors ?? []) as {
      id: string; assignedRepId: string | null; buId?: string | null;
    }[];
    const plans = (store.weeklyPlans ?? []) as {
      id: string; repId: string; status: string; weekStartDate: string;
    }[];
    const bus = (store.businessUnits ?? []) as {
      id: string; name: string; memberIds: string[];
    }[];

    const buNameMap = new Map(bus.map((b) => [b.id, b.name]));

    // Figure out which BU each user belongs to
    const userBuMap = new Map<string, { buId: string; buName: string }>();
    for (const bu of bus) {
      for (const mid of bu.memberIds ?? []) {
        if (!userBuMap.has(mid)) {
          userBuMap.set(mid, { buId: bu.id, buName: bu.name });
        }
      }
    }

    // Filter visits by selected month
    const monthVisits = visits.filter((v) => isVisitInMonth(v.dateTime, selectedMonth));

    // Filter plans that overlap with the selected month
    const monthPlans = plans.filter((p) => {
      if (!p.weekStartDate) return false;
      // A weekly plan's weekStartDate is the Monday; check if any part falls in the month
      return p.weekStartDate.startsWith(selectedMonth) ||
        // Also include plans from the end of the previous month that overlap
        (() => {
          const start = new Date(p.weekStartDate);
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
          return endStr === selectedMonth;
        })();
    });

    return crmEmployees.map((emp) => {
      const empBu = userBuMap.get(emp.id);
      const buId = empBu?.buId ?? "";
      const buName = empBu?.buName ?? "-";

      // Visits for this employee in the selected month
      const empVisits = monthVisits.filter((v) => v.repId === emp.id);
      const amVisits = empVisits.filter((v) => v.session === "AM").length;
      const pmVisits = empVisits.filter((v) => v.session === "PM").length;
      const totalVisits = empVisits.length;

      // Call frequency: total visits / working days
      const callFrequency = totalVisits / WORKING_DAYS_PER_MONTH;

      // Call rate: same as frequency (total visits / working days)
      const callRate = callFrequency;

      // Unique doctors visited
      const uniqueDoctorIds = new Set(empVisits.map((v) => v.doctorId));
      const uniqueDoctors = uniqueDoctorIds.size;

      // Assigned doctors count
      const assignedDoctors = doctors.filter((d) => d.assignedRepId === emp.id).length;

      // Coverage %
      const coveragePct = assignedDoctors > 0
        ? Math.round((uniqueDoctors / assignedDoctors) * 100)
        : 0;

      // Plan compliance: approved plans / total plans
      const empPlans = monthPlans.filter((p) => p.repId === emp.id);
      const approvedPlans = empPlans.filter((p) => p.status === "APPROVED").length;
      const totalPlans = empPlans.length;
      const planCompliancePct = totalPlans > 0
        ? Math.round((approvedPlans / totalPlans) * 100)
        : 0;

      return {
        id: emp.id,
        name: emp.name,
        role: ROLE_DISPLAY[emp.role] ?? emp.role,
        bu: buName,
        buId,
        callFrequency: Math.round(callFrequency * 100) / 100,
        callRate: Math.round(callRate * 100) / 100,
        amVisits,
        pmVisits,
        totalVisits,
        uniqueDoctors,
        assignedDoctors,
        coveragePct,
        approvedPlans,
        totalPlans,
        planCompliancePct,
      };
    });
  }, [crmEmployees, store.visits, store.doctors, store.weeklyPlans, store.businessUnits, selectedMonth]);

  // Apply filters
  const filteredRows = useMemo(() => {
    let result = rows;

    if (selectedBU !== "ALL") {
      result = result.filter((r) => r.buId === selectedBU);
    }

    if (selectedDM !== "ALL") {
      // Show the DM and all their medical reps (same department)
      const dm = allUsers.find((u) => u.id === selectedDM);
      if (dm) {
        const teamIds = new Set<string>([dm.id]);
        // Medical reps in the same department are considered the DM's team
        allUsers
          .filter((u) => u.role === "MEDICAL_REP" && u.department === dm.department)
          .forEach((u) => teamIds.add(u.id));
        result = result.filter((r) => teamIds.has(r.id));
      }
    }

    if (selectedRole !== "ALL") {
      result = result.filter((r) => {
        const roleKey = Object.entries(ROLE_DISPLAY).find(([, v]) => v === selectedRole)?.[0];
        const emp = allUsers.find((u) => u.id === r.id);
        return emp?.role === roleKey;
      });
    }

    return result;
  }, [rows, selectedBU, selectedDM, selectedRole, allUsers]);

  // Summary stats
  const stats = useMemo(() => {
    const totalCalls = filteredRows.reduce((sum, r) => sum + r.totalVisits, 0);
    const avgCallRate = filteredRows.length > 0
      ? filteredRows.reduce((sum, r) => sum + r.callRate, 0) / filteredRows.length
      : 0;
    const avgCoverage = filteredRows.length > 0
      ? filteredRows.reduce((sum, r) => sum + r.coveragePct, 0) / filteredRows.length
      : 0;
    return {
      totalCalls,
      avgCallRate: Math.round(avgCallRate * 100) / 100,
      avgCoverage: Math.round(avgCoverage),
      totalReps: filteredRows.length,
    };
  }, [filteredRows]);

  // Columns
  const columns: Column<EmployeeRow>[] = useMemo(
    () => [
      { key: "name", label: t("callAnalysis.employeeName"), sortable: true },
      { key: "role", label: t("callAnalysis.role"), sortable: true },
      { key: "bu", label: t("callAnalysis.businessUnit"), sortable: true },
      {
        key: "callFrequency",
        label: t("crm.callFrequency"),
        sortable: true,
        render: (v: number) => v.toFixed(2),
      },
      {
        key: "callRate",
        label: t("crm.callRate"),
        sortable: true,
        render: (v: number) => v.toFixed(2),
      },
      { key: "amVisits", label: t("callAnalysis.amVisits"), sortable: true },
      { key: "pmVisits", label: t("callAnalysis.pmVisits"), sortable: true },
      {
        key: "totalVisits",
        label: t("stats.totalVisits"),
        sortable: true,
        className: "font-semibold",
      },
      { key: "uniqueDoctors", label: t("callAnalysis.uniqueDoctors"), sortable: true },
      {
        key: "coveragePct",
        label: t("callAnalysis.coveragePct"),
        sortable: true,
        render: (v: number) => (
          <span className={v >= 80 ? "text-green-600" : v >= 50 ? "text-amber-600" : "text-red-600"}>
            {v}%
          </span>
        ),
      },
      {
        key: "planCompliancePct",
        label: t("callAnalysis.planCompliancePct"),
        sortable: true,
        render: (v: number, row: EmployeeRow) => (
          <span className={v >= 80 ? "text-green-600" : v >= 50 ? "text-amber-600" : "text-red-600"}>
            {v}% <span className="text-xs text-muted-foreground">({row.approvedPlans}/{row.totalPlans})</span>
          </span>
        ),
      },
    ],
    [t]
  );

  // Role filter options
  const roleOptions = Object.values(ROLE_DISPLAY);

  // Export handler
  function handleExport() {
    const csvRows = filteredRows.map((r) => ({
      "Employee Name": r.name,
      Role: r.role,
      BU: r.bu,
      "Call Frequency": r.callFrequency,
      "Call Rate": r.callRate,
      "AM Visits": r.amVisits,
      "PM Visits": r.pmVisits,
      "Total Visits": r.totalVisits,
      "Unique Doctors": r.uniqueDoctors,
      "Coverage %": r.coveragePct,
      "Plan Compliance %": r.planCompliancePct,
    }));
    downloadCSV(`call-analysis-${selectedMonth}.csv`, csvRows);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("page.callAnalysis.title")}
        description={t("page.callAnalysis.description")}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredRows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t("callAnalysis.exportCsv")}
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        {/* BU Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t("callAnalysis.businessUnit")}</label>
          <Select value={selectedBU} onValueChange={setSelectedBU}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All BUs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("callAnalysis.allBUs")}</SelectItem>
              {buOptions.map((bu) => (
                <SelectItem key={bu.value} value={bu.value}>
                  {bu.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DM Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t("callAnalysis.districtManager")}</label>
          <Select value={selectedDM} onValueChange={setSelectedDM}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All DMs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("callAnalysis.allDMs")}</SelectItem>
              {dmUsers.map((dm) => (
                <SelectItem key={dm.id} value={dm.id}>
                  {dm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Picker */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t("callAnalysis.month")}</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Role Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t("callAnalysis.role")}</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("callAnalysis.allRoles")}</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Phone}
          title={t("stats.totalCalls")}
          value={stats.totalCalls.toLocaleString()}
          subtitle={`In ${monthOptions.find((m) => m.value === selectedMonth)?.label ?? selectedMonth}`}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={TrendingUp}
          title={t("stats.avgCallRate")}
          value={stats.avgCallRate.toFixed(2)}
          subtitle={t("callAnalysis.visitsPerWorkingDay")}
          iconColor="bg-green-100 text-green-600"
        />
        <StatsCard
          icon={Target}
          title={t("stats.avgCoverage")}
          value={`${stats.avgCoverage}%`}
          subtitle={t("callAnalysis.doctorsVisitedVsAssigned")}
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatsCard
          icon={Users}
          title={t("stats.totalReps")}
          value={stats.totalReps}
          subtitle={t("callAnalysis.fieldEmployeesShown")}
          iconColor="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredRows}
        searchable
        searchKeys={["name", "role", "bu"]}
        pagination
        exportable={false}
        emptyMessage={t("empty.noEmployeeData")}
      />
    </div>
  );
}
