"use client";

import { useState } from "react";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, AlertTriangle, FileText, ClipboardList, GraduationCap,
  Lock, Phone, Search, Plus, Eye, Calendar, Users, Clock, CheckCircle2,
  XCircle, Flame, HardHat, Activity, Heart, Siren, MapPin, Megaphone,
  ThermometerSun, Zap, Radio, ArrowUp, ArrowRight, ArrowDown,
} from "lucide-react";

// ─── Data ──────────────────────────────────────────────────────────────────

const kpis = [
  { label: "Total Incidents", value: "0", icon: AlertTriangle, color: "text-green-600", bg: "bg-green-100", sub: "This month" },
  { label: "Days Without Incident", value: "145", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", sub: "Record: 203" },
  { label: "Safety Score", value: "98.7%", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-100", sub: "+2.1% from last quarter" },
  { label: "Open Investigations", value: "3", icon: Eye, color: "text-amber-600", bg: "bg-amber-100", sub: "2 pending closure" },
  { label: "Training Compliance", value: "96.2%", icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-100", sub: "Target: 95%" },
  { label: "Near Misses", value: "7", icon: Activity, color: "text-orange-500", bg: "bg-orange-100", sub: "Down from 12 last month" },
];

const incidents = [
  { id: "INC-001", date: "Apr 1, 2026", type: "Near Miss", location: "Warehouse B", severity: "Low", status: "Closed", assignee: "Mike Torres", desc: "Forklift near-miss in aisle 4" },
  { id: "INC-002", date: "Mar 28, 2026", type: "Injury", location: "Manufacturing Floor", severity: "Medium", status: "Investigating", assignee: "Sarah Lin", desc: "Minor hand laceration from sheet metal" },
  { id: "INC-003", date: "Mar 25, 2026", type: "Property Damage", location: "Loading Dock", severity: "Low", status: "Resolved", assignee: "James Cole", desc: "Pallet rack damaged by forklift" },
  { id: "INC-004", date: "Mar 20, 2026", type: "Environmental", location: "Lab 3", severity: "Medium", status: "Investigating", assignee: "Dr. Patel", desc: "Chemical spill - 2L solvent contained" },
  { id: "INC-005", date: "Mar 15, 2026", type: "Near Miss", location: "Office 2nd Floor", severity: "Low", status: "Closed", assignee: "Rachel Kim", desc: "Wet floor slip hazard unreported" },
  { id: "INC-006", date: "Mar 10, 2026", type: "Fire", location: "Electrical Room", severity: "High", status: "Resolved", assignee: "David Okonkwo", desc: "Electrical panel overheating detected" },
  { id: "INC-007", date: "Mar 5, 2026", type: "Injury", location: "Warehouse A", severity: "Low", status: "Closed", assignee: "Mike Torres", desc: "Back strain from improper lifting" },
  { id: "INC-008", date: "Feb 28, 2026", type: "Near Miss", location: "Parking Lot", severity: "Low", status: "Closed", assignee: "James Cole", desc: "Vehicle-pedestrian near miss at gate 3" },
];

const risks = [
  { id: "RSK-001", category: "Chemical", desc: "Exposure to volatile organic compounds in paint shop", likelihood: 3, impact: 4, mitigation: "Install ventilation, PPE mandatory, air monitoring", status: "Active", owner: "Dr. Patel" },
  { id: "RSK-002", category: "Physical", desc: "Noise exposure exceeding 85dB in stamping area", likelihood: 4, impact: 3, mitigation: "Hearing protection, noise barriers, rotation policy", status: "Active", owner: "Mike Torres" },
  { id: "RSK-003", category: "Ergonomic", desc: "Repetitive strain injuries in assembly line", likelihood: 3, impact: 3, mitigation: "Job rotation, ergonomic workstations, breaks", status: "Active", owner: "Sarah Lin" },
  { id: "RSK-004", category: "Biological", desc: "Legionella risk in cooling tower water systems", likelihood: 2, impact: 5, mitigation: "Water treatment, quarterly testing, maintenance", status: "Monitoring", owner: "David Okonkwo" },
  { id: "RSK-005", category: "Physical", desc: "Fall from height during roof maintenance", likelihood: 2, impact: 5, mitigation: "Fall arrest systems, permits, certified workers", status: "Active", owner: "James Cole" },
  { id: "RSK-006", category: "Chemical", desc: "Compressed gas cylinder storage and handling", likelihood: 2, impact: 4, mitigation: "Chain storage, ventilation, handling training", status: "Active", owner: "Dr. Patel" },
  { id: "RSK-007", category: "Psychosocial", desc: "Workplace stress from shift work patterns", likelihood: 3, impact: 2, mitigation: "Shift rotation policy, EAP, wellness programs", status: "Monitoring", owner: "Rachel Kim" },
  { id: "RSK-008", category: "Ergonomic", desc: "Manual handling injuries in warehouse operations", likelihood: 4, impact: 3, mitigation: "Mechanical aids, training, weight limits", status: "Active", owner: "Mike Torres" },
];

const inspections = [
  { id: "INS-001", type: "Fire Safety", area: "Building A - All Floors", inspector: "Fire Marshal Davis", date: "Mar 28, 2026", findings: 2, status: "Passed", followUp: "Replace 2 extinguishers Bldg A-3F" },
  { id: "INS-002", type: "Equipment", area: "Manufacturing Floor", inspector: "Mike Torres", date: "Mar 25, 2026", findings: 5, status: "Partial", followUp: "Guard missing on press #4, replace belt on conveyor #7" },
  { id: "INS-003", type: "Workplace", area: "Office Complex", inspector: "Rachel Kim", date: "Mar 20, 2026", findings: 1, status: "Passed", followUp: "Fix emergency lighting in stairwell B" },
  { id: "INS-004", type: "Environmental", area: "Wastewater Treatment", inspector: "Dr. Patel", date: "Mar 15, 2026", findings: 0, status: "Passed", followUp: "None required" },
  { id: "INS-005", type: "PPE", area: "All Production Areas", inspector: "Sarah Lin", date: "Mar 10, 2026", findings: 8, status: "Failed", followUp: "Replace worn safety glasses (12), restock gloves" },
  { id: "INS-006", type: "Fire Safety", area: "Warehouse B", inspector: "Fire Marshal Davis", date: "Mar 5, 2026", findings: 3, status: "Partial", followUp: "Clear blocked fire exits, test sprinkler zone 3" },
];

const trainings = [
  { name: "Fire Safety & Evacuation", desc: "Fire prevention, extinguisher use, evacuation procedures", type: "Mandatory", completion: 98, due: "Apr 15, 2026", participants: 156, status: "Active" },
  { name: "First Aid & CPR", desc: "Basic first aid, CPR/AED certification, emergency response", type: "Mandatory", completion: 94, due: "May 1, 2026", participants: 156, status: "Active" },
  { name: "Chemical Handling (HAZMAT)", desc: "SDS reading, spill response, PPE for chemicals", type: "Mandatory", completion: 89, due: "Apr 30, 2026", participants: 45, status: "Active" },
  { name: "PPE Usage & Selection", desc: "Proper selection, fitting, inspection and use of PPE", type: "Mandatory", completion: 96, due: "Apr 20, 2026", participants: 120, status: "Active" },
  { name: "Confined Space Entry", desc: "Permit procedures, atmospheric testing, rescue plans", type: "Mandatory", completion: 82, due: "May 15, 2026", participants: 28, status: "Active" },
  { name: "Working at Heights", desc: "Fall protection systems, ladder safety, scaffold inspection", type: "Mandatory", completion: 91, due: "Apr 25, 2026", participants: 35, status: "Active" },
  { name: "Electrical Safety (LOTO)", desc: "Lockout/tagout procedures, arc flash awareness", type: "Mandatory", completion: 87, due: "May 10, 2026", participants: 42, status: "Active" },
  { name: "Ergonomics Awareness", desc: "Workstation setup, lifting techniques, break stretches", type: "Optional", completion: 72, due: "Jun 1, 2026", participants: 156, status: "Active" },
];

const permits = [
  { id: "WP-001", type: "Hot Work", location: "Warehouse B - Roof", requestor: "James Cole", approver: "Mike Torres", validFrom: "Apr 3, 2026", validTo: "Apr 3, 2026", status: "Active", conditions: "Fire watch required, extinguisher within 10m" },
  { id: "WP-002", type: "Confined Space", location: "Tank Farm - Tank 4", requestor: "David Okonkwo", approver: "Dr. Patel", validFrom: "Apr 4, 2026", validTo: "Apr 4, 2026", status: "Pending", conditions: "Atmospheric testing, rescue team standby" },
  { id: "WP-003", type: "Heights", location: "Building A - Roof", requestor: "Sarah Lin", approver: "Mike Torres", validFrom: "Apr 1, 2026", validTo: "Apr 2, 2026", status: "Expired", conditions: "Fall arrest required, weather check" },
  { id: "WP-004", type: "Electrical", location: "Substation 2", requestor: "Tech Team", approver: "David Okonkwo", validFrom: "Apr 5, 2026", validTo: "Apr 5, 2026", status: "Pending", conditions: "LOTO verified, arc flash PPE required" },
  { id: "WP-005", type: "Excavation", location: "Parking Lot Extension", requestor: "Contractor ABC", approver: "James Cole", validFrom: "Mar 25, 2026", validTo: "Apr 10, 2026", status: "Active", conditions: "Utility marking complete, shoring required >4ft" },
  { id: "WP-006", type: "Hot Work", location: "Manufacturing - Welding Bay", requestor: "Mike Torres", approver: "Sarah Lin", validFrom: "Mar 28, 2026", validTo: "Mar 28, 2026", status: "Expired", conditions: "Standard welding bay procedures" },
];

const emergencyContacts = [
  { name: "Fire Department", number: "911 / (555) 234-5678", icon: Flame, color: "text-red-600", bg: "bg-red-100" },
  { name: "Medical Emergency", number: "911 / (555) 345-6789", icon: Heart, color: "text-pink-600", bg: "bg-pink-100" },
  { name: "Police / Security", number: "911 / (555) 456-7890", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-100" },
  { name: "Environmental Spill", number: "(555) 567-8901", icon: ThermometerSun, color: "text-green-600", bg: "bg-green-100" },
  { name: "Internal Emergency Team", number: "Ext. 1111", icon: Siren, color: "text-amber-600", bg: "bg-amber-100" },
  { name: "Poison Control", number: "(800) 222-1222", icon: AlertTriangle, color: "text-purple-600", bg: "bg-purple-100" },
];

const emergencyEquipment = [
  { name: "Fire Extinguishers", count: 48, lastInspection: "Mar 15, 2026", nextInspection: "Sep 15, 2026" },
  { name: "AED Units", count: 8, lastInspection: "Feb 1, 2026", nextInspection: "Aug 1, 2026" },
  { name: "First Aid Kits", count: 24, lastInspection: "Mar 1, 2026", nextInspection: "Jun 1, 2026" },
  { name: "Eye Wash Stations", count: 12, lastInspection: "Mar 10, 2026", nextInspection: "Jun 10, 2026" },
  { name: "Spill Kits", count: 16, lastInspection: "Feb 20, 2026", nextInspection: "May 20, 2026" },
  { name: "Emergency Showers", count: 6, lastInspection: "Mar 5, 2026", nextInspection: "Jun 5, 2026" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const sevColor: Record<string, string> = { Critical: "bg-red-600", High: "bg-orange-500", Medium: "bg-blue-500", Low: "bg-gray-400" };
const sevBadge: Record<string, "destructive" | "default" | "secondary"> = { Critical: "destructive", High: "destructive", Medium: "default", Low: "secondary" };
const statusColor: Record<string, "default" | "destructive" | "secondary" | "outline"> = { Open: "destructive", Investigating: "default", Resolved: "secondary", Closed: "outline", Active: "default", Monitoring: "secondary", Passed: "default", Failed: "destructive", Partial: "secondary", Pending: "secondary", Expired: "outline", Revoked: "destructive" };

function riskScore(l: number, i: number) {
  const s = l * i;
  if (s >= 15) return { score: s, color: "bg-red-600 text-white" };
  if (s >= 10) return { score: s, color: "bg-orange-500 text-white" };
  if (s >= 5) return { score: s, color: "bg-yellow-400 text-black" };
  return { score: s, color: "bg-green-500 text-white" };
}

// ─── Page ──────────────────────────────────────────────────────────────────

const incidentFields: EntityField[] = [
  { name: "type", label: "Incident Type", type: "select", required: true, options: [
    { label: "Injury", value: "Injury" }, { label: "Near Miss", value: "Near Miss" },
    { label: "Property Damage", value: "Property Damage" }, { label: "Environmental", value: "Environmental" },
    { label: "Fire", value: "Fire" },
  ]},
  { name: "severity", label: "Severity", type: "select", required: true, options: [
    { label: "Critical", value: "Critical" }, { label: "High", value: "High" },
    { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
  ]},
  { name: "location", label: "Location", type: "text", required: true, placeholder: "e.g. Warehouse B" },
  { name: "assignee", label: "Assigned To", type: "text", required: true, placeholder: "Name" },
  { name: "desc", label: "Description", type: "textarea", required: true, fullWidth: true, placeholder: "Describe the incident..." },
];

export default function SafetyPage() {
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState<typeof incidents[0] | null>(null);
  const [incidentList, setIncidentList] = useState(incidents);
  const [incFilters, setIncFilters] = useState<FilterState>({});

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Safety Management</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Enterprise health, safety & environment (HSE) system</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingIncident(null); setShowIncidentForm(true); }}><Plus className="h-4 w-4" />Report Incident</Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="permits">Work Permits</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map(k => {
              const Icon = k.icon;
              return (
                <Card key={k.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-2xl font-bold">{k.value}</p>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${k.bg}`}><Icon className={`h-4 w-4 ${k.color}`} /></div>
                    </div>
                    <p className="text-xs font-medium">{k.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Risk Matrix */}
          <Card>
            <CardHeader><CardTitle className="text-base">Risk Matrix (Likelihood × Severity)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr><th className="p-2"></th>{["Negligible", "Minor", "Moderate", "Major", "Catastrophic"].map((h, i) => <th key={h} className="p-2 text-center font-medium">{h}<br /><span className="text-muted-foreground">({i + 1})</span></th>)}</tr></thead>
                  <tbody>
                    {["Almost Certain (5)", "Likely (4)", "Possible (3)", "Unlikely (2)", "Rare (1)"].map((row, ri) => (
                      <tr key={row}>
                        <td className="p-2 font-medium whitespace-nowrap">{row}</td>
                        {[1, 2, 3, 4, 5].map(ci => {
                          const l = 5 - ri;
                          const score = l * ci;
                          const bg = score >= 15 ? "bg-red-500 text-white" : score >= 10 ? "bg-orange-400 text-white" : score >= 5 ? "bg-yellow-300" : "bg-green-400 text-white";
                          const count = risks.filter(r => r.likelihood === l && r.impact === ci).length;
                          return <td key={ci} className={`p-2 text-center rounded ${bg}`}>{score}{count > 0 && <span className="block text-[10px] font-bold">({count})</span>}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Incidents ── */}
        <TabsContent value="incidents" className="space-y-4">
          <FilterBar
            searchPlaceholder="Search incidents..."
            searchValue={incFilters._search ?? ""}
            onSearchChange={(v) => setIncFilters(prev => ({ ...prev, _search: v }))}
            fields={[
              { key: "severity", label: "Severity", type: "select", options: [
                { label: "Critical", value: "Critical" }, { label: "High", value: "High" },
                { label: "Medium", value: "Medium" }, { label: "Low", value: "Low" },
              ]},
              { key: "status", label: "Status", type: "select", options: [
                { label: "Open", value: "Open" }, { label: "Investigating", value: "Investigating" },
                { label: "Resolved", value: "Resolved" }, { label: "Closed", value: "Closed" },
              ]},
              { key: "type", label: "Type", type: "select", options: [
                { label: "Injury", value: "Injury" }, { label: "Near Miss", value: "Near Miss" },
                { label: "Property Damage", value: "Property Damage" }, { label: "Environmental", value: "Environmental" },
                { label: "Fire", value: "Fire" },
              ]},
            ]}
            values={incFilters}
            onChange={(k, v) => setIncFilters(f => ({ ...f, [k]: v }))}
          />
          <Card><CardContent className="p-0">
            <DataTable
              columns={[
                { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "type", label: "Type", render: (v: string) => <Badge variant="outline" className="text-xs">{v}</Badge> },
                { key: "location", label: "Location", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "severity", label: "Severity", render: (v: string) => <span className="inline-flex items-center gap-1 text-xs"><span className={`h-2 w-2 rounded-full ${sevColor[v]}`} />{v}</span> },
                { key: "status", label: "Status", render: (v: string) => <Badge variant={statusColor[v] || "secondary"} className="text-xs">{v}</Badge> },
                { key: "assignee", label: "Assigned To", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "desc", label: "Description", render: (v: string) => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{v}</span> },
                { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => {
                  const inc = row as unknown as typeof incidentList[0];
                  const flow: Record<string, string> = { "Open": "Investigating", "Investigating": "Resolved", "Resolved": "Closed" };
                  const next = flow[inc.status];
                  return (
                    <EditDeleteMenu
                      onEdit={() => { setEditingIncident(inc); setShowIncidentForm(true); }}
                      onDelete={() => setIncidentList(prev => prev.filter(x => x.id !== inc.id))}
                      itemLabel={inc.id}
                      extraItems={next ? [{ label: `→ ${next}`, onClick: () => setIncidentList(prev => prev.map(x => x.id === inc.id ? { ...x, status: next } : x)) }] : []}
                    />
                  );
                }},
              ] as Column<Record<string, unknown>>[]}
              data={incidentList
                .filter(i => !incFilters._search || i.desc.toLowerCase().includes(incFilters._search.toLowerCase()) || i.id.toLowerCase().includes(incFilters._search.toLowerCase()))
                .filter(i => !incFilters.severity || i.severity === incFilters.severity)
                .filter(i => !incFilters.status || i.status === incFilters.status)
                .filter(i => !incFilters.type || i.type === incFilters.type) as unknown as Record<string, unknown>[]}
              pagination={false}
              emptyMessage="No incidents found."
            />
          </CardContent></Card>
        </TabsContent>

        {/* ── Risk Assessment ── */}
        <TabsContent value="risks" className="space-y-4">
          <Card><CardContent className="p-0">
            <DataTable
              columns={[
                { key: "id", label: "Risk ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                { key: "category", label: "Category", render: (v: string) => <Badge variant="outline" className="text-xs">{v}</Badge> },
                { key: "desc", label: "Description", render: (v: string) => <span className="text-xs max-w-[200px] block">{v}</span> },
                { key: "likelihood", label: "L", render: (v: number) => <span className="text-xs">{v}</span> },
                { key: "impact", label: "I", render: (v: number) => <span className="text-xs">{v}</span> },
                { key: "score", label: "Score", render: (_: unknown, row: Record<string, unknown>) => {
                  const r = row as unknown as typeof risks[0];
                  const rs = riskScore(r.likelihood, r.impact);
                  return <span className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-bold ${rs.color}`}>{rs.score}</span>;
                }},
                { key: "mitigation", label: "Mitigation", render: (v: string) => <span className="text-xs max-w-[200px] text-muted-foreground block">{v}</span> },
                { key: "status", label: "Status", render: (v: string) => <Badge variant={statusColor[v] || "secondary"} className="text-xs">{v}</Badge> },
                { key: "owner", label: "Owner", render: (v: string) => <span className="text-xs">{v}</span> },
              ] as Column<Record<string, unknown>>[]}
              data={risks as unknown as Record<string, unknown>[]}
              pagination={false}
              emptyMessage="No risks found."
            />
          </CardContent></Card>
        </TabsContent>

        {/* ── Inspections ── */}
        <TabsContent value="inspections" className="space-y-4">
          <Card><CardContent className="p-0">
            <DataTable
              columns={[
                { key: "id", label: "ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                { key: "type", label: "Type", render: (v: string) => <Badge variant="outline" className="text-xs">{v}</Badge> },
                { key: "area", label: "Area", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "inspector", label: "Inspector", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "date", label: "Date", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "findings", label: "Findings", render: (v: number) => <span className="text-xs">{v}</span> },
                { key: "status", label: "Status", render: (v: string) => <Badge variant={statusColor[v] || "secondary"} className="text-xs">{v}</Badge> },
                { key: "followUp", label: "Follow-up Actions", render: (v: string) => <span className="text-xs text-muted-foreground max-w-[200px] block">{v}</span> },
              ] as Column<Record<string, unknown>>[]}
              data={inspections as unknown as Record<string, unknown>[]}
              pagination={false}
              emptyMessage="No inspections found."
            />
          </CardContent></Card>
        </TabsContent>

        {/* ── Training ── */}
        <TabsContent value="training" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {trainings.map(t => (
              <Card key={t.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold leading-tight">{t.name}</CardTitle>
                    <Badge variant={t.type === "Mandatory" ? "destructive" : "secondary"} className="text-[10px] shrink-0">{t.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span>Completion</span><span className="font-medium">{t.completion}%</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${t.completion >= 95 ? "bg-green-500" : t.completion >= 80 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${t.completion}%` }} /></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{t.participants}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.due}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Work Permits ── */}
        <TabsContent value="permits" className="space-y-4">
          <Card><CardContent className="p-0">
            <DataTable
              columns={[
                { key: "id", label: "Permit ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                { key: "type", label: "Type", render: (v: string) => <Badge variant="outline" className="text-xs">{v}</Badge> },
                { key: "location", label: "Location", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "requestor", label: "Requestor", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "approver", label: "Approver", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "validFrom", label: "Valid From", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "validTo", label: "Valid To", render: (v: string) => <span className="text-xs">{v}</span> },
                { key: "status", label: "Status", render: (v: string) => <Badge variant={statusColor[v] || "secondary"} className="text-xs">{v}</Badge> },
                { key: "conditions", label: "Conditions", render: (v: string) => <span className="text-xs text-muted-foreground max-w-[200px] block">{v}</span> },
              ] as Column<Record<string, unknown>>[]}
              data={permits as unknown as Record<string, unknown>[]}
              pagination={false}
              emptyMessage="No permits found."
            />
          </CardContent></Card>
        </TabsContent>

        {/* ── Emergency ── */}
        <TabsContent value="emergency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Emergency Contacts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {emergencyContacts.map(c => {
                  const Icon = c.icon;
                  return (
                    <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.bg}`}><Icon className={`h-5 w-5 ${c.color}`} /></div>
                      <div className="flex-1"><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.number}</p></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Emergency Equipment</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    { key: "name", label: "Equipment", render: (v: string) => <span className="text-sm font-medium">{v}</span> },
                    { key: "count", label: "Count", render: (v: number) => <span className="font-bold">{v}</span> },
                    { key: "lastInspection", label: "Last Inspection", render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span> },
                    { key: "nextInspection", label: "Next Inspection", render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span> },
                  ] as Column<Record<string, unknown>>[]}
                  data={emergencyEquipment as unknown as Record<string, unknown>[]}
                  pagination={false}
                  emptyMessage="No equipment found."
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Emergency Drill Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: "Fire Evacuation Drill", date: "Apr 15, 2026", building: "All Buildings", freq: "Quarterly" },
                  { name: "Chemical Spill Drill", date: "May 1, 2026", building: "Manufacturing", freq: "Semi-Annual" },
                  { name: "Active Shooter Drill", date: "Jun 10, 2026", building: "Office Complex", freq: "Annual" },
                  { name: "Medical Emergency Drill", date: "Apr 25, 2026", building: "All Buildings", freq: "Quarterly" },
                ].map(d => (
                  <Card key={d.name}>
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Calendar className="h-3 w-3" />{d.date}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{d.building}</p>
                      <Badge variant="outline" className="text-[10px] mt-2">{d.freq}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showIncidentForm}
        onOpenChange={(v) => { setShowIncidentForm(v); if (!v) setEditingIncident(null); }}
        title={editingIncident ? `Edit ${editingIncident.id}` : "Report New Incident"}
        description={editingIncident ? undefined : "Fill out the details of the safety incident"}
        fields={incidentFields}
        initialData={editingIncident ? {
          type: editingIncident.type,
          severity: editingIncident.severity,
          location: editingIncident.location,
          assignee: editingIncident.assignee,
          desc: editingIncident.desc,
        } : undefined}
        submitLabel={editingIncident ? "Update" : "Report Incident"}
        onSubmit={(data) => {
          if (editingIncident) {
            setIncidentList(prev => prev.map(i => i.id === editingIncident.id ? {
              ...i,
              type: String(data.type),
              severity: String(data.severity),
              location: String(data.location),
              assignee: String(data.assignee),
              desc: String(data.desc),
            } : i));
          } else {
            setIncidentList(prev => [{
              id: `INC-${Date.now().toString(36)}`,
              date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              type: String(data.type),
              location: String(data.location),
              severity: String(data.severity),
              status: "Open",
              assignee: String(data.assignee),
              desc: String(data.desc),
            }, ...prev]);
          }
        }}
      />
    </div>
  );
}
