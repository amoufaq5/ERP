"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Building2,
  Plus,
  Users,
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  CreditCard,
  BarChart3,
  Star,
  Crown,
  Palette,
  ChevronDown,
  ChevronRight,
  UserPlus,
  UserMinus,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import StatusBadge from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { tenantStore } from "@/lib/tenant/tenant-store";
import type {
  Tenant,
  TenantUser,
  TenantPlanName,
  CreateTenantInput,
} from "@/lib/tenant/tenant-types";
import { TENANT_PLANS } from "@/lib/tenant/tenant-types";

// ─── Helpers ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const PLAN_BADGE_COLORS: Record<TenantPlanName, string> = {
  STARTER: "bg-blue-100 text-blue-800",
  PROFESSIONAL: "bg-purple-100 text-purple-800",
  ENTERPRISE: "bg-amber-100 text-amber-800",
};

// ─── Expanded Row with Users ────────────────────────────────────────

interface TenantDetailRowProps {
  tenant: Tenant;
  onRemoveUser: (tenantId: string, userId: string) => void;
  onAddUser: (tenantId: string) => void;
}

function TenantDetailRow({ tenant, onRemoveUser, onAddUser }: TenantDetailRowProps) {
  const users = tenantStore.getTenantUsers(tenant.id);
  const plan = TENANT_PLANS[tenant.plan];
  const userPct = plan.maxUsers === -1 ? 10 : Math.min(100, (users.length / tenant.maxUsers) * 100);
  const storagePct = 35; // demo placeholder

  return (
    <div className="bg-muted/30 border-t px-6 py-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Usage Bars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Users</span>
                <span className="font-medium">
                  {users.length} / {plan.maxUsers === -1 ? "Unlimited" : tenant.maxUsers}
                </span>
              </div>
              <Progress value={userPct} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">
                  {(storagePct / 100 * plan.maxStorageGB).toFixed(1)} GB / {plan.maxStorageGB} GB
                </span>
              </div>
              <Progress value={storagePct} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" /> Features Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1.5">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-1.5 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Users ({users.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAddUser(tenant.id)}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-xs text-muted-foreground">No users yet</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name}</div>
                      <div className="text-muted-foreground truncate">
                        {u.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {u.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onRemoveUser(tenant.id, u.id)}
                      >
                        <UserMinus className="h-3 w-3 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>(() => tenantStore.getTenants());
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Add-user dialog state
  const [addUserTenantId, setAddUserTenantId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("USER");

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createPlan, setCreatePlan] = useState<TenantPlanName>("STARTER");
  const [createAdminEmail, setCreateAdminEmail] = useState("");
  const [createAdminName, setCreateAdminName] = useState("");
  const [createAdminPassword, setCreateAdminPassword] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [editPlan, setEditPlan] = useState<TenantPlanName>("STARTER");
  const [editMaxUsers, setEditMaxUsers] = useState(10);
  const [editIsActive, setEditIsActive] = useState(true);

  // Refresh tenants from store
  const refreshTenants = useCallback(() => {
    setTenants(tenantStore.getTenants());
  }, []);

  // ─── Stats ──────────────────────────────────────────────────────

  const activeTenants = tenants.filter((t) => t.isActive).length;
  const totalUsers = tenants.reduce(
    (sum, t) => sum + tenantStore.getTenantUserCount(t.id),
    0
  );
  const plansBreakdown = useMemo(() => {
    const counts: Record<TenantPlanName, number> = { STARTER: 0, PROFESSIONAL: 0, ENTERPRISE: 0 };
    tenants.forEach((t) => { counts[t.plan]++; });
    return counts;
  }, [tenants]);

  // ─── Filtered list ────────────────────────────────────────────────

  const filtered = useMemo(
    () =>
      tenants.filter(
        (t) =>
          !search ||
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.toLowerCase().includes(search.toLowerCase()) ||
          (t.domain ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [tenants, search]
  );

  // ─── Handlers ─────────────────────────────────────────────────────

  function handleCreate() {
    if (!createName || !createSlug || !createAdminEmail) return;

    try {
      const input: CreateTenantInput = {
        name: createName,
        slug: createSlug,
        plan: createPlan,
      };
      const tenant = tenantStore.createTenant(input);

      // Add admin user
      tenantStore.addTenantUser(tenant.id, {
        email: createAdminEmail,
        name: createAdminName || createName + " Admin",
        role: "ADMIN",
      });

      refreshTenants();
      resetCreateForm();
      setShowCreate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create tenant");
    }
  }

  function resetCreateForm() {
    setCreateName("");
    setCreateSlug("");
    setCreatePlan("STARTER");
    setCreateAdminEmail("");
    setCreateAdminName("");
    setCreateAdminPassword("");
  }

  function openEditDialog(t: Tenant) {
    setEditTenant(t);
    setEditName(t.name);
    setEditDomain(t.domain ?? "");
    setEditLogo(t.logo ?? "");
    setEditColor(t.primaryColor ?? "#6366f1");
    setEditPlan(t.plan);
    setEditMaxUsers(t.maxUsers);
    setEditIsActive(t.isActive);
  }

  function handleUpdate() {
    if (!editTenant) return;
    try {
      tenantStore.updateTenant(editTenant.id, {
        name: editName || undefined,
        domain: editDomain || undefined,
        logo: editLogo || undefined,
        primaryColor: editColor || undefined,
        plan: editPlan,
        maxUsers: editMaxUsers,
        isActive: editIsActive,
      });
      refreshTenants();
      setEditTenant(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update tenant");
    }
  }

  function handleDeactivate(id: string) {
    tenantStore.deactivateTenant(id);
    refreshTenants();
    setDeleteConfirm(null);
  }

  function handleAddUser() {
    if (!addUserTenantId || !newUserEmail || !newUserName) return;
    try {
      tenantStore.addTenantUser(addUserTenantId, {
        email: newUserEmail,
        name: newUserName,
        role: newUserRole as "ADMIN" | "MANAGER" | "USER" | "VIEWER",
      });
      refreshTenants();
      setAddUserTenantId(null);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("USER");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add user");
    }
  }

  function handleRemoveUser(tenantId: string, userId: string) {
    try {
      tenantStore.removeTenantUser(tenantId, userId);
      refreshTenants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove user");
    }
  }

  // ─── Table Columns ────────────────────────────────────────────────

  const columns: Column<Tenant>[] = [
    {
      key: "expand",
      label: "",
      className: "w-8",
      render: (_val: unknown, row: Tenant) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId(expandedId === row.id ? null : row.id);
          }}
          className="p-1 hover:bg-accent rounded"
        >
          {expandedId === row.id ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      key: "name",
      label: "Tenant",
      sortable: true,
      render: (_val: unknown, row: Tenant) => (
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: row.primaryColor ?? "#6366f1" }}
          >
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.name}</div>
            <div className="text-xs text-muted-foreground truncate">{row.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      sortable: true,
      render: (_val: unknown, row: Tenant) => (
        <Badge className={cn(PLAN_BADGE_COLORS[row.plan], "gap-1")}>
          {row.plan === "ENTERPRISE" && <Crown className="h-3 w-3" />}
          {TENANT_PLANS[row.plan].label}
        </Badge>
      ),
    },
    {
      key: "users",
      label: "Users",
      sortable: false,
      render: (_val: unknown, row: Tenant) => {
        const count = tenantStore.getTenantUserCount(row.id);
        const max = row.maxUsers;
        return (
          <span>
            {count} / {TENANT_PLANS[row.plan].maxUsers === -1 ? "∞" : max}
          </span>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (_val: unknown, row: Tenant) => (
        <StatusBadge status={row.isActive ? "Active" : "Inactive"} />
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (_val: unknown, row: Tenant) =>
        new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_val: unknown, row: Tenant) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(row);
            }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(row.id);
              }}
              title="Deactivate"
            >
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
        description="Manage organizations, plans, and user access across the multi-tenant platform"
        icon={<Building2 className="h-6 w-6" />}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Building2}
          title="Total Tenants"
          value={tenants.length}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          icon={CheckCircle}
          title="Active"
          value={activeTenants}
          subtitle={`${tenants.length - activeTenants} inactive`}
          iconColor="bg-green-100 text-green-600"
        />
        <StatsCard
          icon={Users}
          title="Users Across Tenants"
          value={totalUsers}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatsCard
          icon={CreditCard}
          title="Plans Breakdown"
          value={`${plansBreakdown.ENTERPRISE}E / ${plansBreakdown.PROFESSIONAL}P / ${plansBreakdown.STARTER}S`}
          iconColor="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Filter + Add */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tenants by name, slug, or domain..."
        rightSlot={
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Tenant
          </Button>
        }
      />

      {/* Tenant Table */}
      <div>
        <DataTable columns={columns} data={filtered} pagination />
        {/* Expanded detail row */}
        {expandedId && (
          <TenantDetailRow
            tenant={tenantStore.getTenantById(expandedId)!}
            onRemoveUser={handleRemoveUser}
            onAddUser={(tenantId) => setAddUserTenantId(tenantId)}
          />
        )}
      </div>

      {/* ────────── Create Tenant Dialog ────────── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) resetCreateForm();
          setShowCreate(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Provision a new organization with isolated data and configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Organization Name *</Label>
              <Input
                id="create-name"
                placeholder="PharmaCorp Egypt"
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value);
                  setCreateSlug(slugify(e.target.value));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-slug">Slug *</Label>
              <Input
                id="create-slug"
                placeholder="pharmacorp-egypt"
                value={createSlug}
                onChange={(e) => setCreateSlug(slugify(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs: {createSlug || "slug"}.pharma-erp.com
              </p>
            </div>

            <div className="space-y-2">
              <Label>Plan</Label>
              <Select
                value={createPlan}
                onValueChange={(v) => setCreatePlan(v as TenantPlanName)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TENANT_PLANS) as TenantPlanName[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {TENANT_PLANS[p].label} &mdash;{" "}
                      {TENANT_PLANS[p].price === 0
                        ? "Free"
                        : `$${TENANT_PLANS[p].price}/mo`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Admin User</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="create-admin-name">Name</Label>
                  <Input
                    id="create-admin-name"
                    placeholder="Admin Name"
                    value={createAdminName}
                    onChange={(e) => setCreateAdminName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-admin-email">Email *</Label>
                  <Input
                    id="create-admin-email"
                    type="email"
                    placeholder="admin@company.com"
                    value={createAdminEmail}
                    onChange={(e) => setCreateAdminEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-admin-password">Password *</Label>
                <Input
                  id="create-admin-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={createAdminPassword}
                  onChange={(e) => setCreateAdminPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createName || !createSlug || !createAdminEmail || !createAdminPassword}
            >
              Create Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Edit Tenant Dialog ────────── */}
      <Dialog
        open={!!editTenant}
        onOpenChange={(open) => {
          if (!open) setEditTenant(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update settings for {editTenant?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-domain">Domain</Label>
              <Input
                id="edit-domain"
                placeholder="company.pharma-erp.com"
                value={editDomain}
                onChange={(e) => setEditDomain(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-logo">Logo URL</Label>
              <Input
                id="edit-logo"
                placeholder="https://..."
                value={editLogo}
                onChange={(e) => setEditLogo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="edit-color"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-10 w-14 rounded border border-input cursor-pointer"
                />
                <Input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="flex-1"
                  placeholder="#6366f1"
                />
                <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={editPlan}
                  onValueChange={(v) => setEditPlan(v as TenantPlanName)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TENANT_PLANS) as TenantPlanName[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {TENANT_PLANS[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-max-users">Max Users</Label>
                <Input
                  id="edit-max-users"
                  type="number"
                  min={1}
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="edit-active" className="font-medium">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">
                  Deactivated tenants lose access
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Deactivation Confirm Dialog ────────── */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this tenant? Their users will
              lose access immediately. Data is retained.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Keep Active
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeactivate(deleteConfirm)}
            >
              Deactivate Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────── Add User Dialog ────────── */}
      <Dialog
        open={!!addUserTenantId}
        onOpenChange={(open) => {
          if (!open) {
            setAddUserTenantId(null);
            setNewUserName("");
            setNewUserEmail("");
            setNewUserRole("USER");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Add a new user to{" "}
              {addUserTenantId
                ? tenantStore.getTenantById(addUserTenantId)?.name ?? "tenant"
                : "tenant"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Name *</Label>
              <Input
                id="new-user-name"
                placeholder="Full Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email *</Label>
              <Input
                id="new-user-email"
                type="email"
                placeholder="user@company.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddUserTenantId(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={!newUserName || !newUserEmail}
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Architecture Note */}
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
                <div className="font-semibold text-blue-800">
                  Tenant Request
                </div>
                <div>tenant.pharma-erp.com</div>
              </div>
            </div>
            <span className="text-lg">&rarr;</span>
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50">
              <Shield className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-semibold text-amber-800">Middleware</div>
                <div>Resolve tenant by domain/slug</div>
              </div>
            </div>
            <span className="text-lg">&rarr;</span>
            <div className="flex items-center gap-2 rounded-lg border p-3 bg-green-50">
              <Globe className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">
                  Isolated Store
                </div>
                <div>Scoped data + branding</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
