"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import {
  Search, Plus, Eye, CheckCircle2, XCircle, AlertTriangle, FileText,
  ClipboardList, BarChart3, ShieldCheck, TrendingUp, TrendingDown,
  Package, Users, Calendar, Download, Filter, ArrowUpRight,
  Activity, Target, Award, Gauge, FlaskConical, Truck, FolderOpen,
} from "lucide-react";

// ─── Data ──────────────────────────────────────────────────────────────────

const kpis = [
  { label: "First Pass Yield", value: "97.3%", icon: Target, color: "text-green-600", bg: "bg-green-100", sub: "Target: 96.0%" },
  { label: "Defect Rate", value: "0.42%", icon: TrendingDown, color: "text-green-600", bg: "bg-green-100", sub: "Down from 0.58%" },
  { label: "Customer Returns", value: "12", icon: Package, color: "text-amber-600", bg: "bg-amber-100", sub: "This quarter" },
  { label: "Open NCRs", value: "8", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", sub: "3 critical" },
  { label: "Inspection Pass Rate", value: "98.1%", icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-100", sub: "+1.2% from last month" },
  { label: "CAPA Items", value: "15", icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-100", sub: "7 open, 8 closed" },
  { label: "Supplier Quality", value: "94.5%", icon: Truck, color: "text-indigo-600", bg: "bg-indigo-100", sub: "Avg. score across vendors" },
  { label: "Audit Score", value: "96.8%", icon: Award, color: "text-emerald-600", bg: "bg-emerald-100", sub: "Last external audit" },
];

const inspections = [
  { id: "INS-2601", type: "Incoming", product: "Steel Rod 12mm", lot: "LOT-4410", inspector: "Maria Chen", date: "Apr 2, 2026", sampleSize: 50, defects: 0, result: "Pass", aql: "1.0" },
  { id: "INS-2602", type: "In-Process", product: "Hydraulic Valve Assembly", lot: "LOT-4411", inspector: "James Park", date: "Apr 2, 2026", sampleSize: 32, defects: 1, result: "Pass", aql: "2.5" },
  { id: "INS-2603", type: "Final", product: "Bearing Housing Unit", lot: "LOT-4398", inspector: "Sarah Okafor", date: "Apr 1, 2026", sampleSize: 80, defects: 3, result: "Fail", aql: "1.0" },
  { id: "INS-2604", type: "Incoming", product: "Aluminum Sheet 3mm", lot: "LOT-4412", inspector: "David Kim", date: "Apr 1, 2026", sampleSize: 25, defects: 0, result: "Pass", aql: "1.5" },
  { id: "INS-2605", type: "In-Process", product: "Gearbox Casing", lot: "LOT-4399", inspector: "Maria Chen", date: "Mar 31, 2026", sampleSize: 20, defects: 0, result: "Pass", aql: "1.0" },
  { id: "INS-2606", type: "Final", product: "Control Panel PCB", lot: "LOT-4400", inspector: "James Park", date: "Mar 31, 2026", sampleSize: 125, defects: 2, result: "Pass", aql: "2.5" },
  { id: "INS-2607", type: "Incoming", product: "Copper Wire 2.5mm", lot: "LOT-4413", inspector: "Sarah Okafor", date: "Mar 30, 2026", sampleSize: 40, defects: 1, result: "Pass", aql: "2.5" },
  { id: "INS-2608", type: "In-Process", product: "Turbine Blade Forging", lot: "LOT-4401", inspector: "David Kim", date: "Mar 30, 2026", sampleSize: 10, defects: 0, result: "Pass", aql: "0.65" },
  { id: "INS-2609", type: "Final", product: "Pneumatic Cylinder", lot: "LOT-4402", inspector: "Maria Chen", date: "Mar 29, 2026", sampleSize: 60, defects: 4, result: "Fail", aql: "1.0" },
  { id: "INS-2610", type: "Incoming", product: "Stainless Fastener Kit", lot: "LOT-4414", inspector: "James Park", date: "Mar 29, 2026", sampleSize: 200, defects: 1, result: "Pass", aql: "2.5" },
];

const initialNcrs = [
  { id: "NCR-0458", date: "Apr 1, 2026", product: "Bearing Housing Unit", desc: "OD out of tolerance by +0.15mm on 3 units", source: "Final Inspection", severity: "Major", rootCause: "Tool wear on CNC lathe #7", status: "Open", owner: "Tom Bradley", cost: "$4,200" },
  { id: "NCR-0457", date: "Mar 30, 2026", product: "Pneumatic Cylinder", desc: "Seal groove depth insufficient causing leakage", source: "Final Inspection", severity: "Critical", rootCause: "Incorrect program revision loaded", status: "Containment", owner: "Sarah Okafor", cost: "$8,750" },
  { id: "NCR-0456", date: "Mar 28, 2026", product: "Control Panel PCB", desc: "Solder bridging on J4 connector - 2 boards", source: "In-Process", severity: "Minor", rootCause: "Stencil aperture oversized", status: "Closed", owner: "James Park", cost: "$320" },
  { id: "NCR-0455", date: "Mar 25, 2026", product: "Hydraulic Valve Assembly", desc: "Hardness below spec on valve seat", source: "Lab Testing", severity: "Major", rootCause: "Heat treatment furnace temp drift", status: "CAPA Issued", owner: "Maria Chen", cost: "$6,100" },
  { id: "NCR-0454", date: "Mar 22, 2026", product: "Gearbox Casing", desc: "Porosity detected via X-ray on 1 casting", source: "NDT", severity: "Major", rootCause: "Gas entrapment during pour", status: "Closed", owner: "David Kim", cost: "$2,800" },
  { id: "NCR-0453", date: "Mar 18, 2026", product: "Steel Rod 12mm", desc: "Material certificate mismatch - wrong heat number", source: "Incoming", severity: "Minor", rootCause: "Supplier documentation error", status: "Closed", owner: "Tom Bradley", cost: "$150" },
  { id: "NCR-0452", date: "Mar 15, 2026", product: "Turbine Blade Forging", desc: "Surface crack detected during FPI", source: "NDT", severity: "Critical", rootCause: "Forging temperature too low", status: "CAPA Issued", owner: "Sarah Okafor", cost: "$12,400" },
  { id: "NCR-0451", date: "Mar 12, 2026", product: "Aluminum Sheet 3mm", desc: "Thickness variation exceeding +/- 0.05mm", source: "Incoming", severity: "Minor", rootCause: "Supplier rolling process variation", status: "Closed", owner: "David Kim", cost: "$480" },
];

const capas = [
  { id: "CAPA-0112", type: "Corrective", sourceNcr: "NCR-0457", desc: "Implement program version control for CNC machines", method: "Poka-yoke barcode verification system", due: "Apr 30, 2026", status: "In Progress", effectiveness: "Pending" },
  { id: "CAPA-0111", type: "Preventive", sourceNcr: "NCR-0455", desc: "Install redundant thermocouple on furnace #3", method: "Equipment modification and calibration", due: "Apr 25, 2026", status: "In Progress", effectiveness: "Pending" },
  { id: "CAPA-0110", type: "Corrective", sourceNcr: "NCR-0452", desc: "Revise forging temperature control procedure", method: "Process parameter update and operator retraining", due: "Apr 15, 2026", status: "In Progress", effectiveness: "Pending" },
  { id: "CAPA-0109", type: "Preventive", sourceNcr: "NCR-0458", desc: "Implement tool life management system", method: "Automated tool change based on cycle count", due: "May 10, 2026", status: "Planning", effectiveness: "Pending" },
  { id: "CAPA-0108", type: "Corrective", sourceNcr: "NCR-0456", desc: "Replace solder paste stencils for PCB line", method: "New stencil design with optimized apertures", due: "Mar 28, 2026", status: "Completed", effectiveness: "Effective" },
  { id: "CAPA-0107", type: "Preventive", sourceNcr: "N/A", desc: "Upgrade incoming inspection sampling plan", method: "Switch to ANSI/ASQ Z1.4 tightened inspection", due: "Mar 20, 2026", status: "Completed", effectiveness: "Effective" },
  { id: "CAPA-0106", type: "Corrective", sourceNcr: "NCR-0454", desc: "Revise casting pour procedure for gearbox housings", method: "Degassing step added, pour rate reduced", due: "Mar 15, 2026", status: "Completed", effectiveness: "Monitoring" },
  { id: "CAPA-0105", type: "Preventive", sourceNcr: "N/A", desc: "Annual calibration program overhaul", method: "New CMMS-based scheduling with auto-alerts", due: "Feb 28, 2026", status: "Completed", effectiveness: "Effective" },
];

const standards = [
  { name: "ISO 9001:2015", desc: "Quality Management Systems", status: "Certified", expiry: "Sep 14, 2027", registrar: "BSI Group", scope: "Design, manufacture, and distribution of precision-engineered components", lastAudit: "Sep 14, 2025", icon: ShieldCheck },
  { name: "ISO 14001:2015", desc: "Environmental Management Systems", status: "Certified", expiry: "Nov 3, 2027", registrar: "DNV GL", scope: "Environmental management of all manufacturing operations", lastAudit: "Nov 3, 2025", icon: FlaskConical },
  { name: "ISO 45001:2018", desc: "Occupational Health & Safety", status: "Certified", expiry: "Jun 22, 2027", registrar: "TUV Rheinland", scope: "OH&S management for all facilities and personnel", lastAudit: "Jun 22, 2025", icon: ShieldCheck },
  { name: "IATF 16949:2016", desc: "Automotive Quality Management", status: "Certified", expiry: "Mar 8, 2027", registrar: "IATF", scope: "Automotive component manufacturing and supply", lastAudit: "Mar 8, 2025", icon: Award },
  { name: "AS9100D", desc: "Aerospace Quality Management", status: "Certified", expiry: "Jan 19, 2028", registrar: "SAI Global", scope: "Aerospace-grade forging and machining operations", lastAudit: "Jan 19, 2026", icon: Award },
  { name: "GMP", desc: "Good Manufacturing Practice", status: "Compliant", expiry: "Dec 1, 2026", registrar: "FDA (21 CFR Part 820)", scope: "Medical device sub-component manufacturing", lastAudit: "Dec 1, 2025", icon: CheckCircle2 },
];

const spcProcesses = [
  { name: "CNC Lathe OD Turning", parameter: "Outside Diameter", nominal: "25.000 mm", usl: "25.050 mm", lsl: "24.950 mm", cp: 1.67, cpk: 1.52, mean: "25.008 mm", sigma: "0.010 mm", status: "Capable" },
  { name: "Heat Treatment Hardness", parameter: "Rockwell C Hardness", nominal: "58 HRC", usl: "62 HRC", lsl: "56 HRC", cp: 2.01, cpk: 1.85, mean: "58.3 HRC", sigma: "0.50 HRC", status: "Capable" },
  { name: "PCB Solder Paste Volume", parameter: "Paste Deposit Volume", nominal: "0.40 mm\u00B3", usl: "0.52 mm\u00B3", lsl: "0.28 mm\u00B3", cp: 1.33, cpk: 1.18, mean: "0.42 mm\u00B3", sigma: "0.030 mm\u00B3", status: "Marginal" },
  { name: "Surface Roughness - Grinding", parameter: "Ra Surface Finish", nominal: "0.8 \u03BCm", usl: "1.6 \u03BCm", lsl: "0.2 \u03BCm", cp: 1.89, cpk: 1.71, mean: "0.85 \u03BCm", sigma: "0.123 \u03BCm", status: "Capable" },
];

const suppliers = [
  { name: "Apex Steel Corp", rating: "A", score: 97.2, delivery: 99.1, ppm: 120, lastAudit: "Jan 15, 2026", status: "Approved" },
  { name: "Pacific Alloys Ltd", rating: "A", score: 95.8, delivery: 98.4, ppm: 180, lastAudit: "Feb 10, 2026", status: "Approved" },
  { name: "TechComp Electronics", rating: "B", score: 91.3, delivery: 94.7, ppm: 450, lastAudit: "Dec 5, 2025", status: "Conditional" },
  { name: "Global Fasteners Inc", rating: "A", score: 96.1, delivery: 99.5, ppm: 95, lastAudit: "Mar 1, 2026", status: "Approved" },
  { name: "Precision Castings Co", rating: "B", score: 89.4, delivery: 92.1, ppm: 620, lastAudit: "Nov 20, 2025", status: "Conditional" },
  { name: "Nordic Wire Solutions", rating: "A", score: 94.9, delivery: 97.8, ppm: 210, lastAudit: "Jan 28, 2026", status: "Approved" },
  { name: "Southern Polymers Ltd", rating: "C", score: 82.5, delivery: 88.3, ppm: 1100, lastAudit: "Oct 15, 2025", status: "Probation" },
  { name: "Rhine Chemical GmbH", rating: "A", score: 98.0, delivery: 99.8, ppm: 45, lastAudit: "Feb 22, 2026", status: "Preferred" },
];

const qualityDocs = [
  { id: "QMS-001", title: "Quality Management Manual", type: "Manual", revision: "Rev 12", date: "Jan 10, 2026", status: "Active", owner: "Quality Director" },
  { id: "QMS-002", title: "Incoming Inspection Procedure", type: "Procedure", revision: "Rev 8", date: "Feb 15, 2026", status: "Active", owner: "QC Manager" },
  { id: "QMS-003", title: "Nonconformance Control Procedure", type: "Procedure", revision: "Rev 6", date: "Mar 1, 2026", status: "Active", owner: "QA Engineer" },
  { id: "QMS-004", title: "CAPA Management Procedure", type: "Procedure", revision: "Rev 5", date: "Dec 20, 2025", status: "Active", owner: "QA Manager" },
  { id: "QMS-005", title: "Calibration Control Policy", type: "Policy", revision: "Rev 4", date: "Nov 5, 2025", status: "Active", owner: "Metrology Lead" },
  { id: "QMS-006", title: "Supplier Quality Requirements", type: "Specification", revision: "Rev 7", date: "Jan 25, 2026", status: "Active", owner: "SQE Manager" },
  { id: "QMS-007", title: "Statistical Process Control Guide", type: "Work Instruction", revision: "Rev 3", date: "Oct 12, 2025", status: "Under Review", owner: "QA Engineer" },
  { id: "QMS-008", title: "Internal Audit Procedure", type: "Procedure", revision: "Rev 9", date: "Mar 15, 2026", status: "Active", owner: "Audit Lead" },
  { id: "QMS-009", title: "Management Review Procedure", type: "Procedure", revision: "Rev 5", date: "Feb 1, 2026", status: "Active", owner: "Quality Director" },
  { id: "QMS-010", title: "Control of Documented Information", type: "Procedure", revision: "Rev 7", date: "Mar 20, 2026", status: "Draft", owner: "Document Controller" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function severityBadge(sev: string) {
  switch (sev) {
    case "Critical": return <Badge variant="destructive">{sev}</Badge>;
    case "Major": return <Badge variant="default">{sev}</Badge>;
    case "Minor": return <Badge variant="secondary">{sev}</Badge>;
    default: return <Badge variant="outline">{sev}</Badge>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "Open":
    case "Probation": return <Badge variant="destructive">{status}</Badge>;
    case "Containment":
    case "In Progress":
    case "Conditional":
    case "Planning":
    case "Under Review":
    case "Draft": return <Badge variant="default">{status}</Badge>;
    case "Closed":
    case "Completed":
    case "Approved":
    case "Preferred":
    case "Active": return <Badge variant="secondary">{status}</Badge>;
    case "CAPA Issued":
    case "Monitoring": return <Badge variant="outline">{status}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function resultBadge(result: string) {
  return result === "Pass"
    ? <Badge variant="secondary">{result}</Badge>
    : <Badge variant="destructive">{result}</Badge>;
}

function capabilityColor(cpk: number) {
  if (cpk >= 1.67) return "text-green-600";
  if (cpk >= 1.33) return "text-amber-600";
  return "text-red-600";
}

// ─── Page ──────────────────────────────────────────────────────────────────

const ncrFormFields: EntityField[] = [
  { name: "product", label: "Product", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea", required: true, fullWidth: true },
  { name: "source", label: "Source", type: "select", options: [
    { label: "Final Inspection", value: "Final Inspection" }, { label: "In-Process", value: "In-Process" },
    { label: "Incoming", value: "Incoming" }, { label: "Lab Testing", value: "Lab Testing" },
    { label: "NDT", value: "NDT" }, { label: "Customer", value: "Customer" },
  ]},
  { name: "severity", label: "Severity", type: "select", options: [
    { label: "Critical", value: "Critical" }, { label: "Major", value: "Major" }, { label: "Minor", value: "Minor" },
  ]},
  { name: "rootCause", label: "Root Cause", type: "text", fullWidth: true },
  { name: "owner", label: "Owner", type: "text", required: true },
  { name: "cost", label: "Estimated Cost ($)", type: "text" },
];

export default function QAQCPage() {
  const [search, setSearch] = useState("");
  const [editingNcr, setEditingNcr] = useState<typeof initialNcrs[0] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ncrs, setNcrs] = useState(initialNcrs);
  const [ncrFilters, setNcrFilters] = useState<FilterState>({});

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QA/QC Department</h1>
          <p className="text-muted-foreground">Quality assurance, inspection management, and compliance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button onClick={() => { setEditingNcr(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" />New NCR</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="ncr">NCR</TabsTrigger>
          <TabsTrigger value="capa">CAPA</TabsTrigger>
          <TabsTrigger value="standards">Standards</TabsTrigger>
          <TabsTrigger value="spc">SPC</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Quality</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* ── Dashboard ────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
                  <div className={`${k.bg} ${k.color} rounded-md p-2`}>
                    <k.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{k.value}</div>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Inspections ──────────────────────────────────────────────── */}
        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Log</CardTitle>
              <CardDescription>Recent quality inspections across all stages</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "product", label: "Product" },
                  { key: "lot", label: "Lot", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "inspector", label: "Inspector" },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                  { key: "sampleSize", label: "Sample" },
                  { key: "defects", label: "Defects" },
                  { key: "result", label: "Result", render: (v: string) => resultBadge(v) },
                  { key: "aql", label: "AQL" },
                ] as Column<Record<string, unknown>>[]}
                data={inspections as unknown as Record<string, unknown>[]}
                
                emptyMessage="No inspections found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NCR ──────────────────────────────────────────────────────── */}
        <TabsContent value="ncr" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search NCRs..."
            searchValue={ncrFilters._search ?? ""}
            onSearchChange={(v) => setNcrFilters(prev => ({ ...prev, _search: v }))}
            fields={[
              { key: "severity", label: "Severity", type: "select", options: [
                { label: "Critical", value: "Critical" }, { label: "Major", value: "Major" }, { label: "Minor", value: "Minor" },
              ]},
              { key: "status", label: "Status", type: "select", options: [
                { label: "Open", value: "Open" }, { label: "Containment", value: "Containment" },
                { label: "CAPA Issued", value: "CAPA Issued" }, { label: "Closed", value: "Closed" },
              ]},
            ]}
            values={ncrFilters}
            onChange={(k, v) => setNcrFilters(f => ({ ...f, [k]: v }))}
            rightSlot={<Button size="sm" onClick={() => { setEditingNcr(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" />Add NCR</Button>}
          />
          <Card>
            <CardHeader>
              <CardTitle>Nonconformance Reports</CardTitle>
              <CardDescription>Track and resolve product and process nonconformances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                  { key: "product", label: "Product" },
                  { key: "desc", label: "Description", render: (v: string) => <span className="max-w-[200px] truncate block">{v}</span> },
                  { key: "source", label: "Source", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "severity", label: "Severity", render: (v: string) => severityBadge(v) },
                  { key: "status", label: "Status", render: (v: string) => statusBadge(v) },
                  { key: "owner", label: "Owner" },
                  { key: "cost", label: "Cost", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                    const n = row as unknown as typeof ncrs[0];
                    const flow: Record<string, string> = { "Open": "Containment", "Containment": "CAPA Issued", "CAPA Issued": "Closed" };
                    const next = flow[n.status];
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditingNcr(n); setShowForm(true); }}
                        onDelete={() => setNcrs(prev => prev.filter(x => x.id !== n.id))}
                        itemLabel={n.id}
                        extraItems={next ? [{ label: `→ ${next}`, onClick: () => setNcrs(prev => prev.map(x => x.id === n.id ? { ...x, status: next } : x)) }] : []}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={ncrs
                  .filter(n => !ncrFilters._search || n.id.toLowerCase().includes(ncrFilters._search.toLowerCase()) || n.product.toLowerCase().includes(ncrFilters._search.toLowerCase()))
                  .filter(n => !ncrFilters.severity || n.severity === ncrFilters.severity)
                  .filter(n => !ncrFilters.status || n.status === ncrFilters.status) as unknown as Record<string, unknown>[]}
                
                emptyMessage="No NCRs found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CAPA ─────────────────────────────────────────────────────── */}
        <TabsContent value="capa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Corrective & Preventive Actions</CardTitle>
              <CardDescription>CAPA tracking for systemic quality improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant={v === "Corrective" ? "default" : "secondary"}>{v}</Badge> },
                  { key: "sourceNcr", label: "Source NCR", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "desc", label: "Description", render: (v: string) => <span className="max-w-[220px] truncate block">{v}</span> },
                  { key: "method", label: "Method", render: (v: string) => <span className="max-w-[200px] truncate block">{v}</span> },
                  { key: "due", label: "Due Date", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => statusBadge(v) },
                  { key: "effectiveness", label: "Effectiveness", render: (v: string) => (
                    <Badge variant={v === "Effective" ? "secondary" : v === "Monitoring" ? "outline" : "default"}>{v}</Badge>
                  )},
                ] as Column<Record<string, unknown>>[]}
                data={capas as unknown as Record<string, unknown>[]}
                
                emptyMessage="No CAPA items found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Standards ────────────────────────────────────────────────── */}
        <TabsContent value="standards" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {standards.map((s) => (
              <Card key={s.name}>
                <CardHeader className="flex flex-row items-start gap-3">
                  <div className="rounded-md bg-blue-100 p-2 text-blue-600">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <CardDescription>{s.desc}</CardDescription>
                  </div>
                  <Badge variant={s.status === "Certified" ? "secondary" : "outline"}>{s.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Registrar</span><span className="font-medium">{s.registrar}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Expiry</span><span className="font-medium">{s.expiry}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Audit</span><span className="font-medium">{s.lastAudit}</span></div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">{s.scope}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── SPC ──────────────────────────────────────────────────────── */}
        <TabsContent value="spc" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {spcProcesses.map((p) => (
              <Card key={p.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Badge variant={p.status === "Capable" ? "secondary" : "default"}>{p.status}</Badge>
                  </div>
                  <CardDescription>{p.parameter}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nominal</p>
                      <p className="font-medium">{p.nominal}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">USL</p>
                      <p className="font-medium">{p.usl}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">LSL</p>
                      <p className="font-medium">{p.lsl}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm border-t pt-3">
                    <div>
                      <p className="text-muted-foreground">Cp</p>
                      <p className={`font-bold ${capabilityColor(p.cp)}`}>{p.cp.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cpk</p>
                      <p className={`font-bold ${capabilityColor(p.cpk)}`}>{p.cpk.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mean</p>
                      <p className="font-medium">{p.mean}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sigma</p>
                      <p className="font-medium">{p.sigma}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Supplier Quality ─────────────────────────────────────────── */}
        <TabsContent value="supplier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Quality Scorecard</CardTitle>
              <CardDescription>Vendor performance ratings and audit status</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "name", label: "Supplier", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "rating", label: "Rating", render: (v: string) => <Badge variant={v === "A" ? "secondary" : v === "B" ? "default" : "destructive"}>{v}</Badge> },
                  { key: "score", label: "Quality Score", render: (v: number) => <>{v}%</> },
                  { key: "delivery", label: "Delivery %", render: (v: number) => <>{v}%</> },
                  { key: "ppm", label: "PPM" },
                  { key: "lastAudit", label: "Last Audit", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => statusBadge(v) },
                ] as Column<Record<string, unknown>>[]}
                data={suppliers as unknown as Record<string, unknown>[]}
                
                emptyMessage="No suppliers found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Documents ────────────────────────────────────────────────── */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Documentation</CardTitle>
              <CardDescription>Controlled documents, procedures, and work instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "Doc ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "title", label: "Title", render: (v: string) => <span className="font-medium">{v}</span> },
                  { key: "type", label: "Type", render: (v: string) => <Badge variant="outline">{v}</Badge> },
                  { key: "revision", label: "Revision", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                  { key: "date", label: "Date", render: (v: string) => <span className="text-muted-foreground">{v}</span> },
                  { key: "status", label: "Status", render: (v: string) => statusBadge(v) },
                  { key: "owner", label: "Owner" },
                ] as Column<Record<string, unknown>>[]}
                data={qualityDocs as unknown as Record<string, unknown>[]}
                emptyMessage="No documents found."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditingNcr(null); }}
        title={editingNcr ? `Edit ${editingNcr.id}` : "New Nonconformance Report"}
        description={editingNcr ? undefined : "Log a new NCR for tracking and resolution."}
        fields={ncrFormFields}
        initialData={editingNcr ? {
          product: editingNcr.product,
          description: editingNcr.desc,
          source: editingNcr.source,
          severity: editingNcr.severity,
          rootCause: editingNcr.rootCause,
          owner: editingNcr.owner,
          cost: editingNcr.cost,
        } : undefined}
        submitLabel={editingNcr ? "Update" : "Create NCR"}
        onSubmit={(data) => {
          if (editingNcr) {
            setNcrs(prev => prev.map(n => n.id === editingNcr.id ? {
              ...n,
              product: String(data.product),
              desc: String(data.description),
              source: String(data.source) || n.source,
              severity: String(data.severity) || n.severity,
              rootCause: String(data.rootCause) || n.rootCause,
              owner: String(data.owner),
              cost: String(data.cost) || n.cost,
            } : n));
          } else {
            const id = `NCR-${String(ncrs.length + 458).padStart(4, "0")}`;
            const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            setNcrs([{
              id,
              date: today,
              product: String(data.product),
              desc: String(data.description),
              source: String(data.source) || "Final Inspection",
              severity: String(data.severity) || "Minor",
              rootCause: String(data.rootCause) || "Pending investigation",
              status: "Open",
              owner: String(data.owner),
              cost: String(data.cost) || "$0",
            }, ...ncrs]);
          }
        }}
      />
    </div>
  );
}
