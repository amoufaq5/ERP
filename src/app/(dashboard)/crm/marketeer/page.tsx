"use client";

import { useState } from "react";
import { Users, Target, DollarSign, MapPin, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

const DISTRICTS = [
  { dm: "Hany Mansour", district: "Greater Cairo", reps: 8, doctors: 320, callRate: 88, compliance: 91, budget: "62%", rating: "A" },
  { dm: "Reem Saleh", district: "Delta Region", reps: 6, doctors: 215, callRate: 84, compliance: 87, budget: "58%", rating: "A" },
  { dm: "Tamer Wahid", district: "Upper Egypt", reps: 5, doctors: 168, callRate: 79, compliance: 82, budget: "45%", rating: "B" },
  { dm: "Lina Habib", district: "Alexandria & Coast", reps: 7, doctors: 240, callRate: 90, compliance: 93, budget: "70%", rating: "A" },
];

const TEAM_PERFORMANCE = [
  { dm: "Hany Mansour", district: "Greater Cairo", teamSize: 8, callRate: "88%", compliance: "91%", pending: 4, budget: "62%", rating: "A" },
  { dm: "Reem Saleh", district: "Delta Region", teamSize: 6, callRate: "84%", compliance: "87%", pending: 3, budget: "58%", rating: "A" },
  { dm: "Tamer Wahid", district: "Upper Egypt", teamSize: 5, callRate: "79%", compliance: "82%", pending: 5, budget: "45%", rating: "B" },
  { dm: "Lina Habib", district: "Alexandria & Coast", teamSize: 7, callRate: "90%", compliance: "93%", pending: 2, budget: "70%", rating: "A" },
];

const ESCALATED = [
  { id: "REQ-004", from: "Hany Mansour (DM)", rep: "Fatima Ali", type: "Doctor Sponsorship", description: "Dr. Walid Fathy - Int'l Oncology Congress", cost: "$3,500", recommendation: "Strongly Recommended", decision: "Pending", date: "2026-03-26" },
  { id: "REQ-010", from: "Lina Habib (DM)", rep: "Hala Samir", type: "Doctor Sponsorship", description: "Dr. Khaled - Urology Symposium", cost: "$1,800", recommendation: "Recommended", decision: "Pending", date: "2026-03-20" },
  { id: "REQ-015", from: "Reem Saleh (DM)", rep: "Mahmoud Farouk", type: "Conference Sponsorship", description: "Mansoura Medical Conference Booth", cost: "$2,200", recommendation: "Recommended", decision: "Approved", date: "2026-03-18" },
  { id: "REQ-018", from: "Tamer Wahid (DM)", rep: "Hala Samir", type: "Event Budget", description: "Upper Egypt Symposium", cost: "$2,800", recommendation: "Optional", decision: "Rejected", date: "2026-03-15" },
  { id: "REQ-021", from: "Hany Mansour (DM)", rep: "Ahmed Hassan", type: "Conference Sponsorship", description: "Cardiology Update 2026", cost: "$1,500", recommendation: "Recommended", decision: "Approved", date: "2026-03-12" },
  { id: "REQ-024", from: "Lina Habib (DM)", rep: "Sara Mohamed", type: "Doctor Sponsorship", description: "Dr. Ashraf Zaki - International Cardiology", cost: "$4,200", recommendation: "Strongly Recommended", decision: "Pending", date: "2026-03-10" },
  { id: "REQ-027", from: "Reem Saleh (DM)", rep: "Nour Ibrahim", type: "Promo Material", description: "Custom branded merchandise", cost: "$1,100", recommendation: "Recommended", decision: "Approved", date: "2026-03-08" },
  { id: "REQ-030", from: "Tamer Wahid (DM)", rep: "Karim Saeed", type: "Travel Request", description: "Multi-city KOL tour", cost: "$1,900", recommendation: "Recommended", decision: "Pending", date: "2026-03-05" },
];

const DOUBLE_VISITS = [
  { id: "MV-001", accompanied: "Hany Mansour (DM)", doctor: "Dr. Tarek Hamdy", date: "2026-03-20", purpose: "KOL Engagement", observations: "Strong supporter, suggested case study", followUp: "Send case study materials", status: "Completed" },
  { id: "MV-002", accompanied: "Lina Habib (DM)", doctor: "Dr. Ashraf Zaki", date: "2026-03-15", purpose: "New Product Launch", observations: "Very interested in new product line", followUp: "Schedule product training", status: "Completed" },
  { id: "MV-003", accompanied: "Reem Saleh (DM)", doctor: "Dr. Nada Hussein", date: "2026-03-12", purpose: "Coaching", observations: "Coached DM on key account management", followUp: "Quarterly review", status: "Completed" },
  { id: "MV-004", accompanied: "Tamer Wahid (DM)", doctor: "Dr. Khaled Adham", date: "2026-03-08", purpose: "Strategic Account", observations: "Expanding presence in region", followUp: "Increase visit frequency", status: "Completed" },
  { id: "MV-005", accompanied: "Hany Mansour (DM)", doctor: "Dr. Walid Fathy", date: "2026-03-05", purpose: "KOL Engagement", observations: "Approved for international sponsorship", followUp: "Process sponsorship", status: "Completed" },
  { id: "MV-006", accompanied: "Lina Habib (DM)", doctor: "Dr. Laila Saad", date: "2026-03-02", purpose: "Coaching", observations: "Excellent visit quality", followUp: "None", status: "Completed" },
];

const MARKET_ANALYSIS = [
  { product: "Cardizem 60mg", territory: "Greater Cairo", target: "$120K", actual: "$108K", growth: "+12%", share: "18%", competition: "Strong from generic" },
  { product: "Augmentin 625mg", territory: "Greater Cairo", target: "$180K", actual: "$192K", growth: "+18%", share: "32%", competition: "Stable" },
  { product: "Nexium 40mg", territory: "Delta Region", target: "$95K", actual: "$87K", growth: "+5%", share: "22%", competition: "Increasing pressure" },
  { product: "Voltaren 75mg", territory: "Upper Egypt", target: "$70K", actual: "$58K", growth: "-3%", share: "14%", competition: "Heavy generics" },
  { product: "Plavix 75mg", territory: "Alexandria & Coast", target: "$140K", actual: "$155K", growth: "+22%", share: "28%", competition: "Stable" },
  { product: "Crestor 20mg", territory: "Greater Cairo", target: "$160K", actual: "$148K", growth: "+8%", share: "24%", competition: "Generic entry" },
  { product: "Fucidin H", territory: "Alexandria & Coast", target: "$55K", actual: "$62K", growth: "+15%", share: "35%", competition: "Stable" },
  { product: "Depakine Chrono", territory: "Greater Cairo", target: "$85K", actual: "$78K", growth: "+4%", share: "19%", competition: "Stable" },
  { product: "Herceptin", territory: "Greater Cairo", target: "$220K", actual: "$240K", growth: "+25%", share: "42%", competition: "Few competitors" },
  { product: "Zoloft 50mg", territory: "Delta Region", target: "$45K", actual: "$41K", growth: "+2%", share: "16%", competition: "Generic pressure" },
];

const visitFields: EntityField[] = [
  { name: "accompanied", label: "Accompanied (DM/Rep)", type: "text", required: true },
  { name: "doctor", label: "Doctor Visited", type: "text", required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "purpose", label: "Purpose", type: "select", options: [
    "KOL Engagement", "Coaching", "Strategic Account", "New Product Launch", "Performance Review",
  ].map(p => ({ label: p, value: p })) },
  { name: "observations", label: "Key Observations", type: "textarea" },
  { name: "followUp", label: "Follow-up Actions", type: "textarea" },
];

export default function MarketeerPage() {
  const [escalated, setEscalated] = useState(ESCALATED);
  const [doubleVisits, setDoubleVisits] = useState(DOUBLE_VISITS);
  const [editing, setEditing] = useState<typeof DOUBLE_VISITS[0] | null>(null);
  const [showVisit, setShowVisit] = useState(false);
  const [approvalFilters, setApprovalFilters] = useState<FilterState>({ _search: "", decision: "" });
  const [visitFilters, setVisitFilters] = useState<FilterState>({ _search: "", purpose: "" });

  const filteredEscalated = escalated.filter((e) => {
    if (approvalFilters.decision && e.decision !== approvalFilters.decision) return false;
    if (approvalFilters._search) {
      const q = approvalFilters._search.toLowerCase();
      return e.id.toLowerCase().includes(q) || e.from.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredVisits = doubleVisits.filter((v) => {
    if (visitFilters.purpose && v.purpose !== visitFilters.purpose) return false;
    if (visitFilters._search) {
      const q = visitFilters._search.toLowerCase();
      return v.accompanied.toLowerCase().includes(q) || v.doctor.toLowerCase().includes(q);
    }
    return true;
  });

  const totalReps = DISTRICTS.reduce((s, d) => s + d.reps, 0);
  const totalDoctors = DISTRICTS.reduce((s, d) => s + d.doctors, 0);
  const pending = escalated.filter(e => e.decision === "Pending").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Marketeer Dashboard" description="Oversee district managers, approve escalated requests, and analyze market performance" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} title="Districts Under Management" value={DISTRICTS.length} subtitle={`${totalReps} reps total`} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={MapPin} title="Total Field Force" value={totalReps} subtitle={`${totalDoctors} doctors covered`} iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={DollarSign} title="Budget Used" value="58%" subtitle="YTD spend" iconColor="bg-purple-100 text-purple-700" />
        <StatsCard icon={Target} title="Territory Coverage" value="89%" subtitle="National average" iconColor="bg-amber-100 text-amber-700" />
      </div>

      <Tabs defaultValue="districts">
        <TabsList>
          <TabsTrigger value="districts">District Overview</TabsTrigger>
          <TabsTrigger value="performance">Team Performance</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="visits">Double Visits</TabsTrigger>
          <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="districts">
          <div className="grid gap-4 md:grid-cols-2">
            {DISTRICTS.map((d, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{d.district}</CardTitle>
                    <StatusBadge status={d.rating === "A" ? "Excellent" : "Good"} />
                  </div>
                  <CardDescription>DM: {d.dm}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-muted-foreground">Team Size</div><div className="font-semibold">{d.reps} reps</div></div>
                    <div><div className="text-muted-foreground">Doctors</div><div className="font-semibold">{d.doctors}</div></div>
                    <div><div className="text-muted-foreground">Call Rate</div><div className="font-semibold">{d.callRate}%</div></div>
                    <div><div className="text-muted-foreground">Compliance</div><div className="font-semibold">{d.compliance}%</div></div>
                    <div><div className="text-muted-foreground">Budget Used</div><div className="font-semibold">{d.budget}</div></div>
                    <div><div className="text-muted-foreground">Rating</div><div className="font-semibold">{d.rating}</div></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader><CardTitle>District Manager Performance</CardTitle><CardDescription>Aggregated team metrics</CardDescription></CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "dm", label: "DM Name" },
                  { key: "district", label: "District" },
                  { key: "teamSize", label: "Team Size" },
                  { key: "callRate", label: "Call Rate" },
                  { key: "compliance", label: "Compliance" },
                  { key: "pending", label: "Pending" },
                  { key: "budget", label: "Budget" },
                  { key: "rating", label: "Rating", render: (_v, row) => <StatusBadge status={(row as unknown as (typeof TEAM_PERFORMANCE)[0]).rating === "A" ? "Excellent" : "Good"} /> },
                ] as Column<Record<string, unknown>>[]}
                data={TEAM_PERFORMANCE as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No performance data available."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Escalated Requests</CardTitle>
              <CardDescription>Requests escalated from District Managers</CardDescription>
              <FilterBar
                searchValue={approvalFilters._search}
                onSearchChange={(v) => setApprovalFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "decision", label: "Decision", type: "select", options: [
                  { label: "Pending", value: "Pending" }, { label: "Approved", value: "Approved" }, { label: "Rejected", value: "Rejected" },
                ]}]}
                values={approvalFilters}
                onChange={(k, v) => setApprovalFilters((f) => ({ ...f, [k]: v }))}
              />
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "id", label: "Request#", render: (v) => <span className="font-mono">{v as string}</span> },
                  { key: "from", label: "From DM" },
                  { key: "rep", label: "Rep" },
                  { key: "type", label: "Type" },
                  { key: "description", label: "Description", className: "max-w-xs truncate" },
                  { key: "cost", label: "Cost", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "recommendation", label: "DM Recommendation" },
                  { key: "decision", label: "Decision", render: (v) => <StatusBadge status={v as string} /> },
                  { key: "_actions", label: "", render: (_v, row) => {
                    const e = row as unknown as (typeof ESCALATED)[0];
                    return (
                      <EditDeleteMenu
                        onDelete={() => setEscalated(prev => prev.filter(x => x.id !== e.id))}
                        itemLabel={e.id}
                        canEdit={false}
                        extraItems={e.decision === "Pending" ? [
                          { label: "Approve", onClick: () => setEscalated(prev => prev.map(x => x.id === e.id ? { ...x, decision: "Approved" } : x)) },
                          { label: "Reject", onClick: () => setEscalated(prev => prev.map(x => x.id === e.id ? { ...x, decision: "Rejected" } : x)), destructive: true },
                        ] : []}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredEscalated as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No escalated requests."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Double Visits</CardTitle>
                <CardDescription>Field visits accompanying DMs and reps</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditing(null); setShowVisit(true); }}><Plus className="mr-2 h-4 w-4" />Register Visit</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterBar
                searchValue={visitFilters._search}
                onSearchChange={(v) => setVisitFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "purpose", label: "Purpose", type: "select", options: [
                  "KOL Engagement", "Coaching", "Strategic Account", "New Product Launch", "Performance Review",
                ].map(p => ({ label: p, value: p })) }]}
                values={visitFilters}
                onChange={(k, v) => setVisitFilters((f) => ({ ...f, [k]: v }))}
              />
              <DataTable
                columns={[
                  { key: "id", label: "Visit#", render: (v) => <span className="font-mono">{v as string}</span> },
                  { key: "accompanied", label: "Accompanied", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "doctor", label: "Doctor" },
                  { key: "date", label: "Date" },
                  { key: "purpose", label: "Purpose", render: (v) => <StatusBadge status={v as string} /> },
                  { key: "observations", label: "Observations", className: "max-w-xs truncate" },
                  { key: "followUp", label: "Follow-up", className: "max-w-xs truncate" },
                  { key: "_actions", label: "", render: (_v, row) => {
                    const v = row as unknown as (typeof DOUBLE_VISITS)[0];
                    return (
                      <EditDeleteMenu
                        onEdit={() => { setEditing(v); setShowVisit(true); }}
                        onDelete={() => setDoubleVisits(prev => prev.filter(x => x.id !== v.id))}
                        itemLabel={v.id}
                      />
                    );
                  }},
                ] as Column<Record<string, unknown>>[]}
                data={filteredVisits as unknown as Record<string, unknown>[]}
                pagination={false}
                emptyMessage="No visits found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader><CardTitle>Product Performance by Territory</CardTitle><CardDescription>Market share and growth analysis</CardDescription></CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: "product", label: "Product", render: (v) => <span className="font-medium">{v as string}</span> },
                  { key: "territory", label: "Territory" },
                  { key: "target", label: "Target" },
                  { key: "actual", label: "Actual", render: (v) => <span className="font-semibold">{v as string}</span> },
                  { key: "growth", label: "Growth", render: (v) => <span className={(v as string).startsWith("+") ? "text-green-600" : "text-red-600"}>{v as string}</span> },
                  { key: "share", label: "Market Share" },
                  { key: "competition", label: "Competition", render: (v) => <span className="text-muted-foreground">{v as string}</span> },
                ] as Column<Record<string, unknown>>[]}
                data={MARKET_ANALYSIS as unknown as Record<string, unknown>[]}
                emptyMessage="No market analysis data."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-sm">YTD Sales</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">$4.2M</div><div className="text-xs text-green-600 mt-1">+14% vs LY</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Target Achievement</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">92%</div><div className="text-xs text-muted-foreground mt-1">YTD</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Field Force ROI</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">3.8x</div><div className="text-xs text-green-600 mt-1">Above benchmark</div></CardContent></Card>
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle>District Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DISTRICTS.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{d.district}</span>
                      <span>{d.compliance}%</span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${d.compliance}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showVisit}
        onOpenChange={(open) => { if (!open) { setShowVisit(false); setEditing(null); } }}
        title={editing ? "Edit Visit" : "Register Double Visit"}
        fields={visitFields}
        initialData={editing ? { accompanied: editing.accompanied, doctor: editing.doctor, date: editing.date, purpose: editing.purpose, observations: editing.observations, followUp: editing.followUp } : undefined}
        onSubmit={(d) => {
          if (editing) {
            setDoubleVisits(prev => prev.map(v => v.id === editing.id ? { ...v, accompanied: d.accompanied as string, doctor: d.doctor as string, date: d.date as string, purpose: (d.purpose as string) || v.purpose, observations: (d.observations as string) || "", followUp: (d.followUp as string) || "" } : v));
          } else {
            setDoubleVisits(prev => [{ id: `MV-${String(prev.length + 1).padStart(3, "0")}`, accompanied: d.accompanied as string, doctor: d.doctor as string, date: d.date as string, purpose: (d.purpose as string) || "KOL Engagement", observations: (d.observations as string) || "", followUp: (d.followUp as string) || "", status: "Completed" }, ...prev]);
          }
          setShowVisit(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
