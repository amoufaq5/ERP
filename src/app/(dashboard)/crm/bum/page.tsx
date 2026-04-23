"use client";

import { useState } from "react";
import { Crown, Users, DollarSign, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";

const HIERARCHY = [
  {
    marketeer: "Khaled Sherif", region: "North Region",
    dms: [
      { name: "Hany Mansour", district: "Greater Cairo", reps: 8, doctors: 320 },
      { name: "Lina Habib", district: "Alexandria & Coast", reps: 7, doctors: 240 },
    ],
  },
  {
    marketeer: "Mariam Adly", region: "South Region",
    dms: [
      { name: "Tamer Wahid", district: "Upper Egypt", reps: 5, doctors: 168 },
      { name: "Sameh Helmy", district: "Red Sea Zone", reps: 4, doctors: 110 },
    ],
  },
  {
    marketeer: "Hossam Bahgat", region: "East Region",
    dms: [
      { name: "Reem Saleh", district: "Delta Region", reps: 6, doctors: 215 },
      { name: "Adel Mounir", district: "Canal Cities", reps: 4, doctors: 95 },
    ],
  },
  {
    marketeer: "Yasmine Galal", region: "West Region",
    dms: [
      { name: "Walid Anwar", district: "Marsa & Oases", reps: 3, doctors: 75 },
      { name: "Hala Lotfy", district: "New Cities", reps: 5, doctors: 130 },
    ],
  },
];

const PERFORMANCE = [
  { marketeer: "Khaled Sherif", region: "North Region", teamSize: 15, callRate: "89%", compliance: "92%", sales: "98%", budget: "66%", rating: "A" },
  { marketeer: "Mariam Adly", region: "South Region", teamSize: 9, callRate: "78%", compliance: "81%", sales: "85%", budget: "48%", rating: "B" },
  { marketeer: "Hossam Bahgat", region: "East Region", teamSize: 10, callRate: "85%", compliance: "88%", sales: "94%", budget: "61%", rating: "A" },
  { marketeer: "Yasmine Galal", region: "West Region", teamSize: 8, callRate: "76%", compliance: "79%", sales: "82%", budget: "44%", rating: "B" },
];

const STRATEGIC_APPROVALS = [
  { id: "SREQ-001", from: "Khaled Sherif (Marketeer)", type: "Doctor Sponsorship", description: "Dr. Walid Fathy Int'l Oncology Congress - Tokyo", value: "$8,500", justification: "Top KOL, 40% market influence", decision: "Approved", date: "2026-03-25" },
  { id: "SREQ-002", from: "Hossam Bahgat (Marketeer)", type: "Strategic Investment", description: "New product launch event - Cairo", value: "$25,000", justification: "Q2 launch critical", decision: "Approved", date: "2026-03-22" },
  { id: "SREQ-003", from: "Mariam Adly (Marketeer)", type: "Conference Booth", description: "International Pharma Expo", value: "$12,000", justification: "Brand visibility", decision: "Pending", date: "2026-03-20" },
  { id: "SREQ-004", from: "Yasmine Galal (Marketeer)", type: "KOL Program", description: "Annual KOL summit West region", value: "$18,000", justification: "10 top KOLs engagement", decision: "Pending", date: "2026-03-18" },
  { id: "SREQ-005", from: "Khaled Sherif (Marketeer)", type: "Strategic Investment", description: "Cardiology Clinical Study Sponsorship", value: "$45,000", justification: "Real-world evidence", decision: "Pending", date: "2026-03-15" },
  { id: "SREQ-006", from: "Hossam Bahgat (Marketeer)", type: "Doctor Sponsorship", description: "Multi-doctor international conference", value: "$15,000", justification: "Build prescriber base", decision: "Rejected", date: "2026-03-12" },
];

const FIELD_VISITS = [
  { id: "BV-001", region: "North Region", accompanied: "Khaled Sherif (Marketeer)", doctor: "Dr. Tarek Hamdy", date: "2026-03-15", purpose: "KOL Management", notes: "Strategic relationship building - top cardiologist", actions: "Quarterly reviews, conference invites" },
  { id: "BV-002", region: "East Region", accompanied: "Hossam Bahgat (Marketeer)", doctor: "Dr. Nada Hussein", date: "2026-03-08", purpose: "Strategic Account", notes: "University hospital expansion plan", actions: "Increase coverage 50%" },
  { id: "BV-003", region: "South Region", accompanied: "Mariam Adly (Marketeer)", doctor: "Dr. Khaled Adham", date: "2026-02-28", purpose: "Performance Review", notes: "Reviewed underperforming territory", actions: "Restructure rep allocation" },
  { id: "BV-004", region: "North Region", accompanied: "Khaled Sherif (Marketeer)", doctor: "Dr. Walid Fathy", date: "2026-02-20", purpose: "Launch Event", notes: "Presented new oncology line", actions: "Personal sponsorship approved" },
];

const REGIONAL_COMPARISON = [
  { region: "North Region", sales: 98, compliance: 92, callRate: 89 },
  { region: "South Region", sales: 85, compliance: 81, callRate: 78 },
  { region: "East Region", sales: 94, compliance: 88, callRate: 85 },
  { region: "West Region", sales: 82, compliance: 79, callRate: 76 },
];

const visitFields: EntityField[] = [
  { name: "region", label: "Region", type: "select", options: ["North", "South", "East", "West"].map(r => ({ label: `${r} Region`, value: `${r} Region` })) },
  { name: "accompanied", label: "Accompanied", type: "text", required: true },
  { name: "doctor", label: "Doctor/KOL", type: "text", required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "purpose", label: "Purpose", type: "select", options: [
    "KOL Management", "Strategic Account", "Launch Event", "Performance Review",
  ].map(p => ({ label: p, value: p })) },
  { name: "notes", label: "Notes", type: "textarea" },
  { name: "actions", label: "Action Items", type: "textarea" },
];

export default function BUMPage() {
  const [approvals, setApprovals] = useState(STRATEGIC_APPROVALS);
  const [visits, setVisits] = useState(FIELD_VISITS);
  const [editingVisit, setEditingVisit] = useState<typeof FIELD_VISITS[0] | null>(null);
  const [showVisit, setShowVisit] = useState(false);
  const [approvalFilters, setApprovalFilters] = useState<FilterState>({ _search: "", decision: "" });
  const [visitFilters, setVisitFilters] = useState<FilterState>({ _search: "", region: "" });

  const filteredApprovals = approvals.filter((a) => {
    if (approvalFilters.decision && a.decision !== approvalFilters.decision) return false;
    if (approvalFilters._search) {
      const q = approvalFilters._search.toLowerCase();
      return a.id.toLowerCase().includes(q) || a.from.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredVisits = visits.filter((v) => {
    if (visitFilters.region && v.region !== visitFilters.region) return false;
    if (visitFilters._search) {
      const q = visitFilters._search.toLowerCase();
      return v.accompanied.toLowerCase().includes(q) || v.doctor.toLowerCase().includes(q);
    }
    return true;
  });

  const totalForce = HIERARCHY.reduce((s, m) => s + m.dms.reduce((ss, d) => ss + d.reps, 0), 0);
  const totalDoctors = HIERARCHY.reduce((s, m) => s + m.dms.reduce((ss, d) => ss + d.doctors, 0), 0);
  const pendingStrategic = approvals.filter(a => a.decision === "Pending").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Business Unit Manager (BUM) Dashboard" description="National field force oversight, strategic decisions, and performance management" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} title="Total Field Force" value={totalForce} subtitle={`${totalDoctors} doctors`} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={TrendingUp} title="National Call Rate" value="83%" subtitle="Average compliance" iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={DollarSign} title="Budget Utilization" value="55%" subtitle="YTD" iconColor="bg-purple-100 text-purple-700" />
        <StatsCard icon={Crown} title="YTD Sales Achievement" value="92%" subtitle="vs target" iconColor="bg-amber-100 text-amber-700" />
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organization Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Dashboard</TabsTrigger>
          <TabsTrigger value="strategic">Strategic Approvals</TabsTrigger>
          <TabsTrigger value="visits">Field Visits</TabsTrigger>
          <TabsTrigger value="analytics">National Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Hierarchy</CardTitle>
                <CardDescription>BUM → Marketeers → District Managers → Medical Reps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" /><span className="font-semibold">BUM (You)</span></div>
                  <div className="text-sm text-muted-foreground mt-1">Total Force: {totalForce} reps • {totalDoctors} doctors • 4 regions</div>
                </div>
                {HIERARCHY.map((m, i) => (
                  <div key={i} className="ml-4 border-l-2 pl-4 space-y-3">
                    <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-900/10">
                      <div className="font-medium">{m.marketeer} <span className="text-xs text-muted-foreground">— Marketeer • {m.region}</span></div>
                      <div className="text-xs text-muted-foreground">{m.dms.length} DMs • {m.dms.reduce((s, d) => s + d.reps, 0)} reps</div>
                    </div>
                    <div className="ml-4 grid gap-2 md:grid-cols-2">
                      {m.dms.map((dm, j) => (
                        <div key={j} className="rounded border p-2 text-sm">
                          <div className="font-medium">{dm.name}</div>
                          <div className="text-xs text-muted-foreground">DM • {dm.district} • {dm.reps} reps • {dm.doctors} doctors</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader><CardTitle>Marketeer Performance</CardTitle><CardDescription>Regional KPIs</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Marketeer</th><th className="p-3">Region</th><th className="p-3">Team Size</th><th className="p-3">Call Rate</th><th className="p-3">Compliance</th><th className="p-3">Sales Achievement</th><th className="p-3">Budget Used</th><th className="p-3">Rating</th></tr>
                  </thead>
                  <tbody>
                    {PERFORMANCE.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{p.marketeer}</td>
                        <td className="p-3">{p.region}</td>
                        <td className="p-3">{p.teamSize}</td>
                        <td className="p-3">{p.callRate}</td>
                        <td className="p-3">{p.compliance}</td>
                        <td className="p-3 font-semibold">{p.sales}</td>
                        <td className="p-3">{p.budget}</td>
                        <td className="p-3"><StatusBadge status={p.rating === "A" ? "Excellent" : "Good"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategic">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Approvals</CardTitle>
              <CardDescription>High-value requests escalated from Marketeers — {pendingStrategic} pending</CardDescription>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Request#</th><th className="p-3">From</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3">Value</th><th className="p-3">Justification</th><th className="p-3">Decision</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody>
                    {filteredApprovals.map(a => (
                      <tr key={a.id} className="border-t">
                        <td className="p-3 font-mono">{a.id}</td>
                        <td className="p-3">{a.from}</td>
                        <td className="p-3">{a.type}</td>
                        <td className="p-3 max-w-xs truncate">{a.description}</td>
                        <td className="p-3 font-bold">{a.value}</td>
                        <td className="p-3 max-w-xs truncate text-muted-foreground">{a.justification}</td>
                        <td className="p-3"><StatusBadge status={a.decision} /></td>
                        <td className="p-3">
                          <EditDeleteMenu
                            onDelete={() => setApprovals(prev => prev.filter(x => x.id !== a.id))}
                            itemLabel={a.id}
                            canEdit={false}
                            extraItems={a.decision === "Pending" ? [
                              { label: "Approve", onClick: () => setApprovals(prev => prev.map(x => x.id === a.id ? { ...x, decision: "Approved" } : x)) },
                              { label: "Reject", onClick: () => setApprovals(prev => prev.map(x => x.id === a.id ? { ...x, decision: "Rejected" } : x)), destructive: true },
                            ] : []}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>BUM Field Visits</CardTitle>
                <CardDescription>Strategic visits and KOL management</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingVisit(null); setShowVisit(true); }}><Plus className="mr-2 h-4 w-4" />Register Visit</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterBar
                searchValue={visitFilters._search}
                onSearchChange={(v) => setVisitFilters((f) => ({ ...f, _search: v }))}
                fields={[{ key: "region", label: "Region", type: "select", options: ["North", "South", "East", "West"].map(r => ({ label: `${r} Region`, value: `${r} Region` })) }]}
                values={visitFilters}
                onChange={(k, v) => setVisitFilters((f) => ({ ...f, [k]: v }))}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Visit#</th><th className="p-3">Region</th><th className="p-3">Accompanied</th><th className="p-3">Doctor/KOL</th><th className="p-3">Date</th><th className="p-3">Purpose</th><th className="p-3">Notes</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody>
                    {filteredVisits.map(v => (
                      <tr key={v.id} className="border-t">
                        <td className="p-3 font-mono">{v.id}</td>
                        <td className="p-3">{v.region}</td>
                        <td className="p-3 font-medium">{v.accompanied}</td>
                        <td className="p-3">{v.doctor}</td>
                        <td className="p-3">{v.date}</td>
                        <td className="p-3"><StatusBadge status={v.purpose} /></td>
                        <td className="p-3 max-w-xs truncate">{v.notes}</td>
                        <td className="p-3">
                          <EditDeleteMenu
                            onEdit={() => { setEditingVisit(v); setShowVisit(true); }}
                            onDelete={() => setVisits(prev => prev.filter(x => x.id !== v.id))}
                            itemLabel={v.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Regional Performance</CardTitle><CardDescription>Sales achievement by region</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REGIONAL_COMPARISON.map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{r.region}</span>
                        <span>{r.sales}%</span>
                      </div>
                      <div className="h-3 w-full rounded bg-muted overflow-hidden">
                        <div className={`h-full ${r.sales >= 90 ? "bg-green-500" : r.sales >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.sales}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>National KPIs</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Headcount</span><span className="font-bold">{totalForce + 4 + 8} (incl. mgmt)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vacancy Rate</span><span className="font-bold">3.2%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg Tenure</span><span className="font-bold">3.8 yrs</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Top Region</span><span className="font-bold text-green-600">North</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bottom Region</span><span className="font-bold text-red-600">West</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">YTD Sales</span><span className="font-bold">$4.2M</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showVisit}
        onOpenChange={(open) => { if (!open) { setShowVisit(false); setEditingVisit(null); } }}
        title={editingVisit ? "Edit Visit" : "Register BUM Visit"}
        fields={visitFields}
        initialData={editingVisit ? { region: editingVisit.region, accompanied: editingVisit.accompanied, doctor: editingVisit.doctor, date: editingVisit.date, purpose: editingVisit.purpose, notes: editingVisit.notes, actions: editingVisit.actions } : undefined}
        onSubmit={(d) => {
          if (editingVisit) {
            setVisits(prev => prev.map(v => v.id === editingVisit.id ? { ...v, region: (d.region as string) || v.region, accompanied: d.accompanied as string, doctor: d.doctor as string, date: d.date as string, purpose: (d.purpose as string) || v.purpose, notes: (d.notes as string) || "", actions: (d.actions as string) || "" } : v));
          } else {
            setVisits(prev => [{ id: `BV-${String(prev.length + 1).padStart(3, "0")}`, region: (d.region as string) || "North Region", accompanied: d.accompanied as string, doctor: d.doctor as string, date: d.date as string, purpose: (d.purpose as string) || "KOL Management", notes: (d.notes as string) || "", actions: (d.actions as string) || "" }, ...prev]);
          }
          setShowVisit(false);
          setEditingVisit(null);
        }}
      />
    </div>
  );
}
