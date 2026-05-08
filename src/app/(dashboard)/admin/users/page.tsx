"use client";

import { useState, useMemo } from "react";
import {
  Users, Plus, Shield, UserCheck, UserX,
  Pencil, Trash2, Key, Clock, CheckCircle, XCircle,
} from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { EntityFormModal, type EntityField, type EntityFormData } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import StatusBadge from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser, ROLE_LABEL, ROLE_ROUTES, type AppUser, type UserRole } from "@/lib/user-context";
import { useAuditTrail } from "@/lib/audit-logger";
import { useTranslation } from "@/lib/i18n/i18n-context";

const ROLES: { label: string; value: UserRole }[] = [
  { label: "Administrator", value: "ADMIN" },
  { label: "Business Unit Manager", value: "BUM" },
  { label: "Marketeer", value: "MARKETEER" },
  { label: "District Manager", value: "DISTRICT_MANAGER" },
  { label: "Medical Representative", value: "MEDICAL_REP" },
  { label: "Accountant", value: "ACCOUNTANT" },
  { label: "Warehouse Manager", value: "WAREHOUSE" },
  { label: "HR Manager", value: "HR" },
];

const DEPARTMENTS = [
  "IT", "Executive", "Marketing", "Sales", "Finance",
  "Warehouse", "Human Resources", "Operations", "Quality",
];

export default function UserManagementPage() {
  const { t } = useTranslation();
  const { user: currentUser, allUsers, createUser, updateUser, deleteUser } = useCurrentUser();
  const audit = useAuditTrail();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  const activeUsers = allUsers.filter((u) => true); // all users considered active in current impl
  const adminCount = allUsers.filter((u) => u.role === "ADMIN").length;
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allUsers.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return counts;
  }, [allUsers]);

  const createFields: EntityField[] = [
    { name: "name", label: "Full Name", type: "text", required: true, placeholder: "Ahmed Hassan" },
    { name: "email", label: "Email", type: "email", required: true, placeholder: "ahmed@company.com" },
    { name: "role", label: "Role", type: "select", required: true, options: ROLES.map((r) => ({ label: r.label, value: r.value })), helperText: "Determines module access permissions" },
    { name: "department", label: "Department", type: "select", required: true, options: DEPARTMENTS.map((d) => ({ label: d, value: d })) },
    { name: "territory", label: "Territory", type: "text", placeholder: "Cairo North (for field roles)" },
    { name: "username", label: "Username (Login)", type: "text", required: true, placeholder: "ahmed.hassan" },
    { name: "password", label: "Password", type: "text", required: true, placeholder: "Minimum 8 characters" },
  ];

  const editFields: EntityField[] = [
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "role", label: "Role", type: "select", required: true, options: ROLES.map((r) => ({ label: r.label, value: r.value })) },
    { name: "department", label: "Department", type: "select", required: true, options: DEPARTMENTS.map((d) => ({ label: d, value: d })) },
    { name: "territory", label: "Territory", type: "text" },
  ];

  function handleCreate(data: EntityFormData) {
    const newUser = createUser({
      name: String(data.name),
      email: String(data.email),
      role: String(data.role) as UserRole,
      department: String(data.department),
      territory: data.territory ? String(data.territory) : undefined,
    });

    // Store credentials for login
    const creds = JSON.parse(localStorage.getItem("pharma.credentials") || "{}");
    creds[newUser.id] = { username: String(data.username), password: String(data.password) };
    localStorage.setItem("pharma.credentials", JSON.stringify(creds));

    audit.log({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "CREATE",
      module: "Admin",
      entity: "User",
      entityId: newUser.id,
      details: `Created user ${newUser.name} (${newUser.role})`,
    });
  }

  function handleUpdate(data: EntityFormData) {
    if (!editingUser) return;
    updateUser(editingUser.id, {
      name: String(data.name),
      email: String(data.email),
      role: String(data.role) as UserRole,
      department: String(data.department),
      territory: data.territory ? String(data.territory) : undefined,
    });

    audit.log({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "UPDATE",
      module: "Admin",
      entity: "User",
      entityId: editingUser.id,
      details: `Updated user ${data.name} — role: ${data.role}`,
    });
    setEditingUser(null);
  }

  function handleDelete(userId: string) {
    const target = allUsers.find((u) => u.id === userId);
    if (!target) return;
    if (target.id === currentUser.id) return; // Can't delete yourself
    if (target.id === "u-admin") return; // Can't delete primary admin

    deleteUser(userId);
    audit.log({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "DELETE",
      module: "Admin",
      entity: "User",
      entityId: userId,
      details: `Deactivated user ${target.name}`,
    });
  }

  function handleResetPassword() {
    if (!resetPasswordUser || !newPassword.trim()) return;
    const creds = JSON.parse(localStorage.getItem("pharma.credentials") || "{}");
    const existing = creds[resetPasswordUser.id];
    creds[resetPasswordUser.id] = {
      username: existing?.username || resetPasswordUser.email.split("@")[0],
      password: newPassword.trim(),
    };
    localStorage.setItem("pharma.credentials", JSON.stringify(creds));

    audit.log({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "UPDATE",
      module: "Admin",
      entity: "User",
      entityId: resetPasswordUser.id,
      details: `Reset password for ${resetPasswordUser.name}`,
    });
    setResetPasswordUser(null);
    setNewPassword("");
  }

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.role && filters.role !== "" && u.role !== filters.role) return false;
      if (filters.department && filters.department !== "" && u.department !== filters.department) return false;
      return true;
    });
  }, [allUsers, search, filters]);

  const auditEntries = audit.getRecent(50);

  const userColumns: Column<AppUser>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (_val: unknown, row: AppUser) => (
        <Badge className={
          row.role === "ADMIN" ? "bg-red-100 text-red-800" :
          row.role === "BUM" ? "bg-purple-100 text-purple-800" :
          "bg-blue-100 text-blue-800"
        }>
          {ROLE_LABEL[row.role] || row.role}
        </Badge>
      ),
    },
    { key: "department", label: "Department", sortable: true },
    {
      key: "territory",
      label: "Territory",
      render: (_val: unknown, row: AppUser) => row.territory || "—",
    },
    {
      key: "id",
      label: t("common.actions"),
      render: (_val: unknown, row: AppUser) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditingUser(row)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setResetPasswordUser(row); setNewPassword(""); }} title="Reset Password">
            <Key className="h-4 w-4" />
          </Button>
          {row.id !== "u-admin" && row.id !== currentUser.id && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} title="Deactivate">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const auditColumns: Column<typeof auditEntries[0]>[] = [
    {
      key: "timestamp",
      label: "Time",
      sortable: true,
      render: (val: unknown) => {
        const d = new Date(val as string);
        return d.toLocaleString();
      },
    },
    { key: "userName", label: "User", sortable: true },
    {
      key: "action",
      label: "Action",
      render: (val: unknown) => <StatusBadge status={val as string} />,
    },
    { key: "module", label: "Module" },
    { key: "entity", label: "Entity" },
    { key: "entityId", label: "Entity ID" },
    { key: "details", label: "Details" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create, edit, and manage user accounts, roles, and permissions"
        icon={<Users className="h-6 w-6 text-blue-600" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard icon={Users} title="Total Users" value={allUsers.length} iconColor="bg-blue-100 text-blue-600" />
        <StatsCard icon={UserCheck} title="Active Users" value={activeUsers.length} iconColor="bg-green-100 text-green-600" />
        <StatsCard icon={Shield} title="Admins" value={adminCount} iconColor="bg-red-100 text-red-600" />
        <StatsCard icon={Clock} title="Roles Used" value={Object.keys(roleCounts).length} subtitle={`of ${ROLES.length} available`} iconColor="bg-purple-100 text-purple-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Role Matrix</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search users by name or email..."
            fields={[
              { key: "role", label: "Role", type: "select", options: ROLES.map((r) => ({ label: r.label, value: r.value })) },
              { key: "department", label: "Department", type: "select", options: DEPARTMENTS.map((d) => ({ label: d, value: d })) },
            ]}
            values={filters}
            onChange={(key, val) => setFilters((prev) => ({ ...prev, [key]: val }))}
            rightSlot={
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" /> New User
              </Button>
            }
          />
          <DataTable columns={userColumns} data={filtered} pageSize={10} />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role Permissions Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-slate-600">Role</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-600">Users</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-600">ERP</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-600">CRM</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-600">ATS</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-600">Reports</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-600">Settings</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-600">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROLES.map((r) => {
                      const isAdmin = r.value === "ADMIN";
                      return (
                        <tr key={r.value} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <Badge className={r.value === "ADMIN" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
                                {r.label}
                              </Badge>
                              <span className="text-xs text-slate-400">({roleCounts[r.value] || 0})</span>
                            </div>
                          </td>
                          {["erp", "crm", "ats", "reports", "settings", "admin"].map((mod) => (
                            <td key={mod} className="text-center py-2 px-2">
                              {isAdmin ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                hasModuleAccess(r.value, mod) ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                                )
                              )}
                            </td>
                          ))}
                          <td className="text-center py-2 px-2">
                            {isAdmin ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={auditColumns} data={auditEntries} pageSize={15} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Create New User"
        description="Add a new user with role-based access control"
        fields={createFields}
        onSubmit={handleCreate}
        submitLabel="Create User"
        size="lg"
      />

      {editingUser && (
        <EntityFormModal
          open={!!editingUser}
          onOpenChange={(open) => { if (!open) setEditingUser(null); }}
          title={`Edit ${editingUser.name}`}
          description="Update user profile and role"
          fields={editFields}
          initialData={{
            name: editingUser.name,
            email: editingUser.email,
            role: editingUser.role,
            department: editingUser.department,
            territory: editingUser.territory || "",
          }}
          onSubmit={handleUpdate}
          submitLabel="Update User"
        />
      )}

      {resetPasswordUser && (
        <Dialog open={!!resetPasswordUser} onOpenChange={(open) => { if (!open) { setResetPasswordUser(null); setNewPassword(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Set a new password for {resetPasswordUser.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-1.5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(""); }}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleResetPassword} disabled={!newPassword.trim()}>
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function hasModuleAccess(role: string, module: string): boolean {
  const moduleRoutes: Record<string, string[]> = {
    erp: ["/erp/"],
    crm: ["/crm/"],
    ats: ["/ats/"],
    reports: ["/reports"],
    settings: ["/settings"],
    admin: ["/admin/"],
  };

  const routes: string[] = ROLE_ROUTES[role as UserRole] || [];
  if (routes.includes("*")) return true;

  const prefixes = moduleRoutes[module] || [];
  return routes.some((r: string) => prefixes.some((p: string) => r.startsWith(p)));
}
