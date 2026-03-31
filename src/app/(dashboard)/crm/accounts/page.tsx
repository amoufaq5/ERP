"use client";

import { useState } from "react";
import { Building2, Users, TrendingUp, DollarSign, Plus, Search } from "lucide-react";
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
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";

type AccountType = "CUSTOMER" | "PROSPECT" | "PARTNER" | "VENDOR";
type Industry =
  | "Technology"
  | "Finance"
  | "Healthcare"
  | "Retail"
  | "Manufacturing"
  | "Logistics"
  | "Education"
  | "Energy";

interface Account {
  id: string;
  name: string;
  industry: Industry;
  type: AccountType;
  phone: string;
  city: string;
  revenue: number;
  owner: string;
  status: string;
  createdAt: string;
}

const TYPE_STYLES: Record<AccountType, string> = {
  CUSTOMER: "bg-green-100 text-green-800",
  PROSPECT: "bg-blue-100 text-blue-800",
  PARTNER: "bg-purple-100 text-purple-800",
  VENDOR: "bg-orange-100 text-orange-800",
};

const INITIAL_ACCOUNTS: Account[] = [
  {
    id: "ACC-001",
    name: "TechCorp Solutions",
    industry: "Technology",
    type: "CUSTOMER",
    phone: "+1 (415) 555-0192",
    city: "San Francisco, CA",
    revenue: 12500000,
    owner: "Marcus Williams",
    status: "active",
    createdAt: "2024-06-15",
  },
  {
    id: "ACC-002",
    name: "Global Retail Inc.",
    industry: "Retail",
    type: "CUSTOMER",
    phone: "+1 (212) 555-0148",
    city: "New York, NY",
    revenue: 87000000,
    owner: "Sarah Johnson",
    status: "active",
    createdAt: "2024-03-22",
  },
  {
    id: "ACC-003",
    name: "Nexus Finance",
    industry: "Finance",
    type: "CUSTOMER",
    phone: "+1 (312) 555-0271",
    city: "Chicago, IL",
    revenue: 340000000,
    owner: "Marcus Williams",
    status: "active",
    createdAt: "2023-11-10",
  },
  {
    id: "ACC-004",
    name: "HealthPlus Systems",
    industry: "Healthcare",
    type: "PROSPECT",
    phone: "+1 (617) 555-0334",
    city: "Boston, MA",
    revenue: 28000000,
    owner: "Emma Davis",
    status: "pending",
    createdAt: "2026-01-08",
  },
  {
    id: "ACC-005",
    name: "CloudBuild Technologies",
    industry: "Technology",
    type: "PROSPECT",
    phone: "+1 (206) 555-0417",
    city: "Seattle, WA",
    revenue: 15000000,
    owner: "Sarah Johnson",
    status: "pending",
    createdAt: "2026-02-14",
  },
  {
    id: "ACC-006",
    name: "Manufactura Group",
    industry: "Manufacturing",
    type: "CUSTOMER",
    phone: "+1 (313) 555-0509",
    city: "Detroit, MI",
    revenue: 62000000,
    owner: "Emma Davis",
    status: "active",
    createdAt: "2024-09-03",
  },
  {
    id: "ACC-007",
    name: "LogisticsPro",
    industry: "Logistics",
    type: "PARTNER",
    phone: "+1 (713) 555-0623",
    city: "Houston, TX",
    revenue: 19000000,
    owner: "Marcus Williams",
    status: "active",
    createdAt: "2025-04-17",
  },
  {
    id: "ACC-008",
    name: "Quantum Data AI",
    industry: "Technology",
    type: "CUSTOMER",
    phone: "+1 (650) 555-0781",
    city: "Palo Alto, CA",
    revenue: 8500000,
    owner: "Sarah Johnson",
    status: "active",
    createdAt: "2025-08-29",
  },
];

function TypeBadge({ type }: { type: AccountType }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[type]}`}
    >
      {type}
    </span>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "Technology" as Industry,
    type: "PROSPECT" as AccountType,
    phone: "",
    city: "",
    revenue: "",
    owner: "",
  });

  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.industry.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase())
  );

  const totalAccounts = accounts.length;
  const customers = accounts.filter((a) => a.type === "CUSTOMER").length;
  const prospects = accounts.filter((a) => a.type === "PROSPECT").length;
  const totalRevenue = accounts
    .filter((a) => a.type === "CUSTOMER")
    .reduce((sum, a) => sum + a.revenue, 0);

  function handleAdd() {
    if (!form.name) return;
    const newAccount: Account = {
      id: `ACC-${String(accounts.length + 1).padStart(3, "0")}`,
      name: form.name,
      industry: form.industry,
      type: form.type,
      phone: form.phone,
      city: form.city,
      revenue: parseFloat(form.revenue) || 0,
      owner: form.owner || "Unassigned",
      status: form.type === "CUSTOMER" ? "active" : "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setAccounts((prev) => [newAccount, ...prev]);
    setForm({
      name: "",
      industry: "Technology",
      type: "PROSPECT",
      phone: "",
      city: "",
      revenue: "",
      owner: "",
    });
    setOpen(false);
  }

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Account Name" },
    { key: "industry", label: "Industry" },
    {
      key: "type",
      label: "Type",
      render: (v) => <TypeBadge type={v as AccountType} />,
    },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    {
      key: "revenue",
      label: "Revenue",
      render: (v) => (
        <span className="font-medium">
          ${((v as number) / 1000000).toFixed(1)}M
        </span>
      ),
    },
    { key: "owner", label: "Owner" },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v as string} />,
    },
    { key: "createdAt", label: "Created" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage your customer and prospect accounts"
      >
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Account
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Accounts"
          value={totalAccounts}
          subtitle="All account types"
          icon={<Building2 className="w-5 h-5" />}
          trend={{ value: 5, label: "vs last month" }}
        />
        <StatsCard
          title="Customers"
          value={customers}
          subtitle="Active paying customers"
          icon={<Users className="w-5 h-5" />}
        />
        <StatsCard
          title="Prospects"
          value={prospects}
          subtitle="In evaluation phase"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000000).toFixed(0)}M`}
          subtitle="Customer accounts only"
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: 9, label: "vs last year" }}
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No accounts found."
        />
      </div>

      {/* Add New Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Account Name *</Label>
              <Input
                placeholder="Company name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select
                  value={form.industry}
                  onValueChange={(v) =>
                    setForm({ ...form, industry: v as Industry })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Technology",
                      "Finance",
                      "Healthcare",
                      "Retail",
                      "Manufacturing",
                      "Logistics",
                      "Education",
                      "Energy",
                    ].map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as AccountType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="PROSPECT">Prospect</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                placeholder="City, State"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Annual Revenue ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.revenue}
                  onChange={(e) =>
                    setForm({ ...form, revenue: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Owner</Label>
                <Input
                  placeholder="Rep name"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
