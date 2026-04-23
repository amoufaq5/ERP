"use client";

import { useState } from "react";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scale, Shield, FileText, Plus, Eye, Users,
  AlertTriangle, Download,
  Lock, Building2, Leaf, CreditCard,
  AlertCircle,
} from "lucide-react";

const kpis = [
  { label: "Overall Compliance", value: "94.2%", icon: Shield, color: "text-green-600", bg: "bg-green-100" },
  { label: "Active Regulations", value: "47", icon: Scale, color: "text-blue-600", bg: "bg-blue-100" },
  { label: "Pending Audits", value: "5", icon: Eye, color: "text-amber-600", bg: "bg-amber-100" },
  { label: "Open Violations", value: "3", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
  { label: "Active Policies", value: "128", icon: FileText, color: "text-purple-600", bg: "bg-purple-100" },
  { label: "Risk Items", value: "12", icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-100" },
];

const complianceCategories = [
  { name: "Financial Compliance", score: 96, icon: CreditCard, regulations: 12, color: "text-green-600" },
  { name: "Environmental", score: 91, icon: Leaf, regulations: 8, color: "text-green-600" },
  { name: "Labor & Employment", score: 97, icon: Users, regulations: 9, color: "text-green-600" },
  { name: "Data Privacy", score: 93, icon: Lock, regulations: 6, color: "text-green-600" },
  { name: "Industry Standards", score: 89, icon: Building2, regulations: 7, color: "text-amber-600" },
  { name: "Health & Safety", score: 98, icon: Shield, regulations: 5, color: "text-green-600" },
];

const regulations = [
  { id: "REG-001", name: "Sarbanes-Oxley Act (SOX)", authority: "SEC", category: "Financial", jurisdiction: "United States", effective: "2002", status: "Active", impact: "High", dept: "Finance" },
  { id: "REG-002", name: "GDPR", authority: "European Commission", category: "Data Privacy", jurisdiction: "European Union", effective: "2018", status: "Active", impact: "High", dept: "IT / Legal" },
  { id: "REG-003", name: "HIPAA", authority: "HHS", category: "Data Privacy", jurisdiction: "United States", effective: "1996", status: "Active", impact: "High", dept: "IT / HR" },
  { id: "REG-004", name: "OSHA Standards", authority: "OSHA", category: "Health & Safety", jurisdiction: "United States", effective: "1970", status: "Active", impact: "High", dept: "Safety" },
  { id: "REG-005", name: "EPA Clean Air Act", authority: "EPA", category: "Environmental", jurisdiction: "United States", effective: "1970", status: "Active", impact: "Medium", dept: "Operations" },
  { id: "REG-006", name: "PCI DSS v4.0", authority: "PCI SSC", category: "Data Privacy", jurisdiction: "Global", effective: "2024", status: "Active", impact: "High", dept: "IT" },
  { id: "REG-007", name: "AML/KYC Requirements", authority: "FinCEN", category: "Financial", jurisdiction: "United States", effective: "2001", status: "Active", impact: "High", dept: "Finance" },
  { id: "REG-008", name: "Fair Labor Standards Act", authority: "DOL", category: "Labor", jurisdiction: "United States", effective: "1938", status: "Active", impact: "Medium", dept: "HR" },
  { id: "REG-009", name: "ISO 27001:2022", authority: "ISO", category: "Industry Standards", jurisdiction: "Global", effective: "2022", status: "Active", impact: "Medium", dept: "IT" },
  { id: "REG-010", name: "ISO 14001:2015", authority: "ISO", category: "Environmental", jurisdiction: "Global", effective: "2015", status: "Active", impact: "Medium", dept: "Operations" },
  { id: "REG-011", name: "Foreign Corrupt Practices Act", authority: "DOJ/SEC", category: "Financial", jurisdiction: "United States", effective: "1977", status: "Active", impact: "High", dept: "Legal" },
  { id: "REG-012", name: "Basel III Framework", authority: "BCBS", category: "Financial", jurisdiction: "Global", effective: "2023", status: "Active", impact: "Medium", dept: "Finance" },
];

const audits = [
  { id: "AUD-001", type: "Internal", scope: "Financial Controls Q1", auditor: "Deloitte LLP", start: "Apr 10, 2026", end: "Apr 24, 2026", status: "Planned", findings: 0, risk: "Medium" },
  { id: "AUD-002", type: "External", scope: "SOX Compliance Annual", auditor: "KPMG", start: "May 1, 2026", end: "May 30, 2026", status: "Planned", findings: 0, risk: "High" },
  { id: "AUD-003", type: "Internal", scope: "IT Security Assessment", auditor: "Internal Audit Team", start: "Mar 15, 2026", end: "Mar 28, 2026", status: "Completed", findings: 7, risk: "Medium" },
  { id: "AUD-004", type: "Regulatory", scope: "OSHA Workplace Inspection", auditor: "OSHA Inspector", start: "Mar 5, 2026", end: "Mar 5, 2026", status: "Completed", findings: 2, risk: "Low" },
  { id: "AUD-005", type: "External", scope: "ISO 27001 Surveillance", auditor: "BSI Group", start: "Apr 20, 2026", end: "Apr 22, 2026", status: "Planned", findings: 0, risk: "Medium" },
  { id: "AUD-006", type: "Internal", scope: "Data Privacy Compliance", auditor: "Internal Audit Team", start: "Feb 10, 2026", end: "Feb 28, 2026", status: "Follow-up", findings: 4, risk: "High" },
  { id: "AUD-007", type: "Internal", scope: "Procurement Ethics Review", auditor: "Internal Audit Team", start: "Jan 15, 2026", end: "Jan 30, 2026", status: "Completed", findings: 1, risk: "Low" },
  { id: "AUD-008", type: "Regulatory", scope: "EPA Environmental Audit", auditor: "EPA Auditor", start: "Jun 1, 2026", end: "Jun 3, 2026", status: "Planned", findings: 0, risk: "Medium" },
];

const policies = [
  { name: "Anti-Corruption Policy", version: "3.2", category: "Legal", updated: "Jan 15, 2026", review: "Jan 15, 2027", status: "Active", owner: "Legal Dept", ack: 94 },
  { name: "Data Protection Policy", version: "4.1", category: "IT", updated: "Mar 1, 2026", review: "Sep 1, 2026", status: "Active", owner: "CISO", ack: 97 },
  { name: "Whistleblower Policy", version: "2.0", category: "HR", updated: "Oct 10, 2025", review: "Oct 10, 2026", status: "Active", owner: "HR Director", ack: 91 },
  { name: "Code of Conduct", version: "5.0", category: "HR", updated: "Jan 1, 2026", review: "Jan 1, 2027", status: "Active", owner: "CEO Office", ack: 99 },
  { name: "Information Security Policy", version: "3.5", category: "IT", updated: "Feb 15, 2026", review: "Aug 15, 2026", status: "Active", owner: "CISO", ack: 96 },
  { name: "Acceptable Use Policy", version: "2.3", category: "IT", updated: "Dec 1, 2025", review: "Dec 1, 2026", status: "Active", owner: "IT Director", ack: 93 },
  { name: "Travel & Expense Policy", version: "4.0", category: "Finance", updated: "Nov 15, 2025", review: "Nov 15, 2026", status: "Active", owner: "CFO", ack: 88 },
  { name: "Procurement Ethics Policy", version: "1.8", category: "Operations", updated: "Mar 10, 2026", review: "Mar 10, 2027", status: "Under Review", owner: "Procurement", ack: 85 },
  { name: "Conflict of Interest Policy", version: "2.1", category: "Legal", updated: "Feb 1, 2026", review: "Feb 1, 2027", status: "Active", owner: "Legal Dept", ack: 92 },
  { name: "Record Retention Policy", version: "3.0", category: "Legal", updated: "Sep 1, 2025", review: "Sep 1, 2026", status: "Active", owner: "Legal Dept", ack: 86 },
];

const violations = [
  { id: "VIO-001", type: "Non-Compliance", regulation: "GDPR", desc: "Customer data retention exceeded 3-year limit", severity: "Major", detected: "Mar 20, 2026", status: "Investigating", deadline: "Apr 20, 2026", assignee: "CISO", fine: "€50,000" },
  { id: "VIO-002", type: "Process Violation", regulation: "SOX", desc: "Missing sign-off on Q4 journal entries", severity: "Minor", detected: "Mar 15, 2026", status: "Remediated", deadline: "Apr 15, 2026", assignee: "Controller", fine: "—" },
  { id: "VIO-003", type: "Safety Violation", regulation: "OSHA", desc: "Blocked emergency exit in Warehouse B", severity: "Major", detected: "Mar 5, 2026", status: "Closed", deadline: "Mar 10, 2026", assignee: "Safety Mgr", fine: "EGP 7,000" },
  { id: "VIO-004", type: "Environmental", regulation: "EPA", desc: "Wastewater discharge slightly above limits", severity: "Minor", detected: "Feb 28, 2026", status: "Remediated", deadline: "Mar 28, 2026", assignee: "Env. Officer", fine: "—" },
  { id: "VIO-005", type: "Data Breach", regulation: "PCI DSS", desc: "Unencrypted credit card data in test environment", severity: "Critical", detected: "Mar 25, 2026", status: "Open", deadline: "Apr 10, 2026", assignee: "CISO", fine: "TBD" },
  { id: "VIO-006", type: "Labor Violation", regulation: "FLSA", desc: "Overtime calculation error for 3 employees", severity: "Minor", detected: "Mar 1, 2026", status: "Closed", deadline: "Mar 15, 2026", assignee: "HR Director", fine: "—" },
];

const complianceRisks = [
  { id: "CR-001", category: "Data Privacy", desc: "Cross-border data transfer without SCCs", inherent: 16, controls: "SCCs in progress, data mapping", residual: 8, owner: "DPO", lastAssess: "Mar 15, 2026", nextReview: "Jun 15, 2026" },
  { id: "CR-002", category: "Financial", desc: "SOX material weakness in revenue recognition", inherent: 20, controls: "Enhanced review process, automated checks", residual: 6, owner: "Controller", lastAssess: "Mar 1, 2026", nextReview: "Jun 1, 2026" },
  { id: "CR-003", category: "Regulatory", desc: "New ESG reporting requirements uncertainty", inherent: 12, controls: "Advisory engagement, gap analysis", residual: 8, owner: "CFO", lastAssess: "Feb 15, 2026", nextReview: "May 15, 2026" },
  { id: "CR-004", category: "Operational", desc: "Third-party vendor data handling compliance", inherent: 15, controls: "Vendor assessments, DPAs, audits", residual: 6, owner: "Procurement", lastAssess: "Mar 10, 2026", nextReview: "Jun 10, 2026" },
  { id: "CR-005", category: "Sanctions", desc: "Trade sanctions screening gaps", inherent: 20, controls: "Automated screening tool, training", residual: 4, owner: "Legal", lastAssess: "Mar 20, 2026", nextReview: "Jun 20, 2026" },
  { id: "CR-006", category: "Anti-Corruption", desc: "Agent/distributor bribery risk in emerging markets", inherent: 16, controls: "Due diligence, anti-bribery training", residual: 8, owner: "Legal", lastAssess: "Feb 1, 2026", nextReview: "May 1, 2026" },
  { id: "CR-007", category: "IT Security", desc: "Ransomware attack on critical systems", inherent: 25, controls: "EDR, backups, incident response plan", residual: 10, owner: "CISO", lastAssess: "Mar 25, 2026", nextReview: "Apr 25, 2026" },
  { id: "CR-008", category: "Labor", desc: "Contractor misclassification risk", inherent: 12, controls: "Classification review, legal opinion", residual: 4, owner: "HR Director", lastAssess: "Jan 15, 2026", nextReview: "Jul 15, 2026" },
];

const reports = [
  { name: "Compliance Summary Report", desc: "Overall compliance status across all regulations", lastGen: "Mar 31, 2026", freq: "Monthly", format: "PDF" },
  { name: "Audit Trail Report", desc: "Complete audit trail of all compliance activities", lastGen: "Mar 31, 2026", freq: "Monthly", format: "Excel" },
  { name: "Regulatory Change Report", desc: "New and updated regulations impacting the organization", lastGen: "Mar 15, 2026", freq: "Bi-weekly", format: "PDF" },
  { name: "Violation Report", desc: "All open and closed violations with remediation status", lastGen: "Mar 31, 2026", freq: "Monthly", format: "PDF" },
  { name: "Training Compliance Report", desc: "Employee compliance training completion rates", lastGen: "Mar 31, 2026", freq: "Monthly", format: "Excel" },
  { name: "Risk Assessment Report", desc: "Current compliance risk register with scores", lastGen: "Mar 31, 2026", freq: "Quarterly", format: "PDF" },
  { name: "Policy Compliance Report", desc: "Policy acknowledgment and review status", lastGen: "Mar 31, 2026", freq: "Monthly", format: "PDF" },
  { name: "Board Compliance Report", desc: "Executive summary for board of directors", lastGen: "Mar 31, 2026", freq: "Quarterly", format: "PDF" },
];

function riskColor(score: number) {
  if (score >= 20) return "bg-red-600 text-white";
  if (score >= 12) return "bg-orange-500 text-white";
  if (score >= 6) return "bg-yellow-400 text-black";
  return "bg-green-500 text-white";
}

const sevBadge: Record<string, "destructive" | "default" | "secondary"> = { Critical: "destructive", Major: "destructive", Minor: "secondary" };
const statusBadge: Record<string, "default" | "destructive" | "secondary" | "outline"> = { Active: "default", "Under Review": "secondary", Pending: "secondary", Expired: "outline", Planned: "secondary", "In Progress": "default", Completed: "default", "Follow-up": "secondary", Open: "destructive", Investigating: "default", Remediated: "secondary", Closed: "outline" };

const regulationFields: EntityField[] = [
  { name: "name", label: "Regulation Name", type: "text", required: true },
  { name: "authority", label: "Authority", type: "text", required: true },
  { name: "category", label: "Category", type: "select", options: [
    { label: "Financial", value: "Financial" }, { label: "Environmental", value: "Environmental" },
    { label: "Labor", value: "Labor" }, { label: "Data Privacy", value: "Data Privacy" },
    { label: "Industry Standards", value: "Industry Standards" }, { label: "Health & Safety", value: "Health & Safety" },
  ]},
  { name: "jurisdiction", label: "Jurisdiction", type: "text" },
  { name: "effectiveDate", label: "Effective Date", type: "date" },
  { name: "impact", label: "Impact", type: "select", options: [
    { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
  ]},
  { name: "dept", label: "Department", type: "text" },
];

const auditColumns: Column<Record<string, unknown>>[] = [
  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
  { key: "type", label: "Type", render: (v) => <Badge variant="outline" className="text-xs">{String(v)}</Badge> },
  { key: "scope", label: "Scope", render: (v) => <span className="text-xs font-medium">{String(v)}</span> },
  { key: "auditor", label: "Auditor", render: (v) => <span className="text-xs">{String(v)}</span> },
  { key: "start", label: "Start", render: (v) => <span className="text-xs">{String(v)}</span> },
  { key: "end", label: "End", render: (v) => <span className="text-xs">{String(v)}</span> },
  { key: "status", label: "Status", render: (v) => <Badge variant={statusBadge[String(v)] || "secondary"} className="text-xs">{String(v)}</Badge> },
  { key: "findings", label: "Findings", render: (v) => <span className="text-xs text-center">{String(v)}</span> },
  { key: "risk", label: "Risk", render: (v) => <Badge variant={v === "High" ? "destructive" : v === "Medium" ? "default" : "secondary"} className="text-xs">{String(v)}</Badge> },
];

const riskColumns: Column<Record<string, unknown>>[] = [
  { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
  { key: "category", label: "Category", render: (v) => <Badge variant="outline" className="text-xs">{String(v)}</Badge> },
  { key: "desc", label: "Description", className: "max-w-[180px]", render: (v) => <span className="text-xs">{String(v)}</span> },
  { key: "inherent", label: "Inherent Risk", render: (v) => <span className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-bold ${riskColor(Number(v))}`}>{String(v)}</span> },
  { key: "controls", label: "Controls", className: "max-w-[180px]", render: (v) => <span className="text-xs text-muted-foreground">{String(v)}</span> },
  { key: "residual", label: "Residual Risk", render: (v) => <span className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-bold ${riskColor(Number(v))}`}>{String(v)}</span> },
  { key: "owner", label: "Owner", render: (v) => <span className="text-xs">{String(v)}</span> },
  { key: "lastAssess", label: "Last Assessed", render: (v) => <span className="text-xs">{String(v)}</span> },
  { key: "nextReview", label: "Next Review", render: (v) => <span className="text-xs">{String(v)}</span> },
];

export default function CompliancePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingReg, setEditingReg] = useState<typeof regulations[0] | null>(null);
  const [regs, setRegs] = useState(regulations);
  const [viols, setViols] = useState(violations);
  const [regFilters, setRegFilters] = useState<FilterState>({});
  const [violFilters, setViolFilters] = useState<FilterState>({});

  const regulationColumns: Column<Record<string, unknown>>[] = [
    { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
    { key: "name", label: "Regulation", render: (v) => <span className="text-xs font-medium">{String(v)}</span> },
    { key: "authority", label: "Authority", render: (v) => <span className="text-xs">{String(v)}</span> },
    { key: "category", label: "Category", render: (v) => <Badge variant="outline" className="text-xs">{String(v)}</Badge> },
    { key: "jurisdiction", label: "Jurisdiction", render: (v) => <span className="text-xs">{String(v)}</span> },
    { key: "effective", label: "Effective", render: (v) => <span className="text-xs">{String(v)}</span> },
    { key: "status", label: "Status", render: (v) => <Badge variant={statusBadge[String(v)] || "secondary"} className="text-xs">{String(v)}</Badge> },
    { key: "impact", label: "Impact", render: (v) => <Badge variant={v === "High" ? "destructive" : "secondary"} className="text-xs">{String(v)}</Badge> },
    { key: "dept", label: "Dept", render: (v) => <span className="text-xs">{String(v)}</span> },
    { key: "actions", label: "Actions", render: (_v, row) => (
      <EditDeleteMenu
        onEdit={() => { setEditingReg(row as unknown as typeof regulations[0]); setShowForm(true); }}
        onDelete={() => setRegs(prev => prev.filter(x => x.id !== row.id))}
        itemLabel={String(row.name)}
      />
    )},
  ];

  const violationColumns: Column<Record<string, unknown>>[] = [
    { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
    { key: "type", label: "Type", render: (v) => <Badge variant="outline" className="text-xs">{String(v)}</Badge> },
    { key: "regulation", label: "Regulation", render: (v) => <span className="text-xs font-medium">{String(v)}</span> },
    { key: "desc", label: "Description", className: "max-w-[180px]", render: (v) => <span className="text-xs truncate block">{String(v)}</span> },
    { key: "severity", label: "Severity", render: (v) => <Badge variant={sevBadge[String(v)] || "secondary"} className="text-xs">{String(v)}</Badge> },
    { key: "detected", label: "Detected", render: (v) => <span className="text-xs">{String(v)}</span> },
    { key: "status", label: "Status", render: (v) => <Badge variant={statusBadge[String(v)] || "secondary"} className="text-xs">{String(v)}</Badge> },
    { key: "deadline", label: "Deadline", render: (v) => <span className="text-xs">{String(v)}</span> },
    { key: "assignee", label: "Assigned", render: (v) => <span className="text-xs">{String(v)}</span> },
    { key: "fine", label: "Fine", render: (v) => <span className="text-xs font-medium">{String(v)}</span> },
    { key: "actions", label: "Actions", render: (_v, row) => {
      const flow: Record<string, string> = { "Open": "Investigating", "Investigating": "Remediated", "Remediated": "Closed" };
      const next = flow[String(row.status)];
      return (
        <EditDeleteMenu
          onEdit={() => {}}
          onDelete={() => setViols(prev => prev.filter(x => x.id !== row.id))}
          canEdit={false}
          itemLabel={String(row.id)}
          extraItems={next ? [{ label: `→ ${next}`, onClick: () => setViols(prev => prev.map(x => x.id === row.id ? { ...x, status: next } : x)) }] : []}
        />
      );
    }},
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold tracking-tight">Compliance Management</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Regulatory compliance, audits, policies, and risk management</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingReg(null); setShowForm(true); }}><Plus className="h-4 w-4" />New Regulation</Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="regulations">Regulations</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="risks">Risk Register</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map(k => { const Icon = k.icon; return (
              <Card key={k.label}><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><p className="text-2xl font-bold">{k.value}</p><div className={`flex h-9 w-9 items-center justify-center rounded-full ${k.bg}`}><Icon className={`h-4 w-4 ${k.color}`} /></div></div><p className="text-xs font-medium">{k.label}</p></CardContent></Card>
            ); })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {complianceCategories.map(c => { const Icon = c.icon; return (
              <Card key={c.name} className="hover:shadow-md transition-shadow"><CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><div><p className="text-sm font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.regulations} regulations tracked</p></div></div>
                <div className="flex justify-between text-xs mb-1"><span>Compliance Score</span><span className={`font-bold ${c.score >= 95 ? "text-green-600" : c.score >= 90 ? "text-amber-600" : "text-red-600"}`}>{c.score}%</span></div>
                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.score >= 95 ? "bg-green-500" : c.score >= 90 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.score}%` }} /></div>
              </CardContent></Card>
            ); })}
          </div>
        </TabsContent>

        <TabsContent value="regulations" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search regulations..."
            searchValue={regFilters._search ?? ""}
            onSearchChange={(v) => setRegFilters(prev => ({ ...prev, _search: v }))}
            fields={[
              { key: "category", label: "Category", type: "select", options: [
                { label: "Financial", value: "Financial" }, { label: "Data Privacy", value: "Data Privacy" },
                { label: "Environmental", value: "Environmental" }, { label: "Health & Safety", value: "Health & Safety" },
                { label: "Labor", value: "Labor" }, { label: "Industry Standards", value: "Industry Standards" },
              ]},
              { key: "impact", label: "Impact", type: "select", options: [
                { label: "High", value: "High" }, { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
              ]},
            ]}
            values={regFilters}
            onChange={(k, v) => setRegFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={() => { setEditingReg(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" />Add</Button>}
          />
          <Card><CardContent className="p-0">
            <DataTable
              columns={regulationColumns}
              data={regs
                .filter(r => !regFilters._search || r.name.toLowerCase().includes(regFilters._search.toLowerCase()))
                .filter(r => !regFilters.category || r.category === regFilters.category)
                .filter(r => !regFilters.impact || r.impact === regFilters.impact) as unknown as Record<string, unknown>[]}
              exportable
              exportFilename="regulations.csv"
              emptyMessage="No regulations found."
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card><CardContent className="p-0">
            <DataTable
              columns={auditColumns}
              data={audits as unknown as Record<string, unknown>[]}
              exportable
              exportFilename="audits.csv"
              emptyMessage="No audits found."
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {policies.map(p => (
              <Card key={p.name} className="hover:shadow-md transition-shadow"><CardHeader className="pb-2"><div className="flex items-start justify-between"><CardTitle className="text-sm font-semibold leading-tight">{p.name}</CardTitle><Badge variant={statusBadge[p.status] || "secondary"} className="text-xs shrink-0">{p.status}</Badge></div><CardDescription className="text-xs">v{p.version} · {p.category} · {p.owner}</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Last Updated</span><span>{p.updated}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Next Review</span><span>{p.review}</span></div>
                <div><div className="flex justify-between text-xs mb-1"><span>Acknowledgment</span><span className="font-medium">{p.ack}%</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${p.ack >= 95 ? "bg-green-500" : p.ack >= 85 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${p.ack}%` }} /></div></div>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search violations..."
            searchValue={violFilters._search ?? ""}
            onSearchChange={(v) => setViolFilters(prev => ({ ...prev, _search: v }))}
            fields={[
              { key: "severity", label: "Severity", type: "select", options: [
                { label: "Critical", value: "Critical" }, { label: "Major", value: "Major" }, { label: "Minor", value: "Minor" },
              ]},
              { key: "status", label: "Status", type: "select", options: [
                { label: "Open", value: "Open" }, { label: "Investigating", value: "Investigating" },
                { label: "Remediated", value: "Remediated" }, { label: "Closed", value: "Closed" },
              ]},
            ]}
            values={violFilters}
            onChange={(k, v) => setViolFilters(f => ({ ...f, [k]: v }))}
          />
          <Card><CardContent className="p-0">
            <DataTable
              columns={violationColumns}
              data={viols
                .filter(v => !violFilters._search || v.desc.toLowerCase().includes(violFilters._search.toLowerCase()) || v.regulation.toLowerCase().includes(violFilters._search.toLowerCase()))
                .filter(v => !violFilters.severity || v.severity === violFilters.severity)
                .filter(v => !violFilters.status || v.status === violFilters.status) as unknown as Record<string, unknown>[]}
              exportable
              exportFilename="violations.csv"
              emptyMessage="No violations found."
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card><CardContent className="p-0">
            <DataTable
              columns={riskColumns}
              data={complianceRisks as unknown as Record<string, unknown>[]}
              exportable
              exportFilename="compliance-risks.csv"
              emptyMessage="No compliance risks found."
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {reports.map(r => (
              <Card key={r.name} className="hover:shadow-md transition-shadow"><CardContent className="p-4">
                <div className="flex items-start justify-between mb-2"><FileText className="h-5 w-5 text-primary" /><Badge variant="outline" className="text-[10px]">{r.format}</Badge></div>
                <p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground"><span>Last: {r.lastGen}</span><span>{r.freq}</span></div>
                <Button variant="outline" size="sm" className="w-full mt-3 text-xs gap-1"><Download className="h-3 w-3" />Generate</Button>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingReg(null); }}
        title={editingReg ? `Edit ${editingReg.name}` : "New Regulation"}
        fields={regulationFields}
        initialData={editingReg ? {
          name: editingReg.name, authority: editingReg.authority,
          category: editingReg.category, jurisdiction: editingReg.jurisdiction,
          effectiveDate: editingReg.effective, impact: editingReg.impact, dept: editingReg.dept,
        } : undefined}
        submitLabel={editingReg ? "Update" : "Add"}
        onSubmit={(data) => {
          if (editingReg) {
            setRegs(prev => prev.map(r => r.id === editingReg.id ? {
              ...r, name: String(data.name), authority: String(data.authority),
              category: String(data.category) || r.category,
              jurisdiction: String(data.jurisdiction) || r.jurisdiction,
              effective: String(data.effectiveDate) || r.effective,
              impact: String(data.impact) || r.impact,
              dept: String(data.dept) || r.dept,
            } : r));
          } else {
            setRegs(prev => [{
              id: `REG-${Date.now().toString(36)}`,
              name: String(data.name), authority: String(data.authority),
              category: String(data.category) || "Financial",
              jurisdiction: String(data.jurisdiction) || "—",
              effective: String(data.effectiveDate) || new Date().toISOString().split("T")[0],
              status: "Active",
              impact: String(data.impact) || "Medium",
              dept: String(data.dept) || "—",
            }, ...prev]);
          }
        }}
      />
    </div>
  );
}
