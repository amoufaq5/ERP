"use client";

import { useState } from "react";
import { ClipboardList, Clock, CheckCircle2, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import StatusBadge from "@/components/shared/status-badge";
import { FormModal, type FormField } from "@/components/ui/form-modal";

const REQUESTS = [
  { id: "REQ-001", requester: "Ahmed Hassan", role: "Med Rep", type: "Product Sample", description: "Cardizem 60mg samples", amount: "$450", priority: "High", date: "2026-03-28", currentApprover: "DM", status: "Approved" },
  { id: "REQ-002", requester: "Sara Mohamed", role: "Med Rep", type: "Conference Sponsorship", description: "Alex Cardiology Conference", amount: "$1,200", priority: "High", date: "2026-03-27", currentApprover: "Marketeer", status: "Pending" },
  { id: "REQ-003", requester: "Omar Khalil", role: "Med Rep", type: "Promo Material", description: "Brochures derma line", amount: "$320", priority: "Medium", date: "2026-03-26", currentApprover: "DM", status: "Approved" },
  { id: "REQ-004", requester: "Fatima Ali", role: "Med Rep", type: "Doctor Sponsorship", description: "Dr. Walid Fathy - Int'l Oncology", amount: "$3,500", priority: "Urgent", date: "2026-03-25", currentApprover: "BUM", status: "Pending" },
  { id: "REQ-005", requester: "Mahmoud Farouk", role: "Med Rep", type: "Medical Literature", description: "Nexium clinical pack", amount: "$180", priority: "Low", date: "2026-03-24", currentApprover: "DM", status: "Fulfilled" },
  { id: "REQ-006", requester: "Hany Mansour", role: "DM", type: "Event Budget", description: "Cairo cardiology event", amount: "$2,500", priority: "High", date: "2026-03-23", currentApprover: "Marketeer", status: "Approved" },
  { id: "REQ-007", requester: "Karim Saeed", role: "Med Rep", type: "Conference Sponsorship", description: "ENT meeting Zagazig", amount: "$800", priority: "Medium", date: "2026-03-22", currentApprover: "DM", status: "Rejected" },
  { id: "REQ-008", requester: "Reem Saleh", role: "DM", type: "Promo Material", description: "Q2 promotional kits", amount: "$1,500", priority: "Medium", date: "2026-03-21", currentApprover: "Marketeer", status: "Approved" },
  { id: "REQ-009", requester: "Yousef Ahmad", role: "Med Rep", type: "Product Sample", description: "New launch samples", amount: "$380", priority: "High", date: "2026-03-20", currentApprover: "DM", status: "Pending" },
  { id: "REQ-010", requester: "Hala Samir", role: "Med Rep", type: "Doctor Sponsorship", description: "Dr. Khaled - Urology Symposium", amount: "$1,800", priority: "High", date: "2026-03-19", currentApprover: "Marketeer", status: "Pending" },
  { id: "REQ-011", requester: "Khaled Sherif", role: "Marketeer", type: "Strategic Investment", description: "Cardiology study sponsorship", amount: "$45,000", priority: "Urgent", date: "2026-03-15", currentApprover: "BUM", status: "Pending" },
  { id: "REQ-012", requester: "Lina Habib", role: "DM", type: "Travel Request", description: "Multi-city KOL tour", amount: "$1,900", priority: "Medium", date: "2026-03-12", currentApprover: "Marketeer", status: "Approved" },
  { id: "REQ-013", requester: "Nour Ibrahim", role: "Med Rep", type: "Product Sample", description: "Panadol Extra samples", amount: "$210", priority: "Low", date: "2026-03-10", currentApprover: "DM", status: "Fulfilled" },
  { id: "REQ-014", requester: "Mariam Adly", role: "Marketeer", type: "Event Budget", description: "Upper Egypt symposium", amount: "$3,200", priority: "High", date: "2026-03-08", currentApprover: "BUM", status: "Approved" },
  { id: "REQ-015", requester: "Dina Mostafa", role: "Med Rep", type: "Promo Material", description: "Branded merchandise", amount: "$550", priority: "Low", date: "2026-03-05", currentApprover: "DM", status: "Approved" },
];

const BUDGETS = [
  { category: "Product Samples", allocated: "$15,000", used: "$8,750", remaining: "$6,250", pct: 58 },
  { category: "Conference Sponsorship", allocated: "$25,000", used: "$15,200", remaining: "$9,800", pct: 61 },
  { category: "Doctor Sponsorship", allocated: "$30,000", used: "$22,400", remaining: "$7,600", pct: 75 },
  { category: "Promo Materials", allocated: "$12,000", used: "$5,800", remaining: "$6,200", pct: 48 },
  { category: "Medical Literature", allocated: "$8,000", used: "$3,200", remaining: "$4,800", pct: 40 },
  { category: "Event Budget", allocated: "$20,000", used: "$11,500", remaining: "$8,500", pct: 58 },
  { category: "Travel Requests", allocated: "$18,000", used: "$9,400", remaining: "$8,600", pct: 52 },
];

const SAMPLES = [
  { product: "Cardizem 60mg", stock: 1200, distributed: 450, byRep: "Ahmed: 200, Sara: 150, Others: 100", reorder: 500, status: "OK" },
  { product: "Augmentin 625mg Tab", stock: 2400, distributed: 880, byRep: "Omar: 350, Ahmed: 280, Others: 250", reorder: 1000, status: "OK" },
  { product: "Augmentin Susp", stock: 1800, distributed: 720, byRep: "Sara: 280, Omar: 240, Others: 200", reorder: 800, status: "OK" },
  { product: "Voltaren 75mg", stock: 950, distributed: 380, byRep: "Fatima: 150, Karim: 130, Others: 100", reorder: 400, status: "Low" },
  { product: "Nexium 40mg", stock: 1500, distributed: 520, byRep: "Mahmoud: 200, Others: 320", reorder: 600, status: "OK" },
  { product: "Plavix 75mg", stock: 800, distributed: 350, byRep: "Sara: 180, Others: 170", reorder: 350, status: "Low" },
  { product: "Crestor 20mg", stock: 1100, distributed: 410, byRep: "Sara: 220, Others: 190", reorder: 500, status: "OK" },
  { product: "Fucidin H Cream", stock: 600, distributed: 280, byRep: "Omar: 180, Others: 100", reorder: 250, status: "OK" },
  { product: "Zoloft 50mg", stock: 700, distributed: 210, byRep: "Fatima: 120, Others: 90", reorder: 300, status: "OK" },
  { product: "Otrivin Spray", stock: 450, distributed: 200, byRep: "Karim: 150, Others: 50", reorder: 200, status: "Low" },
];

const requestFields: FormField[] = [
  { name: "requester", label: "Requester Name", type: "text", required: true },
  { name: "role", label: "Role", type: "select", required: true, options: [
    "Med Rep", "DM", "Marketeer", "BUM",
  ].map(r => ({ label: r, value: r })) },
  { name: "type", label: "Request Type", type: "select", required: true, options: [
    "Product Sample", "Promo Material", "Conference Sponsorship", "Doctor Sponsorship",
    "Medical Literature", "Event Budget", "Travel Request",
  ].map(t => ({ label: t, value: t })) },
  { name: "description", label: "Description", type: "textarea", required: true },
  { name: "amount", label: "Amount", type: "text", required: true, placeholder: "$0" },
  { name: "priority", label: "Priority", type: "select", options: [
    "Urgent", "High", "Medium", "Low",
  ].map(p => ({ label: p, value: p })) },
];

export default function MarketRequestsPage() {
  const [requests, setRequests] = useState(REQUESTS);
  const [show, setShow] = useState(false);

  const pending = requests.filter(r => r.status === "Pending").length;
  const approved = requests.filter(r => r.status === "Approved" || r.status === "Fulfilled").length;
  const totalBudget = "$128,000";

  const repPending = requests.filter(r => r.currentApprover === "DM" && r.status === "Pending").length;
  const dmPending = requests.filter(r => r.currentApprover === "Marketeer" && r.status === "Pending").length;
  const marketeerPending = requests.filter(r => r.currentApprover === "BUM" && r.status === "Pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Requests & Approvals"
        description="Centralized request system with multi-level approval workflow"
        actions={<Button onClick={() => setShow(true)}><Plus className="mr-2 h-4 w-4" />New Request</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={ClipboardList} title="Total Requests" value={requests.length} iconColor="bg-blue-100 text-blue-700" />
        <StatsCard icon={Clock} title="Pending Approval" value={pending} iconColor="bg-amber-100 text-amber-700" />
        <StatsCard icon={CheckCircle2} title="Approved This Month" value={approved} iconColor="bg-green-100 text-green-700" />
        <StatsCard icon={DollarSign} title="Total Budget" value={totalBudget} subtitle="Allocated" iconColor="bg-purple-100 text-purple-700" />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="chain">Approval Chain</TabsTrigger>
          <TabsTrigger value="budget">Budget Tracking</TabsTrigger>
          <TabsTrigger value="samples">Sample Management</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader><CardTitle>All Market Requests</CardTitle><CardDescription>{requests.length} requests across all hierarchy levels</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Request#</th><th className="p-3">Requester</th><th className="p-3">Role</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3">Amount</th><th className="p-3">Priority</th><th className="p-3">Date</th><th className="p-3">Current Approver</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-mono">{r.id}</td>
                        <td className="p-3 font-medium">{r.requester}</td>
                        <td className="p-3"><StatusBadge status={r.role} /></td>
                        <td className="p-3">{r.type}</td>
                        <td className="p-3 max-w-xs truncate">{r.description}</td>
                        <td className="p-3 font-semibold">{r.amount}</td>
                        <td className="p-3"><StatusBadge status={r.priority} /></td>
                        <td className="p-3">{r.date}</td>
                        <td className="p-3">{r.currentApprover}</td>
                        <td className="p-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chain">
          <Card>
            <CardHeader><CardTitle>Approval Workflow</CardTitle><CardDescription>Multi-level approval chain: Med Rep → DM → Marketeer → BUM</CardDescription></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/10">
                  <div className="text-xs text-muted-foreground">LEVEL 1</div>
                  <div className="font-semibold">Med Rep</div>
                  <div className="text-xs text-muted-foreground mt-1">Initiates request</div>
                  <div className="mt-3 text-2xl font-bold">{requests.filter(r => r.role === "Med Rep").length}</div>
                  <div className="text-xs">Total submitted</div>
                </div>
                <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/10">
                  <div className="text-xs text-muted-foreground">LEVEL 2</div>
                  <div className="font-semibold">District Manager</div>
                  <div className="text-xs text-muted-foreground mt-1">First-line approval</div>
                  <div className="mt-3 text-2xl font-bold text-amber-600">{repPending}</div>
                  <div className="text-xs">Pending review</div>
                </div>
                <div className="rounded-lg border p-4 bg-purple-50 dark:bg-purple-900/10">
                  <div className="text-xs text-muted-foreground">LEVEL 3</div>
                  <div className="font-semibold">Marketeer</div>
                  <div className="text-xs text-muted-foreground mt-1">Regional approval</div>
                  <div className="mt-3 text-2xl font-bold text-amber-600">{dmPending}</div>
                  <div className="text-xs">Pending review</div>
                </div>
                <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/10">
                  <div className="text-xs text-muted-foreground">LEVEL 4</div>
                  <div className="font-semibold">BUM</div>
                  <div className="text-xs text-muted-foreground mt-1">Strategic approval</div>
                  <div className="mt-3 text-2xl font-bold text-amber-600">{marketeerPending}</div>
                  <div className="text-xs">Pending review</div>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Recent Approval Actions</h4>
                <div className="space-y-2">
                  {requests.filter(r => r.status !== "Pending").slice(0, 6).map(r => (
                    <div key={r.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div>
                        <span className="font-mono text-xs">{r.id}</span> • <span className="font-medium">{r.requester}</span> • {r.type}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader><CardTitle>Budget Tracking</CardTitle><CardDescription>Allocation and utilization by category</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {BUDGETS.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{b.category}</span>
                      <span className="text-muted-foreground">{b.used} / {b.allocated} ({b.pct}%)</span>
                    </div>
                    <div className="h-3 w-full rounded bg-muted overflow-hidden">
                      <div className={`h-full ${b.pct > 75 ? "bg-red-500" : b.pct > 50 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${b.pct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Remaining: {b.remaining}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="samples">
          <Card>
            <CardHeader><CardTitle>Sample Management</CardTitle><CardDescription>Product sample inventory and distribution</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Product</th><th className="p-3">Available Stock</th><th className="p-3">Distributed</th><th className="p-3">Distribution by Rep</th><th className="p-3">Reorder Level</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {SAMPLES.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{s.product}</td>
                        <td className="p-3">{s.stock}</td>
                        <td className="p-3">{s.distributed}</td>
                        <td className="p-3 text-xs text-muted-foreground">{s.byRep}</td>
                        <td className="p-3">{s.reorder}</td>
                        <td className="p-3"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormModal open={show} onOpenChange={setShow} title="New Market Request" fields={requestFields}
        onSubmit={(d) => setRequests(prev => [{
          id: `REQ-${String(prev.length + 16).padStart(3, "0")}`, requester: d.requester, role: d.role,
          type: d.type, description: d.description, amount: d.amount,
          priority: d.priority || "Medium", date: new Date().toISOString().slice(0, 10),
          currentApprover: "DM", status: "Pending",
        }, ...prev])} />
    </div>
  );
}
