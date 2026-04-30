"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Users, Globe, Shield, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { FilterBar } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/i18n-context";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo: string | null;
  primaryColor: string | null;
  plan: string;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number };
  users?: { id: string; email: string; name: string; role: string; isActive: boolean }[];
}

export default function TenantsPage() {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const activeTenants = tenants.filter((tn) => tn.isActive).length;
  const totalUsers = tenants.reduce((sum: number, tn: Tenant) => sum + (tn._count?.users || 0), 0);
  const planCounts = tenants.reduce(
    (acc: Record<string, number>, tn: Tenant) => { acc[tn.plan] = (acc[tn.plan] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const createFields: EntityField[] = [
    { name: "name", label: "Company Name", type: "text", required: true, placeholder: "Acme Pharmaceuticals" },
    { name: "slug", label: "Slug (URL identifier)", type: "text", required: true, placeholder: "acme-pharma", helperText: "Used in subdomain: slug.yourdomain.com" },
    { name: "domain", label: "Custom Domain", type: "text", placeholder: "erp.acme-pharma.com" },
    { name: "plan", label: "Plan", type: "select", defaultValue: "STARTER", options: [
      { label: "Starter", value: "STARTER" },
      { label: "Professional", value: "PROFESSIONAL" },
      { label: "Enterprise", value: "ENTERPRISE" },
    ]},
    { name: "maxUsers", label: "Max Users", type: "number", defaultValue: 10, min: 1, max: 1000 },
    { name: "primaryColor", label: "Brand Color", type: "text", defaultValue: "#2563eb", placeholder: "#2563eb" },
    { name: "adminName", label: "Admin Name", type: "text", required: true, placeholder: "Company Admin" },
    { name: "adminEmail", label: "Admin Email", type: "email", required: true, placeholder: "admin@acme-pharma.com" },
    { name: "adminPassword", label: "Admin Password", type: "text", required: true, placeholder: "Strong password" },
  ];

  const editFields: EntityField[] = [
    { name: "name", label: "Company Name", type: "text", required: true },
    { name: "domain", label: "Custom Domain", type: "text" },
    { name: "plan", label: "Plan", type: "select", options: [
      { label: "Starter", value: "STARTER" },
      { label: "Professional", value: "PROFESSIONAL" },
      { label: "Enterprise", value: "ENTERPRISE" },
    ]},
    { name: "maxUsers", label: "Max Users", type: "number", min: 1, max: 1000 },
    { name: "primaryColor", label: "Brand Color", type: "text" },
    { name: "isActive", label: "Active", type: "checkbox" },
  ];

  async function handleCreate(data: EntityFormData) {
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) fetchTenants();
    } catch { /* silently fail */ }
  }

  async function handleUpdate(data: EntityFormData) {
    if (!editTenant) return;
    try {
      const res = await fetch(`/api/tenants/${editTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchTenants();
        setEditTenant(null);
      }
    } catch { /* silently fail */ }
  }

  async function handleDeactivate(id: string) {
    try {
      await fetch(`/api/tenants/${id}`, { method: "DELETE" });
      fetchTenants();
    } catch { /* silently fail */ }
  }

  async function viewDetail(tenant: Tenant) {
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailTenant(data.tenant);
      }
    } catch {
      setDetailTenant(tenant);
    }
  }

  const filtered = tenants.filter((tn) =>
    !search || tn.name.toLowerCase().includes(search.toLowerCase()) || tn.slug.includes(search.toLowerCase())
  );

  const columns: Column<Tenant>[] = [
    {
      key: "name",
      label: "Company",
      render: (_val: unknown, row: Tenant) => (
        <button className="text-blue-600 hover:underline font-medium" onClick={() => viewDetail(row)}>
          {row.name}
        </button>
      ),
    },
    { key: "slug", label: "Slug" },
    { key: "domain", label: "Domain", render: (_val: unknown, row: Tenant) => row.domain || "—" },
    {
      key: "plan",
      label: "Plan",
      render: (_val: unknown, row: Tenant) => (
        <Badge className={row.plan === "ENTERPRISE" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}>
          {row.plan}
        </Badge>
      ),
    },
    { key: "_count", label: "Users", render: (_val: unknown, row: Tenant) => String(row._count?.users ?? 0) },
    { key: "maxUsers", label: "Max Users" },
    {
      key: "isActive",
      label: t("common.status"),
      render: (_val: unknown, row: Tenant) =>
        row.isActive ? (
          <Badge className="bg-green-100 text-green-800">Active</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (_val: unknown, row: Tenant) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditTenant(row); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          {row.isActive && (
            <Button variant="ghost" size="sm" onClick={() => handleDeactivate(row.id)}>
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
        description="Manage companies, databases, and user access across the platform"
        icon={<Building2 className="h-6 w-6 text-blue-600" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={Building2} title="Total Tenants" value={tenants.length} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={CheckCircle} title="Active" value={activeTenants} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Users} title="Total Users" value={totalUsers} iconColor="bg-purple-100 text-purple-600" />
        <StatsCard icon={Shield} title="Enterprise" value={planCounts["ENTERPRISE"] || 0} iconColor="bg-amber-100 text-amber-600" />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tenants..."
        rightSlot={
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Tenant
          </Button>
        }
      />

      {loading ? (
        <Card><CardContent className="p-8 text-center text-slate-500">{t("common.loading")}</CardContent></Card>
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={10} />
      )}

      <EntityFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Create New Tenant"
        description="Provision a new company with its own isolated database"
        fields={createFields}
        onSubmit={handleCreate}
        submitLabel="Create Tenant"
        size="lg"
      />

      {editTenant && (
        <EntityFormModal
          open={!!editTenant}
          onOpenChange={(open) => { if (!open) setEditTenant(null); }}
          title={`Edit ${editTenant.name}`}
          fields={editFields}
          initialData={{
            name: editTenant.name,
            domain: editTenant.domain || "",
            plan: editTenant.plan,
            maxUsers: editTenant.maxUsers,
            primaryColor: editTenant.primaryColor || "#2563eb",
            isActive: editTenant.isActive,
          }}
          onSubmit={handleUpdate}
          submitLabel="Update"
        />
      )}

      {detailTenant && (
        <Dialog open={!!detailTenant} onOpenChange={(open) => { if (!open) setDetailTenant(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{detailTenant.name}</DialogTitle>
              <DialogDescription>Tenant details and user list</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Slug:</span> <strong>{detailTenant.slug}</strong></div>
                <div><span className="text-slate-500">Domain:</span> <strong>{detailTenant.domain || "—"}</strong></div>
                <div><span className="text-slate-500">Plan:</span> <Badge className="bg-blue-100 text-blue-800">{detailTenant.plan}</Badge></div>
                <div><span className="text-slate-500">Max Users:</span> <strong>{detailTenant.maxUsers}</strong></div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  {detailTenant.isActive ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                <div>
                  <span className="text-slate-500">Brand Color:</span>{" "}
                  <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: detailTenant.primaryColor || "#2563eb" }} />
                  {" "}{detailTenant.primaryColor || "#2563eb"}
                </div>
              </div>

              {detailTenant.users && detailTenant.users.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Users ({detailTenant.users.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {detailTenant.users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm border-b pb-2">
                          <div>
                            <span className="font-medium">{u.name}</span>
                            <span className="text-slate-500 ml-2">{u.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-slate-100 text-slate-800">{u.role}</Badge>
                            {u.isActive ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" /> Multi-Tenancy Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold">Tenant Request</div>
                <div>acme.yourdomain.com</div>
              </div>
            </div>
            <span className="text-lg">→</span>
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50">
              <Shield className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-semibold">Middleware</div>
                <div>Resolve tenant by subdomain</div>
              </div>
            </div>
            <span className="text-lg">→</span>
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-green-50">
              <Globe className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold">Isolated DB</div>
                <div>acme-pharma.db</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
