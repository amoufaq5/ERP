"use client";

import { useMemo, useState, useCallback } from "react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { downloadCSV, downloadHTML, buildPrintableReport } from "@/lib/download";
import {
  UserCheck,
  Users,
  Crown,
  Target,
  MapPin,
  TrendingUp,
  Calendar,
  Stethoscope,
  Download,
  Printer,
  FileText,
  Filter,
  X,
  CheckSquare,
  Square,
  Wrench,
  Save,
  Trash2,
  Play,
  Clock,
  Mail,
  Plus,
  Settings,
  Eye,
  BarChart3,
} from "lucide-react";

// ─── Field force hierarchy & demo data ───────────────────────────────────────

interface FieldForcePerson {
  id: string;
  name: string;
  role: "BUM" | "MARKETEER" | "DISTRICT_MANAGER" | "MEDICAL_REP";
  territory: string;
  manager?: string;
  doctorsAssigned: number;
  doctorsCovered: number;
  visitsThisMonth: number;
  visitsTarget: number;
  callsCompleted: number;
  newDoctors: number;
  marketRequests: number;
  productsPromoted: number;
  achievementPct: number;
  topProducts: string[];
  topSpecialties: string[];
}

const fieldForce: FieldForcePerson[] = [
  // BUM
  {
    id: "bum-1",
    name: "Dr. Hossam Tarek",
    role: "BUM",
    territory: "Egypt - National",
    doctorsAssigned: 3200,
    doctorsCovered: 2890,
    visitsThisMonth: 0,
    visitsTarget: 0,
    callsCompleted: 0,
    newDoctors: 178,
    marketRequests: 320,
    productsPromoted: 42,
    achievementPct: 108,
    topProducts: ["Paracetamol 500mg", "Amoxicillin 250mg", "Omeprazole 20mg"],
    topSpecialties: ["GP", "Pediatrics", "Cardiology"],
  },
  // Marketeers
  {
    id: "mkt-1",
    name: "Dr. Yasmin Salem",
    role: "MARKETEER",
    territory: "North Region",
    manager: "Dr. Hossam Tarek",
    doctorsAssigned: 1450,
    doctorsCovered: 1320,
    visitsThisMonth: 0,
    visitsTarget: 0,
    callsCompleted: 0,
    newDoctors: 92,
    marketRequests: 145,
    productsPromoted: 28,
    achievementPct: 112,
    topProducts: ["Insulin Glargine", "Metformin 850mg", "Atorvastatin 20mg"],
    topSpecialties: ["Endocrinology", "Cardiology", "Internal Med"],
  },
  {
    id: "mkt-2",
    name: "Dr. Karim Awad",
    role: "MARKETEER",
    territory: "South Region",
    manager: "Dr. Hossam Tarek",
    doctorsAssigned: 1750,
    doctorsCovered: 1570,
    visitsThisMonth: 0,
    visitsTarget: 0,
    callsCompleted: 0,
    newDoctors: 86,
    marketRequests: 175,
    productsPromoted: 32,
    achievementPct: 104,
    topProducts: ["Vit C 1000mg", "Cough Syrup", "Hydrocortisone"],
    topSpecialties: ["GP", "Pediatrics", "Dermatology"],
  },
  // District Managers
  {
    id: "dm-1",
    name: "Ahmed Mostafa",
    role: "DISTRICT_MANAGER",
    territory: "Cairo North",
    manager: "Dr. Yasmin Salem",
    doctorsAssigned: 480,
    doctorsCovered: 442,
    visitsThisMonth: 124,
    visitsTarget: 120,
    callsCompleted: 124,
    newDoctors: 18,
    marketRequests: 38,
    productsPromoted: 18,
    achievementPct: 103,
    topProducts: ["Insulin Glargine", "Atorvastatin 20mg", "Metformin"],
    topSpecialties: ["Endocrinology", "Cardiology"],
  },
  {
    id: "dm-2",
    name: "Sherif Adel",
    role: "DISTRICT_MANAGER",
    territory: "Cairo South",
    manager: "Dr. Yasmin Salem",
    doctorsAssigned: 510,
    doctorsCovered: 458,
    visitsThisMonth: 132,
    visitsTarget: 120,
    callsCompleted: 132,
    newDoctors: 24,
    marketRequests: 41,
    productsPromoted: 18,
    achievementPct: 110,
    topProducts: ["Amoxicillin", "Paracetamol", "Omeprazole"],
    topSpecialties: ["GP", "Pediatrics"],
  },
  {
    id: "dm-3",
    name: "Mahmoud Fathy",
    role: "DISTRICT_MANAGER",
    territory: "Alexandria",
    manager: "Dr. Karim Awad",
    doctorsAssigned: 460,
    doctorsCovered: 412,
    visitsThisMonth: 116,
    visitsTarget: 120,
    callsCompleted: 116,
    newDoctors: 16,
    marketRequests: 32,
    productsPromoted: 22,
    achievementPct: 97,
    topProducts: ["Vit C", "Cough Syrup", "Hydrocortisone"],
    topSpecialties: ["GP", "Dermatology"],
  },
  // Medical Reps (per DM)
  {
    id: "rep-1",
    name: "Mohamed El-Sayed",
    role: "MEDICAL_REP",
    territory: "Giza",
    manager: "Ahmed Mostafa",
    doctorsAssigned: 78,
    doctorsCovered: 72,
    visitsThisMonth: 168,
    visitsTarget: 160,
    callsCompleted: 168,
    newDoctors: 4,
    marketRequests: 9,
    productsPromoted: 8,
    achievementPct: 105,
    topProducts: ["Insulin Glargine", "Metformin"],
    topSpecialties: ["Endocrinology", "Internal Med"],
  },
  {
    id: "rep-2",
    name: "Salma Ibrahim",
    role: "MEDICAL_REP",
    territory: "Heliopolis",
    manager: "Ahmed Mostafa",
    doctorsAssigned: 82,
    doctorsCovered: 79,
    visitsThisMonth: 175,
    visitsTarget: 160,
    callsCompleted: 175,
    newDoctors: 6,
    marketRequests: 12,
    productsPromoted: 8,
    achievementPct: 109,
    topProducts: ["Atorvastatin", "Metoprolol"],
    topSpecialties: ["Cardiology"],
  },
  {
    id: "rep-3",
    name: "Hany Magdy",
    role: "MEDICAL_REP",
    territory: "Maadi",
    manager: "Sherif Adel",
    doctorsAssigned: 86,
    doctorsCovered: 78,
    visitsThisMonth: 162,
    visitsTarget: 160,
    callsCompleted: 162,
    newDoctors: 5,
    marketRequests: 8,
    productsPromoted: 8,
    achievementPct: 101,
    topProducts: ["Amoxicillin", "Omeprazole"],
    topSpecialties: ["GP"],
  },
  {
    id: "rep-4",
    name: "Reem Adly",
    role: "MEDICAL_REP",
    territory: "Nasr City",
    manager: "Sherif Adel",
    doctorsAssigned: 80,
    doctorsCovered: 76,
    visitsThisMonth: 170,
    visitsTarget: 160,
    callsCompleted: 170,
    newDoctors: 7,
    marketRequests: 11,
    productsPromoted: 8,
    achievementPct: 106,
    topProducts: ["Paracetamol Pediatric", "Cough Syrup"],
    topSpecialties: ["Pediatrics"],
  },
  {
    id: "rep-5",
    name: "Tamer Adel",
    role: "MEDICAL_REP",
    territory: "Smouha - Alexandria",
    manager: "Mahmoud Fathy",
    doctorsAssigned: 75,
    doctorsCovered: 68,
    visitsThisMonth: 154,
    visitsTarget: 160,
    callsCompleted: 154,
    newDoctors: 3,
    marketRequests: 6,
    productsPromoted: 8,
    achievementPct: 96,
    topProducts: ["Vit C", "Hydrocortisone"],
    topSpecialties: ["Dermatology"],
  },
];

const roleConfig = {
  BUM: { label: "BUM (Business Unit Manager)", icon: Crown, color: "bg-purple-100 text-purple-700" },
  MARKETEER: { label: "Marketeers", icon: Target, color: "bg-pink-100 text-pink-700" },
  DISTRICT_MANAGER: { label: "District Managers", icon: Users, color: "bg-blue-100 text-blue-700" },
  MEDICAL_REP: { label: "Medical Representatives", icon: UserCheck, color: "bg-cyan-100 text-cyan-700" },
} as const;

type RoleFilter = "ALL" | "BUM" | "MARKETEER" | "DISTRICT_MANAGER" | "MEDICAL_REP";

// ─── Report Builder Types & Seed Data ────────────────────────────────────────

type ReportTemplate = "sales" | "visit" | "expense" | "pipeline";
type GroupByField = "territory" | "rep" | "product" | "specialty" | "month";
type ScheduleFrequency = "daily" | "weekly" | "biweekly" | "monthly";

interface ReportConfig {
  id: string;
  name: string;
  template: ReportTemplate;
  dateFrom: string;
  dateTo: string;
  territoryFilter: string;
  repFilter: string;
  groupBy: GroupByField;
  schedule?: {
    frequency: ScheduleFrequency;
    recipients: string;
    enabled: boolean;
  };
  createdAt: string;
}

interface ReportRow {
  id: string;
  group: string;
  metric1: number;
  metric2: number;
  metric3: number;
  metric4: number;
  metric5: number;
}

const TEMPLATE_CONFIG: Record<ReportTemplate, {
  label: string;
  description: string;
  metrics: string[];
  icon: typeof BarChart3;
}> = {
  sales: {
    label: "Sales Report",
    description: "Revenue, units sold, and growth by territory/rep",
    metrics: ["Revenue (EGP)", "Units Sold", "Avg Order Value", "Growth %", "Target %"],
    icon: TrendingUp,
  },
  visit: {
    label: "Visit Report",
    description: "Doctor visits, coverage, and call frequency",
    metrics: ["Total Visits", "Unique Doctors", "Avg Visits/Doctor", "Coverage %", "GPS Verified %"],
    icon: MapPin,
  },
  expense: {
    label: "Expense Report",
    description: "Field expenses, travel costs, and budget utilization",
    metrics: ["Total Expenses", "Travel Cost", "Per Diem", "Budget Used %", "Cost/Visit"],
    icon: FileText,
  },
  pipeline: {
    label: "Pipeline Report",
    description: "Leads, opportunities, and conversion rates",
    metrics: ["Total Leads", "Qualified", "Proposals", "Won", "Conversion %"],
    icon: Target,
  },
};

const INITIAL_SAVED_REPORTS: ReportConfig[] = [
  {
    id: "sr-1",
    name: "Monthly Sales by Territory",
    template: "sales",
    dateFrom: "2026-04-01",
    dateTo: "2026-04-30",
    territoryFilter: "all",
    repFilter: "all",
    groupBy: "territory",
    schedule: { frequency: "monthly", recipients: "hossam@pharma.eg, yasmin@pharma.eg", enabled: true },
    createdAt: "2026-03-15",
  },
  {
    id: "sr-2",
    name: "Weekly Visit Coverage",
    template: "visit",
    dateFrom: "2026-04-01",
    dateTo: "2026-04-30",
    territoryFilter: "all",
    repFilter: "all",
    groupBy: "rep",
    schedule: { frequency: "weekly", recipients: "yasmin@pharma.eg", enabled: true },
    createdAt: "2026-03-20",
  },
  {
    id: "sr-3",
    name: "Q1 Expense Analysis",
    template: "expense",
    dateFrom: "2026-01-01",
    dateTo: "2026-03-31",
    territoryFilter: "all",
    repFilter: "all",
    groupBy: "territory",
    createdAt: "2026-04-01",
  },
];

function generateReportData(template: ReportTemplate, groupBy: GroupByField): ReportRow[] {
  const groups: Record<GroupByField, string[]> = {
    territory: ["Cairo North", "Cairo South", "Alexandria", "Delta Region", "Upper Egypt", "Canal Cities"],
    rep: ["Mohamed El-Sayed", "Salma Ibrahim", "Hany Magdy", "Reem Adly", "Tamer Adel"],
    product: ["Insulin Glargine", "Metformin 850mg", "Atorvastatin 20mg", "Amoxicillin 250mg", "Omeprazole 20mg"],
    specialty: ["Cardiology", "Endocrinology", "GP", "Pediatrics", "Dermatology"],
    month: ["January", "February", "March", "April"],
  };

  const seeds: Record<ReportTemplate, number[][]> = {
    sales: [
      [485000, 1230, 394, 12, 108],
      [392000, 980, 400, 8, 95],
      [445000, 1100, 405, 15, 112],
      [310000, 780, 397, 5, 88],
      [268000, 650, 412, -2, 82],
      [355000, 890, 399, 10, 97],
    ],
    visit: [
      [168, 72, 2.3, 92, 95],
      [175, 79, 2.2, 96, 88],
      [162, 78, 2.1, 91, 92],
      [170, 76, 2.2, 95, 90],
      [154, 68, 2.3, 91, 87],
      [145, 65, 2.2, 88, 93],
    ],
    expense: [
      [28500, 12400, 8200, 78, 170],
      [22100, 9800, 6500, 65, 145],
      [31200, 14200, 9100, 82, 195],
      [19800, 8600, 5800, 58, 130],
      [25400, 11100, 7200, 72, 165],
      [21800, 9500, 6300, 64, 150],
    ],
    pipeline: [
      [45, 28, 18, 12, 27],
      [38, 22, 14, 9, 24],
      [52, 35, 22, 16, 31],
      [29, 17, 11, 7, 24],
      [34, 20, 13, 8, 24],
      [41, 25, 16, 11, 27],
    ],
  };

  const groupLabels = groups[groupBy];
  const templateSeeds = seeds[template];

  return groupLabels.map((label, i) => {
    const seedRow = templateSeeds[i % templateSeeds.length];
    return {
      id: `rr-${i}`,
      group: label,
      metric1: seedRow[0],
      metric2: seedRow[1],
      metric3: seedRow[2],
      metric4: seedRow[3],
      metric5: seedRow[4],
    };
  });
}

// Sensible defaults for a monthly reporting window
function getDefaultDateRange() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: toIso(first), to: toIso(today) };
}

// Scale a person's MTD metrics to the chosen date range.
// (Demo data: MTD numbers are treated as 30-day base; scale linearly.)
function scaleMetrics(p: FieldForcePerson, days: number): FieldForcePerson {
  const factor = Math.max(0, Math.min(1, days / 30));
  return {
    ...p,
    visitsThisMonth: Math.round(p.visitsThisMonth * factor),
    visitsTarget: Math.round(p.visitsTarget * factor),
    callsCompleted: Math.round(p.callsCompleted * factor),
    newDoctors: Math.round(p.newDoctors * factor),
    marketRequests: Math.round(p.marketRequests * factor),
  };
}

export default function CRMReportsPage() {
  const [activeTab, setActiveTab] = useState<"fieldforce" | "builder">("fieldforce");
  const [filter, setFilter] = useState<RoleFilter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState<string>(defaultRange.from);
  const [dateTo, setDateTo] = useState<string>(defaultRange.to);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());

  // ── Report Builder State ──
  const [builderTemplate, setBuilderTemplate] = useState<ReportTemplate>("sales");
  const [builderDateFrom, setBuilderDateFrom] = useState("2026-04-01");
  const [builderDateTo, setBuilderDateTo] = useState("2026-04-30");
  const [builderTerritory, setBuilderTerritory] = useState("all");
  const [builderRep, setBuilderRep] = useState("all");
  const [builderGroupBy, setBuilderGroupBy] = useState<GroupByField>("territory");
  const [builderPreviewVisible, setBuilderPreviewVisible] = useState(true);
  const [savedReports, setSavedReports] = useState<ReportConfig[]>(INITIAL_SAVED_REPORTS);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveReportName, setSaveReportName] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>("weekly");
  const [scheduleRecipients, setScheduleRecipients] = useState("");

  const reportPreviewData = useMemo(
    () => generateReportData(builderTemplate, builderGroupBy),
    [builderTemplate, builderGroupBy]
  );

  const templateCfg = TEMPLATE_CONFIG[builderTemplate];

  const reportColumns: Column<ReportRow>[] = useMemo(() => [
    { key: "group", label: builderGroupBy.charAt(0).toUpperCase() + builderGroupBy.slice(1), sortable: true },
    { key: "metric1", label: templateCfg.metrics[0], sortable: true, render: (v: number) => (v ?? 0).toLocaleString() },
    { key: "metric2", label: templateCfg.metrics[1], sortable: true, render: (v: number) => (v ?? 0).toLocaleString() },
    { key: "metric3", label: templateCfg.metrics[2], sortable: true, render: (v: number) => typeof v === "number" && v < 10 ? v.toFixed(1) : (v ?? 0).toLocaleString() },
    { key: "metric4", label: templateCfg.metrics[3], sortable: true, render: (v: number) => {
      const isPercent = templateCfg.metrics[3].includes("%");
      if (isPercent) return `${v ?? 0}%`;
      return (v ?? 0).toLocaleString();
    }},
    { key: "metric5", label: templateCfg.metrics[4], sortable: true, render: (v: number) => {
      const isPercent = templateCfg.metrics[4].includes("%");
      if (isPercent) return (
        <Badge className={(v ?? 0) >= 100 ? "bg-green-100 text-green-700" : (v ?? 0) >= 85 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
          {v ?? 0}%
        </Badge>
      );
      return (v ?? 0).toLocaleString();
    }},
  ], [builderGroupBy, templateCfg]);

  const handleSaveReport = useCallback(() => {
    if (!saveReportName.trim()) return;
    const newReport: ReportConfig = {
      id: `sr-${Date.now()}`,
      name: saveReportName.trim(),
      template: builderTemplate,
      dateFrom: builderDateFrom,
      dateTo: builderDateTo,
      territoryFilter: builderTerritory,
      repFilter: builderRep,
      groupBy: builderGroupBy,
      schedule: scheduleEnabled ? {
        frequency: scheduleFrequency,
        recipients: scheduleRecipients,
        enabled: true,
      } : undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSavedReports((prev) => [...prev, newReport]);
    setSaveDialogOpen(false);
    setSaveReportName("");
    setScheduleEnabled(false);
    setScheduleRecipients("");
  }, [saveReportName, builderTemplate, builderDateFrom, builderDateTo, builderTerritory, builderRep, builderGroupBy, scheduleEnabled, scheduleFrequency, scheduleRecipients]);

  const handleLoadReport = useCallback((config: ReportConfig) => {
    setBuilderTemplate(config.template);
    setBuilderDateFrom(config.dateFrom);
    setBuilderDateTo(config.dateTo);
    setBuilderTerritory(config.territoryFilter);
    setBuilderRep(config.repFilter);
    setBuilderGroupBy(config.groupBy);
    setBuilderPreviewVisible(true);
  }, []);

  const handleDeleteReport = useCallback((id: string) => {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleExportBuilderCSV = useCallback(() => {
    const rows = reportPreviewData.map((r) => ({
      [builderGroupBy]: r.group,
      [templateCfg.metrics[0]]: r.metric1,
      [templateCfg.metrics[1]]: r.metric2,
      [templateCfg.metrics[2]]: r.metric3,
      [templateCfg.metrics[3]]: r.metric4,
      [templateCfg.metrics[4]]: r.metric5,
    }));
    downloadCSV(`${builderTemplate}-report-${builderDateFrom}-to-${builderDateTo}.csv`, rows);
  }, [reportPreviewData, builderTemplate, builderDateFrom, builderDateTo, builderGroupBy, templateCfg]);

  const handleExportBuilderPDF = useCallback(() => {
    const html = buildPrintableReport({
      title: `${templateCfg.label} — Custom Report`,
      subtitle: `${builderDateFrom} to ${builderDateTo} | Grouped by ${builderGroupBy}`,
      sections: [{
        heading: `${templateCfg.label} Data`,
        rows: reportPreviewData.map((r) => ({
          [builderGroupBy.charAt(0).toUpperCase() + builderGroupBy.slice(1)]: r.group,
          [templateCfg.metrics[0]]: r.metric1,
          [templateCfg.metrics[1]]: r.metric2,
          [templateCfg.metrics[2]]: r.metric3,
          [templateCfg.metrics[3]]: r.metric4,
          [templateCfg.metrics[4]]: r.metric5,
        })),
      }],
    });
    downloadHTML(`${builderTemplate}-report-${builderDateFrom}-to-${builderDateTo}.html`, html);
  }, [reportPreviewData, builderTemplate, builderDateFrom, builderDateTo, builderGroupBy, templateCfg]);

  // Days in the window (inclusive)
  const rangeDays = useMemo(() => {
    const a = new Date(dateFrom);
    const b = new Date(dateTo);
    const diff = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
    return diff;
  }, [dateFrom, dateTo]);

  // Scale metrics by range length
  const scaledFieldForce = useMemo(
    () => fieldForce.map((p) => scaleMetrics(p, rangeDays)),
    [rangeDays]
  );

  const visible = useMemo(() => {
    let list = filter === "ALL" ? scaledFieldForce : scaledFieldForce.filter((p) => p.role === filter);
    if (selectedPeople.size > 0) {
      list = list.filter((p) => selectedPeople.has(p.id));
    }
    return list;
  }, [filter, selectedPeople, scaledFieldForce]);

  function togglePerson(id: string) {
    setSelectedPeople((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPeople() {
    const pool = filter === "ALL" ? fieldForce : fieldForce.filter((p) => p.role === filter);
    setSelectedPeople(new Set(pool.map((p) => p.id)));
  }

  function clearFilters() {
    setSelectedPeople(new Set());
    setDateFrom(defaultRange.from);
    setDateTo(defaultRange.to);
    setFilter("ALL");
  }

  const activeFilterCount =
    (filter !== "ALL" ? 1 : 0) +
    (selectedPeople.size > 0 ? 1 : 0) +
    (dateFrom !== defaultRange.from || dateTo !== defaultRange.to ? 1 : 0);

  const summary = useMemo(() => {
    const reps = scaledFieldForce.filter((p) => p.role === "MEDICAL_REP");
    return {
      totalDoctors: reps.reduce((s, r) => s + r.doctorsAssigned, 0),
      totalCovered: reps.reduce((s, r) => s + r.doctorsCovered, 0),
      totalVisits: reps.reduce((s, r) => s + r.visitsThisMonth, 0),
      avgAchievement: Math.round(
        scaledFieldForce.reduce((s, p) => s + p.achievementPct, 0) / scaledFieldForce.length
      ),
    };
  }, [scaledFieldForce]);

  const selected = selectedId ? scaledFieldForce.find((p) => p.id === selectedId) : null;

  function downloadIndividualCSV(person: FieldForcePerson) {
    const flat = {
      name: person.name,
      role: person.role,
      territory: person.territory,
      manager: person.manager ?? "—",
      doctorsAssigned: person.doctorsAssigned,
      doctorsCovered: person.doctorsCovered,
      coveragePct: ((person.doctorsCovered / person.doctorsAssigned) * 100).toFixed(1),
      visitsThisMonth: person.visitsThisMonth,
      visitsTarget: person.visitsTarget,
      callsCompleted: person.callsCompleted,
      newDoctors: person.newDoctors,
      marketRequests: person.marketRequests,
      productsPromoted: person.productsPromoted,
      achievementPct: person.achievementPct,
      topProducts: person.topProducts.join("; "),
      topSpecialties: person.topSpecialties.join("; "),
    };
    downloadCSV(`crm-report-${person.id}.csv`, [flat]);
  }

  function downloadIndividualPrintable(person: FieldForcePerson) {
    const html = buildPrintableReport({
      title: `Field Force Report — ${person.name}`,
      subtitle: `${roleConfig[person.role].label} · ${person.territory} · April 2026`,
      sections: [
        {
          heading: "Coverage Summary",
          rows: [
            {
              "Doctors Assigned": person.doctorsAssigned,
              "Doctors Covered": person.doctorsCovered,
              "Coverage %": `${((person.doctorsCovered / person.doctorsAssigned) * 100).toFixed(1)}%`,
              "New Doctors": person.newDoctors,
              "Market Requests": person.marketRequests,
            },
          ],
        },
        {
          heading: "Activity",
          rows: [
            {
              "Visits MTD": person.visitsThisMonth,
              "Visit Target": person.visitsTarget,
              "Calls Completed": person.callsCompleted,
              "Products Promoted": person.productsPromoted,
              "Achievement %": `${person.achievementPct}%`,
            },
          ],
        },
        {
          heading: "Top Promoted Products",
          rows: person.topProducts.map((p, i) => ({ Rank: i + 1, Product: p })),
        },
        {
          heading: "Top Specialties Visited",
          rows: person.topSpecialties.map((s, i) => ({ Rank: i + 1, Specialty: s })),
        },
      ],
    });
    downloadHTML(`crm-report-${person.id}.html`, html);
  }

  function downloadAllCSV() {
    // Export the current filtered view (respects date range + people + role filter)
    const source = visible.length > 0 ? visible : scaledFieldForce;
    const flat = source.map((p) => ({
      name: p.name,
      role: p.role,
      territory: p.territory,
      manager: p.manager ?? "—",
      dateFrom,
      dateTo,
      rangeDays,
      doctorsAssigned: p.doctorsAssigned,
      doctorsCovered: p.doctorsCovered,
      coveragePct: ((p.doctorsCovered / p.doctorsAssigned) * 100).toFixed(1),
      visits: p.visitsThisMonth,
      visitTarget: p.visitsTarget,
      newDoctors: p.newDoctors,
      marketRequests: p.marketRequests,
      productsPromoted: p.productsPromoted,
      achievementPct: p.achievementPct,
    }));
    const filename =
      selectedPeople.size > 0 || filter !== "ALL"
        ? `crm-fieldforce-filtered-${dateFrom}-to-${dateTo}.csv`
        : `crm-fieldforce-${dateFrom}-to-${dateTo}.csv`;
    downloadCSV(filename, flat);
  }

  function downloadConsolidated() {
    // Use the filtered view if any filters are active
    const source =
      selectedPeople.size > 0 || filter !== "ALL" ? visible : scaledFieldForce;
    const rolesInSource = Array.from(new Set(source.map((p) => p.role))) as Array<FieldForcePerson["role"]>;
    const subtitleParts = [
      `${dateFrom} → ${dateTo} (${rangeDays} days)`,
      filter !== "ALL" ? `Role: ${roleConfig[filter as Exclude<RoleFilter, "ALL">].label}` : null,
      selectedPeople.size > 0 ? `${selectedPeople.size} people selected` : null,
    ].filter(Boolean) as string[];

    const html = buildPrintableReport({
      title: "CRM Field Force — Consolidated Report",
      subtitle: subtitleParts.join(" · "),
      sections: rolesInSource.map((r) => ({
        heading: roleConfig[r].label,
        rows: source
          .filter((p) => p.role === r)
          .map((p) => ({
            Name: p.name,
            Territory: p.territory,
            Manager: p.manager ?? "—",
            "Doctors Covered": `${p.doctorsCovered}/${p.doctorsAssigned}`,
            "Coverage %": `${((p.doctorsCovered / p.doctorsAssigned) * 100).toFixed(1)}%`,
            Visits: p.visitsThisMonth || "—",
            Target: p.visitsTarget || "—",
            "New Drs": p.newDoctors,
            "Mkt Reqs": p.marketRequests,
            "Achievement %": `${p.achievementPct}%`,
          })),
      })),
    });
    const filename =
      selectedPeople.size > 0 || filter !== "ALL"
        ? `crm-consolidated-filtered-${dateFrom}-to-${dateTo}.html`
        : `crm-consolidated-${dateFrom}-to-${dateTo}.html`;
    downloadHTML(filename, html);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="CRM Reports"
        description="Per-rep, per-DM, per-marketeer & per-BUM performance with downloadable templates"
        actions={
          activeTab === "fieldforce" ? (
            <>
              <Button variant="outline" onClick={downloadAllCSV}>
                <Download className="h-4 w-4 mr-2" /> Export All CSV
              </Button>
              <Button onClick={downloadConsolidated}>
                <Printer className="h-4 w-4 mr-2" /> Consolidated Report
              </Button>
            </>
          ) : undefined
        }
      />

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2">
        <Button variant={activeTab === "fieldforce" ? "default" : "ghost"} onClick={() => setActiveTab("fieldforce")} className="gap-2">
          <Users className="h-4 w-4" /> Field Force Reports
        </Button>
        <Button variant={activeTab === "builder" ? "default" : "ghost"} onClick={() => setActiveTab("builder")} className="gap-2">
          <Wrench className="h-4 w-4" /> Report Builder
        </Button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          FIELD FORCE TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "fieldforce" && (
      <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Doctors Assigned"
          value={summary.totalDoctors.toLocaleString()}
          subtitle="Across all reps"
          icon={Stethoscope}
          iconColor="bg-blue-100 text-blue-700"
        />
        <StatsCard
          title="Doctors Covered"
          value={summary.totalCovered.toLocaleString()}
          subtitle={`${((summary.totalCovered / summary.totalDoctors) * 100).toFixed(1)}% coverage`}
          icon={UserCheck}
          iconColor="bg-emerald-100 text-emerald-700"
          change={4.2}
          changeLabel="vs last month"
        />
        <StatsCard
          title="Visits MTD"
          value={summary.totalVisits.toLocaleString()}
          subtitle="GPS-validated"
          icon={MapPin}
          iconColor="bg-purple-100 text-purple-700"
          change={6.8}
          changeLabel="vs last month"
        />
        <StatsCard
          title="Avg Achievement"
          value={`${summary.avgAchievement}%`}
          subtitle="Field force overall"
          icon={TrendingUp}
          iconColor="bg-amber-100 text-amber-700"
          change={2.4}
          changeLabel="vs last month"
        />
      </div>

      {/* Filter pills + advanced filter toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP"] as RoleFilter[]).map((r) => (
          <Button
            key={r}
            variant={filter === r ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(r)}
          >
            {r === "ALL" ? "All Roles" : roleConfig[r].label}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="h-4 w-4 mr-1.5" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              Advanced Report Filters
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Narrow reports by date window and specific field force members.
              Metrics are automatically scaled to the selected period.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quick Ranges</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => {
                      const today = new Date();
                      const seven = new Date(today);
                      seven.setDate(seven.getDate() - 6);
                      setDateFrom(seven.toISOString().slice(0, 10));
                      setDateTo(today.toISOString().slice(0, 10));
                    }}
                  >
                    7d
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => {
                      const today = new Date();
                      const m = new Date(today);
                      m.setDate(m.getDate() - 29);
                      setDateFrom(m.toISOString().slice(0, 10));
                      setDateTo(today.toISOString().slice(0, 10));
                    }}
                  >
                    30d
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => {
                      const today = new Date();
                      const q = new Date(today);
                      q.setDate(q.getDate() - 89);
                      setDateFrom(q.toISOString().slice(0, 10));
                      setDateTo(today.toISOString().slice(0, 10));
                    }}
                  >
                    90d
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => {
                      const today = new Date();
                      const y = new Date(today.getFullYear(), 0, 1);
                      setDateFrom(y.toISOString().slice(0, 10));
                      setDateTo(today.toISOString().slice(0, 10));
                    }}
                  >
                    YTD
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-card rounded px-2 py-1.5 border inline-block">
              Window: <strong className="text-foreground">{rangeDays} days</strong>
              {" · metrics scaled proportionally"}
            </div>

            {/* People multi-select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">
                  Select People ({selectedPeople.size} of{" "}
                  {filter === "ALL"
                    ? fieldForce.length
                    : fieldForce.filter((p) => p.role === filter).length}{" "}
                  shown)
                </Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={selectAllPeople}
                  >
                    <CheckSquare className="h-3 w-3 mr-1" /> Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setSelectedPeople(new Set())}
                    disabled={selectedPeople.size === 0}
                  >
                    <Square className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 p-2 bg-card rounded border">
                {(filter === "ALL"
                  ? fieldForce
                  : fieldForce.filter((p) => p.role === filter)
                ).map((p) => {
                  const checked = selectedPeople.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer border ${
                        checked ? "bg-blue-50 border-blue-300" : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerson(p.id)}
                        className="h-3.5 w-3.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {roleConfig[p.role].label.replace(/ \(.+\)/, "")} · {p.territory}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button onClick={downloadConsolidated}>
                <Printer className="h-4 w-4 mr-2" /> Generate Filtered Report
              </Button>
              <Button variant="outline" onClick={downloadAllCSV}>
                <Download className="h-4 w-4 mr-2" /> Export Filtered CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Person cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((p) => {
          const roleCfg = roleConfig[p.role];
          const Icon = roleCfg.icon;
          const coveragePct = Math.round((p.doctorsCovered / p.doctorsAssigned) * 100);
          return (
            <Card
              key={p.id}
              className="hover:shadow-md cursor-pointer transition-all"
              onClick={() => setSelectedId(p.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${roleCfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{p.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground truncate">{p.territory}</p>
                    </div>
                  </div>
                  <Badge variant={p.achievementPct >= 100 ? "success" : "warning"}>
                    {p.achievementPct}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Coverage</span>
                    <span>{p.doctorsCovered} / {p.doctorsAssigned}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${coveragePct}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-base font-semibold">{p.visitsThisMonth || "—"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Visits</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold">{p.newDoctors}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">New Drs</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold">{p.marketRequests}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Requests</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadIndividualCSV(p);
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" /> CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadIndividualPrintable(p);
                    }}
                  >
                    <FileText className="h-3 w-3 mr-1" /> Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg">{selected.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {roleConfig[selected.role].label} · {selected.territory}
                {selected.manager && ` · Reports to ${selected.manager}`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-700 uppercase font-semibold">Doctors</p>
                <p className="text-xl font-bold mt-1">{selected.doctorsCovered} / {selected.doctorsAssigned}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <p className="text-xs text-purple-700 uppercase font-semibold">Visits MTD</p>
                <p className="text-xl font-bold mt-1">{selected.visitsThisMonth || "—"} / {selected.visitsTarget || "—"}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <p className="text-xs text-emerald-700 uppercase font-semibold">New Drs</p>
                <p className="text-xl font-bold mt-1">{selected.newDoctors}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <p className="text-xs text-amber-700 uppercase font-semibold">Achievement</p>
                <p className="text-xl font-bold mt-1">{selected.achievementPct}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top Products</h4>
                <ul className="space-y-1">
                  {selected.topProducts.map((p) => (
                    <li key={p} className="text-sm flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top Specialties</h4>
                <ul className="space-y-1">
                  {selected.topSpecialties.map((s) => (
                    <li key={s} className="text-sm flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={() => downloadIndividualPrintable(selected)}>
                <Printer className="h-4 w-4 mr-2" /> Download Full Report
              </Button>
              <Button variant="outline" onClick={() => downloadIndividualCSV(selected)}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report templates section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard Report Templates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: "Daily Visit Report (DVR)", desc: "Per-rep daily activity log with GPS coordinates and product samples." },
            { title: "Coverage Analysis Report", desc: "Doctor coverage % per rep, broken down by class A/B/C/D." },
            { title: "Call Frequency Report", desc: "Frequency of doctor calls vs target frequency by class." },
            { title: "Productivity Report", desc: "Visits, calls, requests vs targets per role." },
            { title: "New Doctor Report", desc: "Newly added doctors per rep this period." },
            { title: "Sample & Literature Report", desc: "Distributed samples and promotional materials." },
            { title: "Territory Performance", desc: "Roll-up by district / region / country." },
            { title: "Specialty Coverage", desc: "Coverage by medical specialty across the field force." },
            { title: "Doctor Visit History", desc: "All visits to a specific doctor across reps." },
          ].map((t) => (
            <div key={t.title} className="p-3 rounded-lg border hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-semibold">{t.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{t.desc}</p>
              <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={downloadAllCSV}>
                <Download className="h-3 w-3 mr-1" /> Download Template
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          REPORT BUILDER TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "builder" && (
        <>
          {/* Template Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(TEMPLATE_CONFIG) as [ReportTemplate, typeof TEMPLATE_CONFIG[ReportTemplate]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = builderTemplate === key;
              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-2 ring-blue-500 bg-blue-50/30" : ""}`}
                  onClick={() => setBuilderTemplate(key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold">{cfg.label}</h4>
                        <p className="text-xs text-muted-foreground truncate">{cfg.description}</p>
                      </div>
                      {isActive && <Badge className="bg-blue-100 text-blue-700 shrink-0">Active</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Configuration Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-600" />
                Report Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date From</Label>
                  <Input type="date" value={builderDateFrom} onChange={(e) => setBuilderDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date To</Label>
                  <Input type="date" value={builderDateTo} min={builderDateFrom} onChange={(e) => setBuilderDateTo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Territory</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={builderTerritory}
                    onChange={(e) => setBuilderTerritory(e.target.value)}
                  >
                    <option value="all">All Territories</option>
                    <option value="cairo-north">Cairo North</option>
                    <option value="cairo-south">Cairo South</option>
                    <option value="alexandria">Alexandria</option>
                    <option value="delta">Delta Region</option>
                    <option value="upper-egypt">Upper Egypt</option>
                    <option value="canal">Canal Cities</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rep</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={builderRep}
                    onChange={(e) => setBuilderRep(e.target.value)}
                  >
                    <option value="all">All Reps</option>
                    {fieldForce.filter((p) => p.role === "MEDICAL_REP").map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Group By</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={builderGroupBy}
                    onChange={(e) => setBuilderGroupBy(e.target.value as GroupByField)}
                  >
                    <option value="territory">Territory</option>
                    <option value="rep">Rep</option>
                    <option value="product">Product</option>
                    <option value="specialty">Specialty</option>
                    <option value="month">Month</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t">
                <Button onClick={() => setBuilderPreviewVisible(true)}>
                  <Eye className="h-4 w-4 mr-2" /> Preview Report
                </Button>
                <Button variant="outline" onClick={handleExportBuilderCSV}>
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
                <Button variant="outline" onClick={handleExportBuilderPDF}>
                  <Printer className="h-4 w-4 mr-2" /> Export PDF
                </Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setSaveDialogOpen(true)}>
                  <Save className="h-4 w-4 mr-2" /> Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report Preview */}
          {builderPreviewVisible && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  {templateCfg.label} Preview
                  <Badge variant="outline" className="text-xs ml-2">
                    {builderDateFrom} to {builderDateTo}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Grouped by {builderGroupBy}
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setBuilderPreviewVisible(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable<ReportRow>
                  columns={reportColumns}
                  data={reportPreviewData}
                  searchable
                  searchKeys={["group"]}
                  pagination={false}
                />
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button size="sm" onClick={handleExportBuilderCSV}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportBuilderPDF}>
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                Saved Report Configurations
                <Badge variant="secondary" className="ml-1">{savedReports.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No saved reports. Build a report and save its configuration.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedReports.map((report) => {
                    const cfg = TEMPLATE_CONFIG[report.template];
                    const Icon = cfg.icon;
                    return (
                      <div key={report.id} className="flex items-center gap-4 p-3 rounded-lg border hover:shadow-sm transition-shadow">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-gray-100 shrink-0">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold truncate">{report.name}</h4>
                            <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                            {report.schedule?.enabled && (
                              <Badge className="bg-purple-100 text-purple-700 text-[10px] shrink-0">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                {report.schedule.frequency}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {report.dateFrom} to {report.dateTo} | Group by {report.groupBy} | Created {report.createdAt}
                          </p>
                          {report.schedule?.enabled && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" /> {report.schedule.recipients}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleLoadReport(report)}>
                            <Play className="h-3 w-3 mr-1" /> Load
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleDeleteReport(report.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Report Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Report Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Report Name</Label>
              <Input
                placeholder="e.g. Monthly Sales by Territory"
                value={saveReportName}
                onChange={(e) => setSaveReportName(e.target.value)}
              />
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Template:</span> <span className="font-medium">{templateCfg.label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date Range:</span> <span className="font-medium">{builderDateFrom} to {builderDateTo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Group By:</span> <span className="font-medium capitalize">{builderGroupBy}</span></div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-3 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium">Schedule this report</span>
                  <p className="text-xs text-muted-foreground">Automatically generate and email this report</p>
                </div>
              </label>
              {scheduleEnabled && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frequency</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value as ScheduleFrequency)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly (Monday)</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly (1st)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Recipients</Label>
                    <Input
                      placeholder="email1@company.com, email2@company.com"
                      value={scheduleRecipients}
                      onChange={(e) => setScheduleRecipients(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated email addresses</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveReport} disabled={!saveReportName.trim()}>
                <Save className="h-4 w-4 mr-2" /> Save Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
