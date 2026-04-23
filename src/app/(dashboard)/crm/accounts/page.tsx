"use client";

import { useState } from "react";
import { Building2, Users, TrendingUp, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";

type AccountType = "CUSTOMER" | "PROSPECT" | "PARTNER" | "VENDOR";
type Industry = "Technology" | "Finance" | "Healthcare" | "Retail" | "Manufacturing" | "Logistics" | "Education" | "Energy";

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
  { id: "ACC-001", name: "TechCorp Solutions", industry: "Technology", type: "CUSTOMER", phone: "+1 (415) 555-0192", city: "San Francisco, CA", revenue: 12500000, owner: "Marcus Williams", status: "active", createdAt: "2024-06-15" },
  { id: "ACC-002", name: "Global Retail Inc.", industry: "Retail", type: "CUSTOMER", phone: "+1 (212) 555-0148", city: "New York, NY", revenue: 87000000, owner: "Sarah Johnson", status: "active", createdAt: "2024-03-22" },
  { id: "ACC-003", name: "Nexus Finance", industry: "Finance", type: "CUSTOMER", phone: "+1 (312) 555-0271", city: "Chicago, IL", revenue: 340000000, owner: "Marcus Williams", status: "active", createdAt: "2023-11-10" },
  { id: "ACC-004", name: "HealthPlus Systems", industry: "Healthcare", type: "PROSPECT", phone: "+1 (617) 555-0334", city: "Boston, MA", revenue: 28000000, owner: "Emma Davis", status: "pending", createdAt: "2026-01-08" },
  { id: "ACC-005", name: "CloudBuild Technologies", industry: "Technology", type: "PROSPECT", phone: "+1 (206) 555-0417", city: "Seattle, WA", revenue: 15000000, owner: "Sarah Johnson", status: "pending", createdAt: "2026-02-14" },
  { id: "ACC-006", name: "Manufactura Group", industry: "Manufacturing", type: "CUSTOMER", phone: "+1 (313) 555-0509", city: "Detroit, MI", revenue: 62000000, owner: "Emma Davis", status: "active", createdAt: "2024-09-03" },
  { id: "ACC-007", name: "LogisticsPro", industry: "Logistics", type: "PARTNER", phone: "+1 (713) 555-0623", city: "Houston, TX", revenue: 19000000, owner: "Marcus Williams", status: "active", createdAt: "2025-04-17" },
  { id: "ACC-008", name: "Quantum Data AI", industry: "Technology", type: "CUSTOMER", phone: "+1 (650) 555-0781", city: "Palo Alto, CA", revenue: 8500000, owner: "Sarah Johnson", status: "active", createdAt: "2025-08-29" },
];

const ACCOUNT_FIELDS: EntityField[] = [
  { name: "name", label: "Account Name", type: "text", placeholder: "Company name", required: true, fullWidth: true },
  { name: "industry", label: "Industry", type: "select", defaultValue: "Technology", options: [
    { label: "Technology", value: "Technology" }, { label: "Finance", value: "Finance" },
    { label: "Healthcare", value: "Healthcare" }, { label: "Retail", value: "Retail" },
    { label: "Manufacturing", value: "Manufacturing" }, { label: "Logistics", value: "Logistics" },
    { label: "Education", value: "Education" }, { label: "Energy", value: "Energy" },
  ]},
  { name: "type", label: "Type", type: "select", defaultValue: "PROSPECT", options: [
    { label: "Customer", value: "CUSTOMER" }, { label: "Prospect", value: "PROSPECT" },
    { label: "Partner", value: "PARTNER" }, { label: "Vendor", value: "VENDOR" },
  ]},
  { name: "phone", label: "Phone", type: "text", placeholder: "+1 (555) 000-0000" },
  { name: "city", label: "City", type: "text", placeholder: "City, State" },
  { name: "revenue", label: "Annual Revenue ($)", type: "number", placeholder: "0" },
  { name: "owner", label: "Account Owner", type: "text", placeholder: "Rep name" },
];

const FILTER_FIELDS = [
  { key: "type", label: "Type", type: "select" as const, options: [
    { label: "Customer", value: "CUSTOMER" }, { label: "Prospect", value: "PROSPECT" },
    { label: "Partner", value: "PARTNER" }, { label: "Vendor", value: "VENDOR" },
  ]},
  { key: "industry", label: "Industry", type: "select" as const, options: [
    { label: "Technology", value: "Technology" }, { label: "Finance", value: "Finance" },
    { label: "Healthcare", value: "Healthcare" }, { label: "Retail", value: "Retail" },
    { label: "Manufacturing", value: "Manufacturing" },
  ]},
];

function TypeBadge({ type }: { type: AccountType }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[type]}`}>{type}</span>;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [filters, setFilters] = useState<FilterState>({ _search: "", type: "", industry: "" });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const filtered = accounts.filter((a) => {
    const q = (filters._search || "").toLowerCase();
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.industry.toLowerCase().includes(q) || a.city.toLowerCase().includes(q);
    const matchesType = !filters.type || a.type === filters.type;
    const matchesIndustry = !filters.industry || a.industry === filters.industry;
    return matchesSearch && matchesType && matchesIndustry;
  });

  const totalAccounts = accounts.length;
  const customers = accounts.filter((a) => a.type === "CUSTOMER").length;
  const prospects = accounts.filter((a) => a.type === "PROSPECT").length;
  const totalRevenue = accounts.filter((a) => a.type === "CUSTOMER").reduce((sum, a) => sum + a.revenue, 0);

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Account Name" },
    { key: "industry", label: "Industry" },
    { key: "type", label: "Type", render: (v) => <TypeBadge type={v as AccountType} /> },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "revenue", label: "Revenue", render: (v) => <span className="font-medium">${((v as number) / 1000000).toFixed(1)}M</span> },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "createdAt", label: "Created" },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const a = accounts.find((x) => x.id === row.id);
        if (!a) return null;
        return (
          <EditDeleteMenu
            onEdit={() => { setEditing(a); setShowModal(true); }}
            onDelete={() => setAccounts((prev) => prev.filter((x) => x.id !== a.id))}
            itemLabel={a.name}
            extraItems={a.type === "PROSPECT" ? [{ label: "Convert to Customer", onClick: () => setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, type: "CUSTOMER" as AccountType, status: "active" } : x)) }] : []}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Accounts" description="Manage your customer and prospect accounts">
        <Button onClick={() => { setEditing(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Account
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Accounts" value={totalAccounts} subtitle="All account types" icon={<Building2 className="w-5 h-5" />} trend={{ value: 5, label: "vs last month" }} />
        <StatsCard title="Customers" value={customers} subtitle="Active paying customers" icon={<Users className="w-5 h-5" />} />
        <StatsCard title="Prospects" value={prospects} subtitle="In evaluation phase" icon={<TrendingUp className="w-5 h-5" />} />
        <StatsCard title="Total Revenue" value={`$${(totalRevenue / 1000000).toFixed(0)}M`} subtitle="Customer accounts only" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 9, label: "vs last year" }} />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <FilterBar
            searchValue={filters._search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, _search: v }))}
            fields={FILTER_FIELDS}
            values={filters}
            onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          />
        </div>
        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} emptyMessage="No accounts found." />
      </div>

      <EntityFormModal
        open={showModal}
        onOpenChange={(open) => { if (!open) { setShowModal(false); setEditing(null); } }}
        title={editing ? "Edit Account" : "Add New Account"}
        fields={ACCOUNT_FIELDS}
        initialData={editing ? { name: editing.name, industry: editing.industry, type: editing.type, phone: editing.phone, city: editing.city, revenue: editing.revenue, owner: editing.owner } : undefined}
        onSubmit={(data) => {
          if (editing) {
            setAccounts((prev) => prev.map((a) => a.id === editing.id ? {
              ...a,
              name: data.name as string,
              industry: (data.industry as Industry) || a.industry,
              type: (data.type as AccountType) || a.type,
              phone: (data.phone as string) || a.phone,
              city: (data.city as string) || a.city,
              revenue: (data.revenue as number) || a.revenue,
              owner: (data.owner as string) || a.owner,
            } : a));
          } else {
            const newAccount: Account = {
              id: `ACC-${Date.now().toString(36)}`,
              name: data.name as string,
              industry: (data.industry as Industry) || "Technology",
              type: (data.type as AccountType) || "PROSPECT",
              phone: (data.phone as string) || "",
              city: (data.city as string) || "",
              revenue: (data.revenue as number) || 0,
              owner: (data.owner as string) || "Unassigned",
              status: (data.type as string) === "CUSTOMER" ? "active" : "pending",
              createdAt: new Date().toISOString().split("T")[0],
            };
            setAccounts((prev) => [newAccount, ...prev]);
          }
          setShowModal(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
