"use client";

import { useState, useMemo } from "react";
import {
  Building2, Plus, Users, Globe, Shield, CheckCircle, XCircle,
  Pencil, Trash2, CreditCard, Calendar, BarChart3, Star,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { FilterBar } from "@/components/shared/filter-bar";
import StatusBadge from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";

// ─── Types ──────────────────────────────────────────────────────────

type TenantStatus = "Active" | "Suspended" | "Trial" | "Cancelled";
type TenantPlan = "Free" | "Starter" | "Professional" | "Enterprise";

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: TenantPlan;
  status: TenantStatus;
  createdAt: string;
  usersCount: number;
  maxUsers: number;
  storageUsedMB: number;
  storageMaxMB: number;
  apiCallsMonth: number;
  apiCallsMax: number;
  contactEmail: string;
  contactName: string;
  features: Record<string, boolean>;
  subscriptionEnd: string;
  monthlyRevenue: number;
}

// ─── Plan Features ──────────────────────────────────────────────────

const PLAN_FEATURES: Record<TenantPlan, { maxUsers: number; storageMB: number; apiCalls: number; price: number; features: string[] }> = {
  Free: {
    maxUsers: 3,
    storageMB: 500,
    apiCalls: 1000,
    price: 0,
    features: ["Basic CRM", "5 Products", "Email Support"],
  },
  Starter: {
    maxUsers: 10,
    storageMB: 5000,
    apiCalls: 10000,
    price: 49,
    features: ["Full CRM", "Unlimited Products", "Invoicing", "Basic Reports", "Email Support"],
  },
  Professional: {
    maxUsers: 50,
    storageMB: 25000,
    apiCalls: 50000,
    price: 149,
    features: ["Full CRM", "Unlimited Products", "Invoicing", "Advanced Reports", "HR Module", "Inventory", "API Access", "Priority Support"],
  },
  Enterprise: {
    maxUsers: 500,
    storageMB: 100000,
    apiCalls: 500000,
    price: 499,
    features: ["All Modules", "Unlimited Products", "Custom Integrations", "White-label", "SLA 99.9%", "Dedicated Account Manager", "SSO/SAML", "Audit Logs"],
  },
};

// ─── Seed Data ──────────────────────────────────────────────────────

const SEED_TENANTS: Tenant[] = [
  {
    id: "tn-001",
    name: "NovaCure Pharmaceuticals",
    domain: "novacure.pharma-erp.com",
    plan: "Enterprise",
    status: "Active",
    createdAt: "2024-03-15T10:00:00Z",
    usersCount: 87,
    maxUsers: 500,
    storageUsedMB: 42300,
    storageMaxMB: 100000,
    apiCallsMonth: 128450,
    apiCallsMax: 500000,
    contactEmail: "admin@novacure-pharma.com",
    contactName: "Dr. Sarah El-Masry",
    features: { crm: true, hr: true, inventory: true, manufacturing: true, analytics: true, api: true, sso: true, audit: true },
    subscriptionEnd: "2027-03-14T23:59:59Z",
    monthlyRevenue: 499,
  },
  {
    id: "tn-002",
    name: "MediGen Solutions",
    domain: "medigen.pharma-erp.com",
    plan: "Professional",
    status: "Active",
    createdAt: "2024-08-22T14:30:00Z",
    usersCount: 23,
    maxUsers: 50,
    storageUsedMB: 8900,
    storageMaxMB: 25000,
    apiCallsMonth: 15200,
    apiCallsMax: 50000,
    contactEmail: "ops@medigen.com",
    contactName: "Ahmed Khalil",
    features: { crm: true, hr: true, inventory: true, manufacturing: false, analytics: true, api: true, sso: false, audit: false },
    subscriptionEnd: "2026-08-21T23:59:59Z",
    monthlyRevenue: 149,
  },
  {
    id: "tn-003",
    name: "BioVita Labs",
    domain: "biovita.pharma-erp.com",
    plan: "Starter",
    status: "Trial",
    createdAt: "2026-04-01T09:00:00Z",
    usersCount: 5,
    maxUsers: 10,
    storageUsedMB: 320,
    storageMaxMB: 5000,
    apiCallsMonth: 890,
    apiCallsMax: 10000,
    contactEmail: "info@biovitalabs.com",
    contactName: "Layla Hassan",
    features: { crm: true, hr: false, inventory: true, manufacturing: false, analytics: false, api: false, sso: false, audit: false },
    subscriptionEnd: "2026-05-01T23:59:59Z",
    monthlyRevenue: 49,
  },
  {
    id: "tn-004",
    name: "PharmaLink International",
    domain: "pharmalink.pharma-erp.com",
    plan: "Professional",
    status: "Suspended",
    createdAt: "2025-01-10T11:15:00Z",
    usersCount: 31,
    maxUsers: 50,
    storageUsedMB: 12400,
    storageMaxMB: 25000,
    apiCallsMonth: 0,
    apiCallsMax: 50000,
    contactEmail: "billing@pharmalink-intl.com",
    contactName: "Karim Mansour",
    features: { crm: true, hr: true, inventory: true, manufacturing: false, analytics: true, api: true, sso: false, audit: false },
    subscriptionEnd: "2026-01-09T23:59:59Z",
    monthlyRevenue: 149,
  },
];

// ─── Component ──────────────────────────────────────────────────────

export default function TenantsPage() {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<Tenant[]>(SEED_TENANTS);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [showPlanComparison, setShowPlanComparison] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ─── Stats ──────────────────────────────────────────────────────

  const activeTenants = tenants.filter((tn) => tn.status === "Active").length;
  const totalUsers = tenants.reduce((sum, tn) => sum + tn.usersCount, 0);
  const monthlyRevenue = tenants.filter((tn) => tn.status === "Active" || tn.status === "Trial").reduce((sum, tn) => sum + tn.monthlyRevenue, 0);

  // ─── Filtered list ────────────────────────────────────────────────

  const filtered = useMemo(() =>
    tenants.filter((tn) =>
      !search ||
      tn.name.toLowerCase().includes(search.toLowerCase()) ||
      tn.domain.toLowerCase().includes(search.toLowerCase()) ||
      tn.contactEmail.toLowerCase().includes(search.toLowerCase())
    ),
    [tenants, search]
  );

  // ─── Form Fields ──────────────────────────────────────────────────

  const createFields: EntityField[] = [
    { name: "name", label: "Company Name", type: "text", required: true, placeholder: "Acme Pharmaceuticals" },
    { name: "domain", label: "Domain", type: "text", required: true, placeholder: "acme.pharma-erp.com" },
    { name: "plan", label: "Plan", type: "select", required: true, defaultValue: "Starter", options: [
      { label: "Free", value: "Free" },
      { label: "Starter", value: "Starter" },
      { label: "Professional", value: "Professional" },
      { label: "Enterprise", value: "Enterprise" },
    ]},
    { name: "status", label: "Status", type: "select", defaultValue: "Trial", options: [
      { label: "Active", value: "Active" },
      { label: "Trial", value: "Trial" },
      { label: "Suspended", value: "Suspended" },
      { label: "Cancelled", value: "Cancelled" },
    ]},
    { name: "contactName", label: "Contact Name", type: "text", required: true, placeholder: "John Smith" },
    { name: "contactEmail", label: "Contact Email", type: "email", required: true, placeholder: "admin@company.com" },
    { name: "maxUsers", label: "Max Users", type: "number", defaultValue: 10, min: 1, max: 500 },
  ];

  const editFields: EntityField[] = [
    { name: "name", label: "Company Name", type: "text", required: true },
    { name: "domain", label: "Domain", type: "text", required: true },
    { name: "plan", label: "Plan", type: "select", required: true, options: [
      { label: "Free", value: "Free" },
      { label: "Starter", value: "Starter" },
      { label: "Professional", value: "Professional" },
      { label: "Enterprise", value: "Enterprise" },
    ]},
    { name: "status", label: "Status", type: "select", options: [
      { label: "Active", value: "Active" },
      { label: "Trial", value: "Trial" },
      { label: "Suspended", value: "Suspended" },
      { label: "Cancelled", value: "Cancelled" },
    ]},
    { name: "contactName", label: "Contact Name", type: "text", required: true },
    { name: "contactEmail", label: "Contact Email", type: "email", required: true },
    { name: "maxUsers", label: "Max Users", type: "number", min: 1, max: 500 },
  ];

  // ─── Handlers ─────────────────────────────────────────────────────

  function handleCreate(data: EntityFormData) {
    const plan = (data.plan as TenantPlan) || "Starter";
    const planInfo = PLAN_FEATURES[plan];
    const newTenant: Tenant = {
      id: `tn-${Date.now().toString(36)}`,
      name: data.name as string,
      domain: data.domain as string,
      plan,
      status: (data.status as TenantStatus) || "Trial",
      createdAt: new Date().toISOString(),
      usersCount: 1,
      maxUsers: (data.maxUsers as number) || planInfo.maxUsers,
      storageUsedMB: 0,
      storageMaxMB: planInfo.storageMB,
      apiCallsMonth: 0,
      apiCallsMax: planInfo.apiCalls,
      contactEmail: data.contactEmail as string,
      contactName: data.contactName as string,
      features: { crm: true, hr: plan !== "Free", inventory: plan !== "Free", manufacturing: plan === "Enterprise", analytics: plan === "Professional" || plan === "Enterprise", api: plan === "Professional" || plan === "Enterprise", sso: plan === "Enterprise", audit: plan === "Enterprise" },
      subscriptionEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
      monthlyRevenue: planInfo.price,
    };
    setTenants([...tenants, newTenant]);
    setShowCreate(false);
  }

  function handleUpdate(data: EntityFormData) {
    if (!editTenant) return;
    const plan = (data.plan as TenantPlan) || editTenant.plan;
    const planInfo = PLAN_FEATURES[plan];
    setTenants(tenants.map((tn) =>
      tn.id === editTenant.id
        ? {
            ...tn,
            name: (data.name as string) || tn.name,
            domain: (data.domain as string) || tn.domain,
            plan,
            status: (data.status as TenantStatus) || tn.status,
            contactName: (data.contactName as string) || tn.contactName,
            contactEmail: (data.contactEmail as string) || tn.contactEmail,
            maxUsers: (data.maxUsers as number) || tn.maxUsers,
            storageMaxMB: planInfo.storageMB,
            apiCallsMax: planInfo.apiCalls,
            monthlyRevenue: planInfo.price,
          }
        : tn
    ));
    setEditTenant(null);
  }

  function handleDelete(id: string) {
    setTenants(tenants.map((tn) =>
      tn.id === id ? { ...tn, status: "Cancelled" as TenantStatus } : tn
    ));
    setDeleteConfirm(null);
  }

  // ─── Table Columns ────────────────────────────────────────────────

  const columns: Column<Tenant>[] = [
    {
      key: "name",
      label: "Company",
      sortable: true,
      render: (_val: unknown, row: Tenant) => (
        <button className="text-blue-600 hover:underline font-medium text-left" onClick={() => setDetailTenant(row)}>
          {row.name}
        </button>
      ),
    },
    {
      key: "domain",
      label: "Domain",
      render: (_val: unknown, row: Tenant) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.domain}</code>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      sortable: true,
      render: (_val: unknown, row: Tenant) => {
        const colors: Record<TenantPlan, string> = {
          Free: "bg-gray-100 text-gray-800",
          Starter: "bg-blue-100 text-blue-800",
          Professional: "bg-purple-100 text-purple-800",
          Enterprise: "bg-amber-100 text-amber-800",
        };
        return <Badge className={colors[row.plan]}>{row.plan}</Badge>;
      },
    },
    {
      key: "status",
      label: t("common.status"),
      sortable: true,
      render: (_val: unknown, row: Tenant) => <StatusBadge status={row.status} />,
    },
    {
      key: "usersCount",
      label: "Users",
      sortable: true,
      render: (_val: unknown, row: Tenant) => `${row.usersCount} / ${row.maxUsers}`,
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (_val: unknown, row: Tenant) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (_val: unknown, row: Tenant) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditTenant(row)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          {row.status !== "Cancelled" && (
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(row.id)} title="Cancel Tenant">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant Management"
        description="Manage companies, plans, and access across the multi-tenant platform"
        actions={
          <Button variant="outline" onClick={() => setShowPlanComparison(true)}>
            <Star className="h-4 w-4 mr-2" /> Compare Plans
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={Building2} title="Total Tenants" value={tenants.length} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={CheckCircle} title="Active Tenants" value={activeTenants} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Users} title="Total Users" value={totalUsers} iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={CreditCard} title="Monthly Revenue" value={`$${monthlyRevenue.toLocaleString()}`} iconColor="bg-amber-100 text-amber-600" />
      </div>

      {/* Filter + Add */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tenants by name, domain, or email..."
        rightSlot={
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Tenant
          </Button>
        }
      />

      {/* Tenants Table */}
      <DataTable columns={columns} data={filtered} />

      {/* Create Modal */}
      <EntityFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Create New Tenant"
        description="Provision a new company with isolated data and configuration"
        fields={createFields}
        onSubmit={handleCreate}
        submitLabel="Create Tenant"
        size="lg"
      />

      {/* Edit Modal */}
      {editTenant && (
        <EntityFormModal
          open={!!editTenant}
          onOpenChange={(open) => { if (!open) setEditTenant(null); }}
          title={`Edit ${editTenant.name}`}
          fields={editFields}
          initialData={{
            name: editTenant.name,
            domain: editTenant.domain,
            plan: editTenant.plan,
            status: editTenant.status,
            contactName: editTenant.contactName,
            contactEmail: editTenant.contactEmail,
            maxUsers: editTenant.maxUsers,
          }}
          onSubmit={handleUpdate}
          submitLabel="Update Tenant"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this tenant? Their access will be revoked and data will be retained for 90 days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Keep Active</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Cancel Tenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {detailTenant && (
        <Dialog open={!!detailTenant} onOpenChange={(open) => { if (!open) setDetailTenant(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {detailTenant.name}
              </DialogTitle>
              <DialogDescription>Tenant details, usage statistics, and subscription info</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Domain:</span>{" "}<code className="bg-muted px-1 rounded text-xs">{detailTenant.domain}</code></div>
                <div><span className="text-muted-foreground">Contact:</span>{" "}<strong>{detailTenant.contactName}</strong></div>
                <div><span className="text-muted-foreground">Email:</span>{" "}<span>{detailTenant.contactEmail}</span></div>
                <div><span className="text-muted-foreground">Created:</span>{" "}<span>{new Date(detailTenant.createdAt).toLocaleDateString()}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Plan:</span>
                  <Badge className="bg-blue-100 text-blue-800">{detailTenant.plan}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={detailTenant.status} />
                </div>
              </div>

              {/* Usage Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Usage Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Users</span>
                      <span className="font-medium">{detailTenant.usersCount} / {detailTenant.maxUsers}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (detailTenant.usersCount / detailTenant.maxUsers) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Storage</span>
                      <span className="font-medium">{(detailTenant.storageUsedMB / 1000).toFixed(1)} GB / {(detailTenant.storageMaxMB / 1000).toFixed(0)} GB</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (detailTenant.storageUsedMB / detailTenant.storageMaxMB) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">API Calls (this month)</span>
                      <span className="font-medium">{(detailTenant.apiCallsMonth ?? 0).toLocaleString()} / {(detailTenant.apiCallsMax ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (detailTenant.apiCallsMonth / detailTenant.apiCallsMax) * 100)}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Flags */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Feature Flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(detailTenant.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        {enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                        )}
                        <span className={enabled ? "font-medium" : "text-muted-foreground"}>
                          {feature.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Plan:</span>{" "}<strong>{detailTenant.plan}</strong></div>
                    <div><span className="text-muted-foreground">Monthly:</span>{" "}<strong>${detailTenant.monthlyRevenue}/mo</strong></div>
                    <div>
                      <span className="text-muted-foreground">Renewal:</span>{" "}
                      <span>{new Date(detailTenant.subscriptionEnd).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Days Left:</span>{" "}
                      <strong>
                        {Math.max(0, Math.ceil((new Date(detailTenant.subscriptionEnd).getTime() - Date.now()) / 86400000))}
                      </strong>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Plan Comparison Dialog */}
      <Dialog open={showPlanComparison} onOpenChange={setShowPlanComparison}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Comparison</DialogTitle>
            <DialogDescription>Compare features across all available plans</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Feature</th>
                  {(Object.keys(PLAN_FEATURES) as TenantPlan[]).map((plan) => (
                    <th key={plan} className="text-center p-3 font-medium">{plan}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-muted/30">
                  <td className="p-3 font-medium">Monthly Price</td>
                  {(Object.keys(PLAN_FEATURES) as TenantPlan[]).map((plan) => (
                    <td key={plan} className="p-3 text-center font-bold">
                      {PLAN_FEATURES[plan].price === 0 ? "Free" : `$${PLAN_FEATURES[plan].price}`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3">Max Users</td>
                  {(Object.keys(PLAN_FEATURES) as TenantPlan[]).map((plan) => (
                    <td key={plan} className="p-3 text-center">{PLAN_FEATURES[plan].maxUsers}</td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-3">Storage</td>
                  {(Object.keys(PLAN_FEATURES) as TenantPlan[]).map((plan) => (
                    <td key={plan} className="p-3 text-center">{(PLAN_FEATURES[plan].storageMB / 1000).toFixed(0)} GB</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3">API Calls / month</td>
                  {(Object.keys(PLAN_FEATURES) as TenantPlan[]).map((plan) => (
                    <td key={plan} className="p-3 text-center">{PLAN_FEATURES[plan].apiCalls.toLocaleString()}</td>
                  ))}
                </tr>
                {["Full CRM", "Invoicing", "Basic Reports", "Advanced Reports", "HR Module", "Inventory", "API Access", "Custom Integrations", "White-label", "SSO/SAML", "Audit Logs", "SLA 99.9%", "Dedicated Account Manager", "Priority Support"].map((feature) => (
                  <tr key={feature} className="border-b">
                    <td className="p-3">{feature}</td>
                    {(Object.keys(PLAN_FEATURES) as TenantPlan[]).map((plan) => (
                      <td key={plan} className="p-3 text-center">
                        {PLAN_FEATURES[plan].features.some((f) => f.toLowerCase().includes(feature.toLowerCase().replace("full ", "")) || f === feature) ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Architecture Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" /> Multi-Tenancy Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-800">Tenant Request</div>
                <div>tenant.pharma-erp.com</div>
              </div>
            </div>
            <span className="text-lg">&#8594;</span>
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50">
              <Shield className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-semibold text-amber-800">Middleware</div>
                <div>Resolve tenant by domain</div>
              </div>
            </div>
            <span className="text-lg">&#8594;</span>
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-green-50">
              <Globe className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">Isolated Store</div>
                <div>Scoped data context</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
