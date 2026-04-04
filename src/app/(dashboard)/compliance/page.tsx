"use client";

import { useState } from "react";
import { FormModal, type FormField } from "@/components/ui/form-modal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scale, Shield, FileText, Search, Plus, Eye, Calendar, Users, Clock,
  CheckCircle2, XCircle, AlertTriangle, BarChart3, Download, Globe,
  Lock, BookOpen, Gavel, Building2, Leaf, CreditCard, UserCheck,
  FileCheck, AlertCircle, TrendingUp,
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
  { id: "VIO-003", type: "Safety Violation", regulation: "OSHA", desc: "Blocked emergency exit in Warehouse B", severity: "Major", detected: "Mar 5, 2026", status: "Closed", deadline: "Mar 10, 2026", assignee: "Safety Mgr", fine: "$7,000" },
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

const regulationFields: FormField[] = [
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

export default function CompliancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [regs, setRegs] = useState(regulations);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><Scale className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold tracking-tight">Compliance Management</h1></div>
          <p className="text-muted-foreground text-sm mt-1">Regulatory compliance, audits, policies, and risk management</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />New Regulation</Button>
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
          <div className="relative max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search regulations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" /></div>
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["ID", "Regulation", "Authority", "Category", "Jurisdiction", "Effective", "Status", "Impact", "Department"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{regs.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{r.id}</td><td className="p-3 text-xs font-medium">{r.name}</td><td className="p-3 text-xs">{r.authority}</td><td className="p-3"><Badge variant="outline" className="text-xs">{r.category}</Badge></td><td className="p-3 text-xs">{r.jurisdiction}</td><td className="p-3 text-xs">{r.effective}</td><td className="p-3"><Badge variant={statusBadge[r.status] || "secondary"} className="text-xs">{r.status}</Badge></td><td className="p-3"><Badge variant={r.impact === "High" ? "destructive" : "secondary"} className="text-xs">{r.impact}</Badge></td><td className="p-3 text-xs">{r.dept}</td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["ID", "Type", "Scope", "Auditor", "Start", "End", "Status", "Findings", "Risk"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{audits.map(a => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{a.id}</td><td className="p-3"><Badge variant="outline" className="text-xs">{a.type}</Badge></td><td className="p-3 text-xs font-medium">{a.scope}</td><td className="p-3 text-xs">{a.auditor}</td><td className="p-3 text-xs">{a.start}</td><td className="p-3 text-xs">{a.end}</td><td className="p-3"><Badge variant={statusBadge[a.status] || "secondary"} className="text-xs">{a.status}</Badge></td><td className="p-3 text-xs text-center">{a.findings}</td><td className="p-3"><Badge variant={a.risk === "High" ? "destructive" : a.risk === "Medium" ? "default" : "secondary"} className="text-xs">{a.risk}</Badge></td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
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
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["ID", "Type", "Regulation", "Description", "Severity", "Detected", "Status", "Deadline", "Assigned", "Fine"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{violations.map(v => (
              <tr key={v.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{v.id}</td><td className="p-3"><Badge variant="outline" className="text-xs">{v.type}</Badge></td><td className="p-3 text-xs font-medium">{v.regulation}</td><td className="p-3 text-xs max-w-[180px] truncate">{v.desc}</td><td className="p-3"><Badge variant={sevBadge[v.severity] || "secondary"} className="text-xs">{v.severity}</Badge></td><td className="p-3 text-xs">{v.detected}</td><td className="p-3"><Badge variant={statusBadge[v.status] || "secondary"} className="text-xs">{v.status}</Badge></td><td className="p-3 text-xs">{v.deadline}</td><td className="p-3 text-xs">{v.assignee}</td><td className="p-3 text-xs font-medium">{v.fine}</td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card><CardContent className="p-0"><table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{["ID", "Category", "Description", "Inherent Risk", "Controls", "Residual Risk", "Owner", "Last Assessed", "Next Review"].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{complianceRisks.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{r.id}</td><td className="p-3"><Badge variant="outline" className="text-xs">{r.category}</Badge></td><td className="p-3 text-xs max-w-[180px]">{r.desc}</td><td className="p-3"><span className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-bold ${riskColor(r.inherent)}`}>{r.inherent}</span></td><td className="p-3 text-xs max-w-[180px] text-muted-foreground">{r.controls}</td><td className="p-3"><span className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-bold ${riskColor(r.residual)}`}>{r.residual}</span></td><td className="p-3 text-xs">{r.owner}</td><td className="p-3 text-xs">{r.lastAssess}</td><td className="p-3 text-xs">{r.nextReview}</td>
              </tr>
            ))}</tbody>
          </table></CardContent></Card>
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

      <FormModal
        open={showForm}
        onOpenChange={setShowForm}
        title="New Regulation"
        fields={regulationFields}
        onSubmit={(data) => {
          const newReg = {
            id: `REG-${String(regs.length + 1).padStart(3, "0")}`,
            name: data.name,
            authority: data.authority,
            category: data.category || "Financial",
            jurisdiction: data.jurisdiction || "—",
            effective: data.effectiveDate || new Date().toISOString().split("T")[0],
            status: "Active",
            impact: data.impact || "Medium",
            dept: data.dept || "—",
          };
          setRegs((prev) => [newReg, ...prev]);
        }}
      />
    </div>
  );
}
