"use client";

import { Fragment } from "react";
import {
  Stethoscope, ClipboardList, Calendar, MapPin, Map, Target,
  BarChart3, Building2, Users, Megaphone, Receipt, Award,
  Crown, UserCheck, Activity, Ticket, ArrowRight, CheckCircle2,
  Eye, Minus, Printer, Building, Package, TrendingUp, Shield,
  Globe, Layers, Navigation, FileText, Settings, Zap, Heart,
  DollarSign, Briefcase, PieChart, BookOpen, Lock, Send,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Print Styles ────────────────────────────────────────────────────────────
const PRINT_CSS = `
@media print {
  nav, aside, header:not(.pg-header), [data-sidebar], .no-print, .print\\:hidden { display: none !important; }
  main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
  body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 15mm 12mm; }
  .pg-cover { min-height: 92vh; page-break-after: always; }
  .pg-toc { page-break-after: always; }
  .pg-section { page-break-before: always; }
  .pg-avoid-break { page-break-inside: avoid; }
  .pg-bg { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  tr { page-break-inside: avoid; }
}
`;

// ─── Data Constants ──────────────────────────────────────────────────────────

const AT_A_GLANCE = [
  { label: "Modules", value: "20+", color: "border-teal-500" },
  { label: "User Roles", value: "9", color: "border-blue-500" },
  { label: "IMS Specialties", value: "32", color: "border-purple-500" },
  { label: "KPI Metrics", value: "12", color: "border-emerald-500" },
  { label: "Buying Ladder Stages", value: "5", color: "border-amber-500" },
  { label: "Territory Levels", value: "4", color: "border-rose-500" },
];

const FEATURE_MATRIX: { category: string; icon: LucideIcon; color: string; modules: { name: string; icon: LucideIcon; capabilities: string[] }[] }[] = [
  {
    category: "Field Operations",
    icon: Navigation,
    color: "bg-teal-100 text-teal-800",
    modules: [
      { name: "Doctor Directory", icon: Stethoscope, capabilities: ["32 IMS Specialties", "A/B/C/D Classification", "KOL Flagging", "Buying Ladder", "Pharmacy Linking", "Visit Frequency"] },
      { name: "Visit Management", icon: ClipboardList, capabilities: ["Single/Double Visits", "GPS Verification", "Sample Tracking", "Activity Requests", "Duration Tracking", "Buying Ladder Delta"] },
      { name: "Weekly Plans", icon: Calendar, capabilities: ["7-Day AM/PM Planning", "Multi-Level Approval", "Auto-Escalation (48h)", "Starting Points Config", "Visit Outcomes", "Suspicious Visit Detection"] },
      { name: "GPS Tracking", icon: MapPin, capabilities: ["Live Map (Leaflet)", "Geofencing Zones", "Route Optimization", "Distance Calculation", "Battery & Accuracy", "Compliance Scoring"] },
      { name: "Territories", icon: Map, capabilities: ["4-Level Hierarchy", "IMS-IQVIA Codes", "Geo Share %", "Rep Assignments", "BU Mapping", "Coverage Analysis"] },
    ],
  },
  {
    category: "Sales & Pipeline",
    icon: TrendingUp,
    color: "bg-blue-100 text-blue-800",
    modules: [
      { name: "Leads & Opportunities", icon: TrendingUp, capabilities: ["Lead Scoring (0-100)", "8-Stage Pipeline", "7 Lead Sources", "Kanban Board", "Value Forecasting", "Conversion Tracking"] },
      { name: "Accounts", icon: Building2, capabilities: ["Hospital/Pharmacy/Polyclinic Types", "Customer Sync to ERP", "Revenue Tracking", "Industry Classification", "Multi-Contact", "Account Owner"] },
      { name: "Campaigns", icon: Megaphone, capabilities: ["7 Campaign Types", "Budget vs Spent", "Lead Generation", "ROI Analysis", "Start/End Dates", "Conversion Rate"] },
      { name: "Loyalty Programs", icon: Award, capabilities: ["Point-Based System", "4 Tiers (Bronze-Platinum)", "Earn/Redeem Tracking", "Program Analytics", "Member Enrollment", "Credit Redemption"] },
    ],
  },
  {
    category: "Operational",
    icon: Settings,
    color: "bg-amber-100 text-amber-800",
    modules: [
      { name: "Expenses", icon: Receipt, capabilities: ["OCR Receipt Scanning", "3-Level Approval by Amount", "Monthly Budget Cap (EGP 5K)", "Receipt Required >EGP 500", "Vendor Extraction", "JE Integration"] },
      { name: "Market Requests", icon: Send, capabilities: ["6 Request Types", "Priority Levels", "SLA Tracking", "Fulfillment Workflow", "Budget Monitoring", "Category Analytics"] },
      { name: "Business Units", icon: Building, capabilities: ["Product Portfolio", "Member Assignment", "Color-Coded Badges", "Cross-BU Reporting", "Manager Assignment", "Territory Linking"] },
      { name: "Support Tickets", icon: Ticket, capabilities: ["Priority Management", "SLA Deadline Tracking", "Status Workflow", "Account Linking", "Assignment Routing", "Breach Detection"] },
    ],
  },
  {
    category: "Analytics & Reporting",
    icon: BarChart3,
    color: "bg-purple-100 text-purple-800",
    modules: [
      { name: "KPI Dashboard", icon: Target, capabilities: ["12 Standard Metrics", "Sparkline Trends", "Rep Drill-Down", "4 Time Periods", "Ranking System", "Achievement Badges"] },
      { name: "Reports", icon: BarChart3, capabilities: ["9 Report Templates", "Scheduled Delivery", "CSV/HTML/PDF Export", "Role-Scoped Data", "Field Force Hierarchy", "Report Builder"] },
      { name: "Role Dashboards", icon: PieChart, capabilities: ["4 Role-Specific Views", "Real-Time KPIs", "Team Performance", "Quick Actions", "Pending Approvals", "Coverage Heatmap"] },
    ],
  },
];

const INTEGRATION_FLOWS: { crm: string; crmIcon: LucideIcon; erp: string; erpIcon: LucideIcon; flows: string[] }[] = [
  { crm: "Visit Management", crmIcon: ClipboardList, erp: "Inventory", erpIcon: Package, flows: ["Samples distributed deduct from stock", "Product catalog feeds doctor-product matching", "Stock availability in sample request workflow"] },
  { crm: "Expenses & Billing", crmIcon: Receipt, erp: "Accounting", erpIcon: DollarSign, flows: ["Expense reports create GL journal entries", "Invoice generation from sales pipeline", "Budget tracking per rep/district/region"] },
  { crm: "Employee & Org", crmIcon: Users, erp: "HR / ATS", erpIcon: Briefcase, flows: ["Leave requests affect visit planning", "Training records linked to rep KPIs", "Org hierarchy drives data scoping"] },
];

const CROSS_MODULE_SYNCS = [
  { from: "CRM Account", to: "ERP Customer", description: "Account sync creates customer master with credit limit and payment terms" },
  { from: "Territory Hierarchy", to: "Sales Organization", description: "4-level territory maps to sales org structure for rollup reporting" },
  { from: "Business Unit", to: "Cost Center", description: "BU structure aligns with financial cost centers for budget allocation" },
];

const USER_JOURNEYS: { role: string; icon: LucideIcon; timeframe: string; color: string; steps: { label: string; desc: string }[] }[] = [
  {
    role: "Medical Representative",
    icon: Activity,
    timeframe: "Daily Workflow",
    color: "teal",
    steps: [
      { label: "Login & Review Plan", desc: "Check approved weekly plan and today's assigned doctors" },
      { label: "AM Session Start", desc: "Navigate to first doctor using GPS routing" },
      { label: "Log Visit", desc: "Record samples given, products detailed, buying ladder update" },
      { label: "Submit Requests", desc: "Create sample, literature, or event requests in-app" },
      { label: "PM Session Visits", desc: "Complete afternoon doctor visits per plan" },
      { label: "Expense Report", desc: "Submit travel/meal expenses with receipt OCR" },
      { label: "EOD Report", desc: "Review daily KPIs, coverage %, calls completed" },
    ],
  },
  {
    role: "District Manager",
    icon: UserCheck,
    timeframe: "Weekly Workflow",
    color: "blue",
    steps: [
      { label: "Review Weekly Plans", desc: "Approve or reject submitted plans from medical reps" },
      { label: "Approve Visits", desc: "Review logged visits, verify GPS compliance" },
      { label: "Monitor Compliance", desc: "Check call rates, coverage gaps, suspicious visits" },
      { label: "Process Requests", desc: "Approve market requests under EGP 1,000" },
      { label: "Double Visits", desc: "Conduct accompanied visits for coaching" },
      { label: "Review KPIs", desc: "Analyze team performance and territory coverage" },
    ],
  },
  {
    role: "Marketeer",
    icon: Users,
    timeframe: "Monthly Workflow",
    color: "purple",
    steps: [
      { label: "Set Regional Targets", desc: "Define KPI targets for district managers and reps" },
      { label: "Review Performance", desc: "Analyze district-level achievement and compliance" },
      { label: "Approve Escalated", desc: "Handle requests escalated from DMs (up to EGP 5K)" },
      { label: "Plan Campaigns", desc: "Coordinate marketing campaigns and doctor events" },
      { label: "Regional Reports", desc: "Generate comprehensive regional analytics" },
    ],
  },
  {
    role: "Business Unit Manager",
    icon: Crown,
    timeframe: "Quarterly Workflow",
    color: "amber",
    steps: [
      { label: "National KPI Review", desc: "Evaluate organization-wide performance metrics" },
      { label: "Budget Allocation", desc: "Allocate budgets across regions and product lines" },
      { label: "Strategic Approvals", desc: "Approve high-value requests (>EGP 5K)" },
      { label: "Org Performance", desc: "Review P&L by product line, COGS, margin analysis" },
    ],
  },
];

const KPI_METRICS: { name: string; measures: string; roles: string[]; target: string }[] = [
  { name: "Visits", measures: "Total doctor visits completed", roles: ["Rep", "DM"], target: "8-12/day" },
  { name: "New Doctor Listings", measures: "New doctors added to database", roles: ["Rep"], target: "2-5/month" },
  { name: "Coverage %", measures: "Doctors visited vs assigned", roles: ["Rep", "DM"], target: ">80%" },
  { name: "Plan Completion %", measures: "Planned visits actually completed", roles: ["Rep"], target: ">90%" },
  { name: "Call Rate", measures: "Average visits per working day", roles: ["Rep", "DM"], target: "8-10/day" },
  { name: "Samples Distributed", measures: "Total product samples given to doctors", roles: ["Rep"], target: "Varies by BU" },
  { name: "Market Requests", measures: "Requests completed and fulfilled", roles: ["Rep", "DM"], target: ">85% fulfillment" },
  { name: "District Achievement", measures: "Aggregate team KPI score", roles: ["DM", "Marketeer"], target: ">80%" },
  { name: "Revenue per Visit", measures: "Revenue attributed per doctor visit", roles: ["Marketeer", "BUM"], target: "Growth QoQ" },
  { name: "Customer Retention", measures: "Regular prescribers maintained", roles: ["DM", "Marketeer"], target: ">90%" },
  { name: "New Account Acquisition", measures: "New hospital/pharmacy accounts", roles: ["Marketeer", "BUM"], target: "3-5/quarter" },
  { name: "Market Share %", measures: "Product market share in territory", roles: ["BUM"], target: "Growth YoY" },
];

const ROLE_ACCESS: { module: string; admin: string; nsm: string; bum: string; marketeer: string; dm: string; rep: string }[] = [
  { module: "Doctor Directory", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "full", rep: "read" },
  { module: "Visit Management", admin: "full", nsm: "full", bum: "read", marketeer: "read", dm: "scoped", rep: "scoped" },
  { module: "Weekly Plans", admin: "full", nsm: "full", bum: "read", marketeer: "scoped", dm: "scoped", rep: "scoped" },
  { module: "GPS Tracking", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "scoped", rep: "scoped" },
  { module: "Territories", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "read", rep: "read" },
  { module: "Leads & Pipeline", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "read", rep: "read" },
  { module: "Accounts", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "read", rep: "read" },
  { module: "Campaigns", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "read", rep: "none" },
  { module: "Loyalty Programs", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "read", rep: "none" },
  { module: "Expenses", admin: "full", nsm: "full", bum: "full", marketeer: "scoped", dm: "scoped", rep: "scoped" },
  { module: "Market Requests", admin: "full", nsm: "full", bum: "full", marketeer: "scoped", dm: "scoped", rep: "scoped" },
  { module: "Business Units", admin: "full", nsm: "full", bum: "scoped", marketeer: "read", dm: "read", rep: "none" },
  { module: "Support Tickets", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "scoped", rep: "scoped" },
  { module: "KPI Dashboard", admin: "full", nsm: "full", bum: "full", marketeer: "scoped", dm: "scoped", rep: "scoped" },
  { module: "Reports", admin: "full", nsm: "full", bum: "full", marketeer: "scoped", dm: "scoped", rep: "scoped" },
  { module: "Role Dashboard", admin: "full", nsm: "full", bum: "full", marketeer: "full", dm: "full", rep: "full" },
];

const EFFECTIVENESS: { title: string; icon: LucideIcon; before: string; after: string; metric: string }[] = [
  { title: "Visit Compliance", icon: MapPin, before: "Paper-based visit logs with no verification", after: "GPS-verified digital visits with real-time tracking", metric: "Plan completion rate visibility" },
  { title: "Expense Processing", icon: Receipt, before: "Paper receipts, manual data entry, email approvals", after: "OCR scanning, 3-level auto-routing, budget alerts", metric: "Submission-to-approval time" },
  { title: "Territory Coverage", icon: Map, before: "Spreadsheet-based territory assignments", after: "4-level hierarchical mapping with workload analytics", metric: "Coverage gap identification" },
  { title: "Approval Workflows", icon: Shield, before: "Email/phone chains with no tracking", after: "In-app multi-level routing with 48h auto-escalation", metric: "SLA compliance rate" },
  { title: "Doctor Insights", icon: Stethoscope, before: "Rep memory and personal notebooks", after: "Centralized DB with classification, buying ladder, history", metric: "Data completeness score" },
  { title: "Performance Visibility", icon: BarChart3, before: "Monthly Excel reports compiled manually", after: "Real-time KPI dashboards with sparkline trends", metric: "Time to insight (seconds vs days)" },
];

const TOC_ITEMS = [
  { num: 1, title: "Executive Summary", id: "executive-summary" },
  { num: 2, title: "System Architecture", id: "architecture" },
  { num: 3, title: "Feature Matrix", id: "features" },
  { num: 4, title: "Integration Map", id: "integration" },
  { num: 5, title: "User Journey Flows", id: "user-journeys" },
  { num: 6, title: "KPI & Analytics", id: "kpi-analytics" },
  { num: 7, title: "Effectiveness Metrics", id: "effectiveness" },
  { num: 8, title: "Role Access Matrix", id: "role-access" },
];

// ─── Helper Components ───────────────────────────────────────────────────────

function SectionHeading({ number, icon: Icon, title, id }: { number: number; icon: LucideIcon; title: string; id: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-6 pg-avoid-break">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-teal-600 text-white text-sm font-bold pg-bg">{number}</div>
      <Icon className="h-5 w-5 text-teal-600" />
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

function DiagramNode({ icon: Icon, label, variant = "crm", sub }: { icon: LucideIcon; label: string; variant?: "crm" | "erp" | "role"; sub?: string }) {
  const styles = {
    crm: "border-teal-500 bg-teal-50 text-teal-800",
    erp: "border-blue-500 bg-blue-50 text-blue-800",
    role: "border-purple-500 bg-purple-50 text-purple-800",
  };
  return (
    <div className={cn("rounded-lg border-2 px-4 py-2 text-center pg-bg pg-avoid-break", styles[variant])}>
      <div className="flex items-center justify-center gap-1.5">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {sub && <div className="text-[10px] mt-0.5 opacity-70">{sub}</div>}
    </div>
  );
}

function VLine() { return <div className="w-px h-5 bg-teal-300 mx-auto" />; }
function HLine() { return <div className="flex-1 min-w-4 h-0.5 bg-teal-300" />; }

function FlowStep({ number, label, color = "teal" }: { number: number; label: string; color?: string }) {
  const bgMap: Record<string, string> = { teal: "bg-teal-600", blue: "bg-blue-600", purple: "bg-purple-600", amber: "bg-amber-600" };
  return (
    <div className="flex flex-col items-center gap-1.5 w-24 shrink-0 pg-avoid-break">
      <div className={cn("w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold pg-bg", bgMap[color])}>
        {number}
      </div>
      <span className="text-[11px] text-center leading-tight font-medium text-gray-700">{label}</span>
    </div>
  );
}

function AccessIcon({ level }: { level: string }) {
  if (level === "full") return <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px]">Full</span></span>;
  if (level === "scoped") return <span className="flex items-center gap-1 text-blue-600"><Eye className="h-4 w-4" /><span className="text-[10px]">Scoped</span></span>;
  if (level === "read") return <span className="flex items-center gap-1 text-amber-600"><Eye className="h-4 w-4" /><span className="text-[10px]">Read</span></span>;
  return <span className="flex items-center gap-1 text-gray-400"><Minus className="h-4 w-4" /><span className="text-[10px]">--</span></span>;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProductGuidePage() {
  return (
    <div className="max-w-5xl mx-auto pb-16">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* ── Download Button (screen only) ── */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" /> Download as PDF
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 0: COVER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-cover rounded-2xl overflow-hidden mb-8">
        <div className="bg-gradient-to-br from-teal-600 to-blue-800 text-white p-12 min-h-[70vh] flex flex-col justify-between relative pg-bg">
          {/* Decorative icon grid */}
          <div className="absolute inset-0 opacity-[0.06] grid grid-cols-8 gap-6 p-10 pointer-events-none">
            {[Stethoscope, MapPin, Calendar, Target, Users, Receipt, TrendingUp, BarChart3,
              Building2, Map, ClipboardList, Award, Shield, Globe, Package, DollarSign,
              Megaphone, Ticket, Crown, UserCheck, Activity, Heart, Briefcase, Navigation,
              Stethoscope, MapPin, Calendar, Target, Users, Receipt, TrendingUp, BarChart3,
            ].map((Icon, i) => (
              <Icon key={i} className="h-8 w-8" />
            ))}
          </div>

          <div className="relative z-10">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">Product Guide v3.0</Badge>
            <h1 className="text-5xl font-extrabold tracking-tight mb-4">PharmaCRM</h1>
            <h2 className="text-2xl font-light opacity-90">Field Force Automation Platform</h2>
          </div>

          <div className="relative z-10 space-y-3">
            <p className="text-lg opacity-80 max-w-2xl">
              Integrated CRM for pharmaceutical sales operations. Purpose-built for Egypt and the MENA region
              with IMS-IQVIA standards, multi-level approval workflows, and full ERP integration.
            </p>
            <div className="flex items-center gap-4 text-sm opacity-60">
              <span>Pharma Enterprise Suite</span>
              <span>|</span>
              <span>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}</span>
              <span>|</span>
              <span>Confidential</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLE OF CONTENTS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-toc mb-8">
        <Card>
          <CardHeader><CardTitle className="text-xl">Table of Contents</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {TOC_ITEMS.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="flex items-center justify-between py-2 border-b border-dotted border-gray-300 hover:text-teal-600 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold pg-bg">{item.num}</span>
                    <span className="font-medium text-sm">{item.title}</span>
                  </span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: EXECUTIVE SUMMARY
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={1} icon={BookOpen} title="Executive Summary" id="executive-summary" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              <strong>PharmaCRM</strong> is a comprehensive field force automation platform purpose-built for pharmaceutical
              sales operations in Egypt and the MENA region. It digitizes the complete visit-plan-execute-report cycle
              and integrates seamlessly with ERP inventory, accounting, and HR modules.
            </p>
            <p>
              Designed for <strong>9 distinct roles</strong> from Medical Representatives to the National Sales Manager,
              the system supports the full hierarchy of pharma field operations. Each role has a tailored dashboard
              with real-time KPIs, pending approvals, and quick actions relevant to their responsibilities.
            </p>
            <p>
              The platform follows <strong>IMS-IQVIA standards</strong> for medical specialties and territory coding,
              ensuring compatibility with industry benchmarks. Multi-level approval workflows with auto-escalation
              ensure operational compliance, while GPS-verified visits and OCR-powered expense processing
              eliminate manual data entry.
            </p>
            <div className="pt-2">
              <h4 className="font-semibold text-gray-900 mb-2">Key Differentiators</h4>
              <ul className="space-y-1.5">
                {["4-level territory hierarchy with IMS-IQVIA coding", "5-stage buying ladder (Unaware to Champion) per doctor",
                  "GPS-verified visits with geofencing compliance", "OCR receipt scanning with 3-level auto-routing",
                  "Auto-escalation after 48h for pending approvals", "Full ERP integration (Inventory, Accounting, HR)",
                ].map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-sm">At a Glance</h4>
            {AT_A_GLANCE.map((item) => (
              <Card key={item.label} className={cn("border-l-4", item.color)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-2xl font-bold text-gray-900">{item.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: SYSTEM ARCHITECTURE
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={2} icon={Layers} title="System Architecture" id="architecture" />
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-0">
              {/* Role Hierarchy */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Role Hierarchy</p>
              <DiagramNode icon={Crown} label="NSM" variant="role" sub="National Sales Manager" />
              <VLine />
              <DiagramNode icon={Crown} label="BUM" variant="role" sub="Business Unit Manager" />
              <VLine />
              <div className="flex items-start gap-12">
                <div className="flex flex-col items-center">
                  <DiagramNode icon={Users} label="Marketeer" variant="role" sub="Regional Manager" />
                </div>
              </div>
              <VLine />
              <div className="flex items-start gap-12">
                <DiagramNode icon={UserCheck} label="District Manager" variant="role" sub="District Sales" />
              </div>
              <VLine />
              <DiagramNode icon={Activity} label="Medical Rep" variant="role" sub="Field Sales" />

              <VLine /><VLine />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">CRM Modules</p>

              {/* CRM Module Row */}
              <div className="flex flex-wrap items-start justify-center gap-3">
                <DiagramNode icon={Stethoscope} label="Doctors" variant="crm" />
                <DiagramNode icon={ClipboardList} label="Visits" variant="crm" />
                <DiagramNode icon={Calendar} label="Plans" variant="crm" />
                <DiagramNode icon={Send} label="Requests" variant="crm" />
                <DiagramNode icon={MapPin} label="GPS" variant="crm" />
                <DiagramNode icon={Target} label="KPIs" variant="crm" />
                <DiagramNode icon={Receipt} label="Expenses" variant="crm" />
              </div>

              <VLine /><VLine />
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <VLine />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">ERP Integration Layer</p>

              {/* ERP Row */}
              <div className="flex flex-wrap items-start justify-center gap-3">
                <DiagramNode icon={Package} label="Inventory" variant="erp" sub="Samples & Stock" />
                <DiagramNode icon={DollarSign} label="Accounting" variant="erp" sub="GL, AP, AR" />
                <DiagramNode icon={Briefcase} label="HR / ATS" variant="erp" sub="Leave & Training" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: FEATURE MATRIX
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={3} icon={FileText} title="Feature Matrix" id="features" />
        <div className="space-y-6">
          {FEATURE_MATRIX.map((cat) => (
            <Card key={cat.category} className="pg-avoid-break">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", cat.color)}><cat.icon className="h-3 w-3 mr-1" />{cat.category}</Badge>
                  <span className="text-xs text-muted-foreground">{cat.modules.length} modules</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Module</TableHead>
                      <TableHead>Key Capabilities</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.modules.map((mod) => (
                      <TableRow key={mod.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <mod.icon className="h-4 w-4 text-teal-600 shrink-0" />
                            <span className="text-sm">{mod.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {mod.capabilities.map((cap) => (
                              <Badge key={cap} variant="outline" className="text-[10px] font-normal">{cap}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: INTEGRATION MAP
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={4} icon={Globe} title="Integration Map" id="integration" />

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">CRM &harr; ERP Integration Flows</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {INTEGRATION_FLOWS.map((flow, i) => (
              <div key={i} className="pg-avoid-break">
                <div className="flex items-center gap-4">
                  <div className="w-44 shrink-0">
                    <DiagramNode icon={flow.crmIcon} label={flow.crm} variant="crm" />
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-teal-400 to-blue-400 rounded" />
                    <ArrowRight className="h-5 w-5 text-blue-500 shrink-0 -ml-1" />
                  </div>
                  <div className="w-44 shrink-0">
                    <DiagramNode icon={flow.erpIcon} label={flow.erp} variant="erp" />
                  </div>
                </div>
                <div className="mt-2 pl-48 pr-48">
                  <ul className="space-y-0.5">
                    {flow.flows.map((f, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Zap className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Cross-Module Syncs</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CROSS_MODULE_SYNCS.map((sync, i) => (
                <div key={i} className="rounded-lg border p-4 pg-avoid-break">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-teal-700 border-teal-300 text-[10px]">{sync.from}</Badge>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <Badge variant="outline" className="text-blue-700 border-blue-300 text-[10px]">{sync.to}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sync.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: USER JOURNEY FLOWS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={5} icon={Navigation} title="User Journey Flows" id="user-journeys" />
        <div className="space-y-6">
          {USER_JOURNEYS.map((journey) => (
            <Card key={journey.role} className="pg-avoid-break">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <journey.icon className="h-5 w-5 text-teal-600" />
                  <div>
                    <CardTitle className="text-base">{journey.role}</CardTitle>
                    <span className="text-xs text-muted-foreground">{journey.timeframe}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Flow steps */}
                <div className="flex items-start flex-wrap gap-y-4 mb-4">
                  {journey.steps.map((step, i) => (
                    <Fragment key={i}>
                      <FlowStep number={i + 1} label={step.label} color={journey.color} />
                      {i < journey.steps.length - 1 && (
                        <div className="flex items-center self-start mt-4">
                          <HLine />
                          <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
                {/* Step descriptions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border-t pt-3">
                  {journey.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="font-bold text-gray-500 shrink-0">{i + 1}.</span>
                      <span>{step.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6: KPI & ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={6} icon={Target} title="KPI & Analytics" id="kpi-analytics" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {KPI_METRICS.map((kpi) => (
            <Card key={kpi.name} className="pg-avoid-break">
              <CardContent className="p-3">
                <div className="font-semibold text-sm text-gray-900 mb-1">{kpi.name}</div>
                <p className="text-[11px] text-muted-foreground mb-2">{kpi.measures}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {kpi.roles.map((r) => (
                      <Badge key={r} variant="outline" className="text-[9px] px-1 py-0">{r}</Badge>
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-teal-700">{kpi.target}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Reporting Capabilities</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: "Report Templates", value: "9 pre-built (DVR, Coverage, Call Frequency, Productivity, New Doctor, Sample & Literature, Territory, Specialty, Visit History)" },
                { label: "Scheduled Delivery", value: "Daily, Weekly, Bi-weekly, Monthly email distribution" },
                { label: "Export Formats", value: "CSV, HTML, Printable PDF" },
                { label: "Data Scoping", value: "Role-based: each user sees only authorized data" },
                { label: "Time Periods", value: "Week, Month, Quarter, Year-to-Date" },
                { label: "Report Builder", value: "Custom templates with date range, territory, rep, and grouping filters" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2 py-1.5 border-b border-gray-100 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">{item.label}: </span>
                    <span className="text-muted-foreground text-xs">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7: EFFECTIVENESS METRICS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={7} icon={Zap} title="Effectiveness Metrics" id="effectiveness" />
        <p className="text-sm text-muted-foreground mb-4">How PharmaCRM transforms pharmaceutical field operations from manual processes to digital-first workflows.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EFFECTIVENESS.map((item) => (
            <Card key={item.title} className="pg-avoid-break overflow-hidden">
              <CardContent className="p-0">
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="h-4 w-4 text-teal-600" />
                    <span className="font-semibold text-sm">{item.title}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-3 bg-red-50 pg-bg">
                    <div className="text-[10px] font-semibold text-red-600 uppercase mb-1">Before</div>
                    <p className="text-xs text-red-800">{item.before}</p>
                  </div>
                  <div className="p-3 bg-green-50 pg-bg">
                    <div className="text-[10px] font-semibold text-green-600 uppercase mb-1">After</div>
                    <p className="text-xs text-green-800">{item.after}</p>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 pg-bg">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-teal-600" />
                    <span className="text-[10px] text-muted-foreground"><strong>Key Metric:</strong> {item.metric}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8: ROLE ACCESS MATRIX
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="pg-section mb-12">
        <SectionHeading number={8} icon={Lock} title="Role Access Matrix" id="role-access" />
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-44">Module</TableHead>
                  <TableHead className="text-center w-16"><div className="flex flex-col items-center"><Crown className="h-3.5 w-3.5 text-amber-600 mb-0.5" /><span className="text-[9px]">Admin</span></div></TableHead>
                  <TableHead className="text-center w-16"><div className="flex flex-col items-center"><Crown className="h-3.5 w-3.5 text-rose-600 mb-0.5" /><span className="text-[9px]">NSM</span></div></TableHead>
                  <TableHead className="text-center w-16"><div className="flex flex-col items-center"><Crown className="h-3.5 w-3.5 text-purple-600 mb-0.5" /><span className="text-[9px]">BUM</span></div></TableHead>
                  <TableHead className="text-center w-16"><div className="flex flex-col items-center"><Users className="h-3.5 w-3.5 text-blue-600 mb-0.5" /><span className="text-[9px]">Marketeer</span></div></TableHead>
                  <TableHead className="text-center w-16"><div className="flex flex-col items-center"><UserCheck className="h-3.5 w-3.5 text-teal-600 mb-0.5" /><span className="text-[9px]">DM</span></div></TableHead>
                  <TableHead className="text-center w-16"><div className="flex flex-col items-center"><Activity className="h-3.5 w-3.5 text-gray-600 mb-0.5" /><span className="text-[9px]">Med Rep</span></div></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_ACCESS.map((row) => (
                  <TableRow key={row.module}>
                    <TableCell className="font-medium text-sm">{row.module}</TableCell>
                    <TableCell className="text-center"><AccessIcon level={row.admin} /></TableCell>
                    <TableCell className="text-center"><AccessIcon level={row.nsm} /></TableCell>
                    <TableCell className="text-center"><AccessIcon level={row.bum} /></TableCell>
                    <TableCell className="text-center"><AccessIcon level={row.marketeer} /></TableCell>
                    <TableCell className="text-center"><AccessIcon level={row.dm} /></TableCell>
                    <TableCell className="text-center"><AccessIcon level={row.rep} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Full Access</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-blue-600" /> Scoped (own team/data)</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-amber-600" /> Read Only</span>
          <span className="flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-gray-400" /> No Access</span>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="text-center text-xs text-muted-foreground pt-8 border-t">
        <p className="font-semibold text-gray-700 mb-1">PharmaCRM Field Force Automation Platform</p>
        <p>Pharma Enterprise Suite &middot; {new Date().getFullYear()} &middot; Confidential</p>
      </footer>
    </div>
  );
}
