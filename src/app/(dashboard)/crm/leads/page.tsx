"use client";

import { useState } from "react";
import { Users, TrendingUp, Star, BarChart2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST" | "NURTURING";
type LeadSource = "WEBSITE" | "REFERRAL" | "COLD_CALL" | "EMAIL" | "SOCIAL_MEDIA" | "TRADE_SHOW" | "PARTNER";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  source: LeadSource;
  score: number;
  status: LeadStatus;
  assignedTo: string;
  value: number;
  createdAt: string;
}

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-purple-100 text-purple-800",
  QUALIFIED: "bg-green-100 text-green-800",
  PROPOSAL: "bg-yellow-100 text-yellow-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-emerald-100 text-emerald-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
  NURTURING: "bg-gray-100 text-gray-800",
};

const INITIAL_LEADS: Lead[] = [
  { id: "L-001", firstName: "Alexandra", lastName: "Chen", email: "a.chen@techcorp.io", company: "TechCorp Solutions", source: "WEBSITE", score: 88, status: "QUALIFIED", assignedTo: "Marcus Williams", value: 45000, createdAt: "2026-03-01" },
  { id: "L-002", firstName: "James", lastName: "Martinez", email: "j.martinez@globalretail.com", company: "Global Retail Inc.", source: "REFERRAL", score: 72, status: "PROPOSAL", assignedTo: "Sarah Johnson", value: 120000, createdAt: "2026-03-05" },
  { id: "L-003", firstName: "Priya", lastName: "Patel", email: "priya.patel@nexusfinance.com", company: "Nexus Finance", source: "TRADE_SHOW", score: 95, status: "NEGOTIATION", assignedTo: "Marcus Williams", value: 250000, createdAt: "2026-03-08" },
  { id: "L-004", firstName: "David", lastName: "Thompson", email: "d.thompson@healthplus.org", company: "HealthPlus Systems", source: "COLD_CALL", score: 41, status: "CONTACTED", assignedTo: "Emma Davis", value: 18000, createdAt: "2026-03-12" },
  { id: "L-005", firstName: "Sofia", lastName: "Nguyen", email: "sofia.n@cloudbuild.tech", company: "CloudBuild Technologies", source: "SOCIAL_MEDIA", score: 63, status: "NEW", assignedTo: "Sarah Johnson", value: 75000, createdAt: "2026-03-15" },
  { id: "L-006", firstName: "Robert", lastName: "Kim", email: "r.kim@manufactura.com", company: "Manufactura Group", source: "EMAIL", score: 79, status: "QUALIFIED", assignedTo: "Emma Davis", value: 95000, createdAt: "2026-03-18" },
  { id: "L-007", firstName: "Isabella", lastName: "Santos", email: "i.santos@logisticspro.net", company: "LogisticsPro", source: "PARTNER", score: 55, status: "NURTURING", assignedTo: "Marcus Williams", value: 32000, createdAt: "2026-03-22" },
  { id: "L-008", firstName: "Michael", lastName: "O'Brien", email: "m.obrien@quantumdata.ai", company: "Quantum Data AI", source: "WEBSITE", score: 91, status: "CLOSED_WON", assignedTo: "Sarah Johnson", value: 185000, createdAt: "2026-03-25" },
];

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function StatsCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", source: "WEBSITE" as LeadSource, value: "" });

  const filtered = leads.filter(
    (l) =>
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalLeads = leads.length;
  const newThisMonth = leads.filter((l) => l.createdAt >= "2026-03-01").length;
  const qualified = leads.filter((l) => l.status === "QUALIFIED" || l.status === "PROPOSAL" || l.status === "NEGOTIATION").length;
  const won = leads.filter((l) => l.status === "CLOSED_WON").length;
  const conversionRate = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";

  function handleAdd() {
    if (!form.firstName || !form.email) return;
    const newLead: Lead = {
      id: `L-${String(leads.length + 1).padStart(3, "0")}`,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      company: form.company,
      source: form.source,
      score: Math.floor(Math.random() * 40 + 30),
      status: "NEW",
      assignedTo: "Unassigned",
      value: parseFloat(form.value) || 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setLeads((prev) => [newLead, ...prev]);
    setForm({ firstName: "", lastName: "", email: "", company: "", source: "WEBSITE", value: "" });
    setOpen(false);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your sales leads pipeline</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add New Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Leads" value={String(totalLeads)} icon={Users} color="bg-blue-500" />
        <StatsCard title="New This Month" value={String(newThisMonth)} icon={TrendingUp} color="bg-purple-500" />
        <StatsCard title="Qualified" value={String(qualified)} icon={Star} color="bg-green-500" />
        <StatsCard title="Conversion Rate" value={`${conversionRate}%`} icon={BarChart2} color="bg-orange-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned To</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.company}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.source.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${lead.score >= 80 ? "bg-green-500" : lead.score >= 60 ? "bg-yellow-500" : "bg-red-400"}`}
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span className="text-gray-700 font-medium">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.assignedTo}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ${lead.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.createdAt}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">No leads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Lead Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="email@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="COLD_CALL">Cold Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                  <SelectItem value="TRADE_SHOW">Trade Show</SelectItem>
                  <SelectItem value="PARTNER">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Value ($)</Label>
              <Input type="number" placeholder="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
