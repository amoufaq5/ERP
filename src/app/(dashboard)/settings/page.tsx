"use client";

import { useState, useMemo } from "react";
import {
  Settings,
  Users,
  LayoutGrid,
  Save,
  ShieldCheck,
  RotateCcw,
  Lock,
  Bell,
  Plug,
  HardDrive,
  Globe,
  Palette,
  FileClock,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useCurrentUser,
  ROLE_LABEL,
  ROLE_ROUTES,
  type AppUser,
  type UserRole,
} from "@/lib/user-context";
import { useAppConfig } from "@/lib/config-context";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { DeleteConfirmDialog } from "@/components/shared/edit-delete-menu";

// All routes that exist in the app — admin can grant/deny each per user
const ALL_ROUTES: { href: string; label: string; group: string }[] = [
  { group: "Main", href: "/dashboard", label: "Dashboard" },
  { group: "Main", href: "/messages", label: "Messages" },
  { group: "Main", href: "/tasks", label: "Tasks" },

  { group: "ERP", href: "/erp/finance", label: "Finance" },
  { group: "ERP", href: "/erp/accounting", label: "Accounting" },
  { group: "ERP", href: "/erp/procurement", label: "Procurement" },
  { group: "ERP", href: "/erp/inventory", label: "Inventory" },
  { group: "ERP", href: "/erp/projects", label: "Projects" },
  { group: "ERP", href: "/erp/hr", label: "HR & Payroll" },
  { group: "ERP", href: "/erp/manufacturing", label: "Manufacturing" },
  { group: "ERP", href: "/erp/returns", label: "Returns" },
  { group: "ERP", href: "/erp/collections", label: "Collections" },

  { group: "CRM", href: "/crm/medical-rep", label: "Medical Reps" },
  { group: "CRM", href: "/crm/district-manager", label: "District Manager" },
  { group: "CRM", href: "/crm/marketeer", label: "Marketeer" },
  { group: "CRM", href: "/crm/bum", label: "BUM Dashboard" },
  { group: "CRM", href: "/crm/doctors", label: "Doctor Directory" },
  { group: "CRM", href: "/crm/gps-tracking", label: "Visit Tracking" },
  { group: "CRM", href: "/crm/market-requests", label: "Market Requests" },
  { group: "CRM", href: "/crm/reports", label: "CRM Reports" },

  { group: "ATS", href: "/ats/jobs", label: "Jobs" },
  { group: "ATS", href: "/ats/candidates", label: "Candidates" },
  { group: "ATS", href: "/ats/interviews", label: "Interviews" },
  { group: "ATS", href: "/ats/onboarding", label: "Onboarding" },
  { group: "ATS", href: "/ats/training", label: "Training" },

  { group: "System", href: "/reports", label: "Reports" },
  { group: "System", href: "/industry", label: "Industry Solutions" },
  { group: "System", href: "/settings", label: "Settings" },
];

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "users", label: "Users & Access", icon: Users },
  { id: "modules", label: "Module Config", icon: LayoutGrid },
  { id: "permissions", label: "Permissions Matrix", icon: ShieldCheck },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "backup", label: "Backup & Recovery", icon: HardDrive },
  { id: "localization", label: "Localization", icon: Globe },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "audit", label: "Audit Log", icon: FileClock },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const {
    user,
    allUsers,
    navOverrides,
    setNavOverride,
    createUser,
    updateUser,
    deleteUser,
  } = useCurrentUser();
  const {
    config,
    updateFinance,
    updateInventory,
    updateProcurement,
    updateCRM,
    updateHR,
    updateAccounting,
    updateSecurity,
    updateNotifications,
    updateIntegrations,
    updateBackup,
    updateLocalization,
    updateAppearance,
    resetConfig,
  } = useAppConfig();

  const [tab, setTab] = useState<TabId>("general");
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers[0]?.id ?? "");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const userFormFields: EntityField[] = [
    { name: "name", label: "Full Name", type: "text", required: true, placeholder: "e.g. Dr. Sarah Ahmed" },
    { name: "email", label: "Email", type: "email", required: true, placeholder: "name@pharma.com" },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { label: "Administrator", value: "ADMIN" },
        { label: "Business Unit Manager", value: "BUM" },
        { label: "Marketeer", value: "MARKETEER" },
        { label: "District Manager", value: "DISTRICT_MANAGER" },
        { label: "Medical Representative", value: "MEDICAL_REP" },
        { label: "Accountant", value: "ACCOUNTANT" },
        { label: "Warehouse Manager", value: "WAREHOUSE" },
        { label: "HR Manager", value: "HR" },
      ],
    },
    { name: "department", label: "Department", type: "text", required: true, placeholder: "e.g. Sales" },
    { name: "territory", label: "Territory", type: "text", placeholder: "e.g. Cairo North" },
  ];

  function handleCreateUser() {
    setEditingUser(null);
    setUserFormOpen(true);
  }

  function handleEditUser(u: AppUser) {
    setEditingUser(u);
    setUserFormOpen(true);
  }

  function handleUserSubmit(data: EntityFormData) {
    const payload = {
      name: String(data.name),
      email: String(data.email),
      role: String(data.role) as UserRole,
      department: String(data.department),
      territory: data.territory ? String(data.territory) : undefined,
    };
    if (editingUser) {
      updateUser(editingUser.id, payload);
    } else {
      const created = createUser(payload);
      setSelectedUserId(created.id);
    }
    setUserFormOpen(false);
    setEditingUser(null);
  }

  function confirmDeleteUser() {
    if (deleteUserId) {
      deleteUser(deleteUserId);
      if (selectedUserId === deleteUserId) {
        setSelectedUserId(allUsers[0]?.id ?? "");
      }
    }
    setDeleteUserId(null);
  }

  const isAdmin = user.role === "ADMIN";
  const selectedUser = allUsers.find((u) => u.id === selectedUserId);
  const selectedOverride = selectedUser ? navOverrides[selectedUser.id] : null;
  const selectedAllowed = useMemo(() => {
    if (!selectedUser) return [] as string[];
    if (selectedOverride) return selectedOverride;
    return ROLE_ROUTES[selectedUser.role] ?? [];
  }, [selectedUser, selectedOverride]);

  function toggleRouteForUser(href: string) {
    if (!selectedUser) return;
    const current = selectedOverride ?? ROLE_ROUTES[selectedUser.role] ?? [];
    const next = current.includes(href)
      ? current.filter((h) => h !== href)
      : [...current, href];
    setNavOverride(selectedUser.id, next);
  }

  function resetUserOverride(u: AppUser) {
    setNavOverride(u.id, null);
  }

  const groups = useMemo(() => {
    const out: Record<string, typeof ALL_ROUTES> = {};
    ALL_ROUTES.forEach((r) => {
      if (!out[r.group]) out[r.group] = [];
      out[r.group].push(r);
    });
    return out;
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "System configuration, per-user interface customization, and module settings"
            : "Limited view — only administrators can modify these settings"}
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldCheck className="h-4 w-4 inline mr-2" />
          You are signed in as <strong>{ROLE_LABEL[user.role]}</strong>. To edit
          users, permissions or module configuration, switch to the Administrator
          account using the &ldquo;Switch Role&rdquo; button in the header.
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-1 -mb-px min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* General */}
      {tab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input defaultValue="Pharma Egypt S.A.E." disabled={!isAdmin} />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input defaultValue="Pharmaceutical" disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input defaultValue="Egypt" disabled={!isAdmin} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.finance.currency}
                  onChange={(e) => updateFinance({ currency: e.target.value })}
                  disabled={!isAdmin}
                >
                  <option value="EGP">EGP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Date Format</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.finance.dateFormat}
                  onChange={(e) =>
                    updateFinance({ dateFormat: e.target.value as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" })
                  }
                  disabled={!isAdmin}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>VAT Rate (%)</Label>
                <Input
                  type="number"
                  value={config.finance.taxRate}
                  onChange={(e) => updateFinance({ taxRate: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button disabled={!isAdmin}>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </Button>
              <Button variant="outline" onClick={resetConfig} disabled={!isAdmin}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users & Access */}
      {tab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User list */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Users</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={handleCreateUser}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 max-h-[560px] overflow-y-auto">
              <ul className="divide-y">
                {allUsers.map((u) => (
                  <li
                    key={u.id}
                    className={`p-3 cursor-pointer hover:bg-slate-50 ${
                      selectedUserId === u.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedUserId(u.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {ROLE_LABEL[u.role]}
                          {u.territory ? ` · ${u.territory}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {navOverrides[u.id] && (
                          <Badge variant="warning" className="text-[10px]">
                            Custom
                          </Badge>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditUser(u);
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit user"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            {u.id !== "u-admin" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteUserId(u.id);
                                }}
                                className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete user"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Per-user nav editor */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Interface for {selectedUser?.name ?? "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Toggle which menu items this user can see. {selectedOverride
                    ? "Currently using custom overrides."
                    : `Inheriting defaults from role: ${selectedUser ? ROLE_LABEL[selectedUser.role] : ""}.`}
                </p>
              </div>
              {selectedUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetUserOverride(selectedUser)}
                  disabled={!isAdmin || !selectedOverride}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset to Role Default
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Read-only — switch to Administrator to edit.
                </p>
              )}
              {selectedUser?.role === "ADMIN" && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                  Administrators always have full access. This setting is informational.
                </p>
              )}
              {Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
                    {group}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => {
                      const allowed =
                        selectedUser?.role === "ADMIN" ||
                        selectedAllowed.includes("*") ||
                        selectedAllowed.includes(item.href);
                      return (
                        <label
                          key={item.href}
                          className={`flex items-center gap-2 p-2 rounded border text-sm ${
                            allowed ? "bg-blue-50 border-blue-200" : "bg-white"
                          } ${isAdmin && selectedUser?.role !== "ADMIN" ? "cursor-pointer hover:border-blue-400" : "cursor-not-allowed opacity-80"}`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={allowed}
                            disabled={!isAdmin || selectedUser?.role === "ADMIN"}
                            onChange={() => toggleRouteForUser(item.href)}
                          />
                          <span className="truncate">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module Config */}
      {tab === "modules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Finance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Approval Threshold</Label>
                <Input
                  type="number"
                  value={config.finance.approvalThreshold}
                  onChange={(e) => updateFinance({ approvalThreshold: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fiscal Year Start (DD-MM)</Label>
                <Input
                  value={config.finance.fiscalYearStart}
                  onChange={(e) => updateFinance({ fiscalYearStart: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* Accounting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accounting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Chart of Accounts Type</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.accounting.chartType}
                  onChange={(e) =>
                    updateAccounting({ chartType: e.target.value as "Egyptian" | "IFRS" | "GAAP" })
                  }
                  disabled={!isAdmin}
                >
                  <option value="Egyptian">Egyptian Standard</option>
                  <option value="IFRS">IFRS</option>
                  <option value="GAAP">US GAAP</option>
                </select>
              </div>
              <ToggleRow
                label="Enable Cheque Management"
                value={config.accounting.enableCheques}
                onChange={(v) => updateAccounting({ enableCheques: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Enable Deferred Revenue"
                value={config.accounting.enableDeferredRevenue}
                onChange={(v) => updateAccounting({ enableDeferredRevenue: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>Bank Reconciliation</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.accounting.bankReconciliation}
                  onChange={(e) =>
                    updateAccounting({
                      bankReconciliation: e.target.value as "Daily" | "Weekly" | "Monthly",
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Expiry Alert (days)</Label>
                <Input
                  type="number"
                  value={config.inventory.expiryAlertDays}
                  onChange={(e) => updateInventory({ expiryAlertDays: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <ToggleRow
                label="Batch Tracking"
                value={config.inventory.enableBatchTracking}
                onChange={(v) => updateInventory({ enableBatchTracking: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Cold Chain Monitoring"
                value={config.inventory.enableColdChain}
                onChange={(v) => updateInventory({ enableColdChain: v })}
                disabled={!isAdmin}
              />
            </CardContent>
          </Card>

          {/* Procurement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Procurement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                label="Require GMP Certification"
                value={config.procurement.requireGMPCertification}
                onChange={(v) => updateProcurement({ requireGMPCertification: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Require Certificate of Analysis (CoA)"
                value={config.procurement.requireCoA}
                onChange={(v) => updateProcurement({ requireCoA: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Auto-generate GRN on Receipt"
                value={config.procurement.autoGenerateGRN}
                onChange={(v) => updateProcurement({ autoGenerateGRN: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>Approval Levels</Label>
                <Input
                  type="number"
                  value={config.procurement.approvalLevels}
                  onChange={(e) => updateProcurement({ approvalLevels: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* CRM */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CRM (Field Force)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                label="Require GPS for Visits"
                value={config.crm.requireGPSForVisits}
                onChange={(v) => updateCRM({ requireGPSForVisits: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>GPS Validation Radius (m)</Label>
                <Input
                  type="number"
                  value={config.crm.visitValidationRadius}
                  onChange={(e) => updateCRM({ visitValidationRadius: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Daily Visit Target / Rep</Label>
                <Input
                  type="number"
                  value={config.crm.dailyVisitTarget}
                  onChange={(e) => updateCRM({ dailyVisitTarget: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Coverage Target (%)</Label>
                <Input
                  type="number"
                  value={config.crm.coverageTarget}
                  onChange={(e) => updateCRM({ coverageTarget: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* HR */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">HR & Payroll</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Probation Period (months)</Label>
                <Input
                  type="number"
                  value={config.hr.probationMonths}
                  onChange={(e) => updateHR({ probationMonths: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Annual Leave (days)</Label>
                <Input
                  type="number"
                  value={config.hr.annualLeaveDays}
                  onChange={(e) => updateHR({ annualLeaveDays: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <ToggleRow
                label="Enable GMP Training"
                value={config.hr.enableGMPTraining}
                onChange={(v) => updateHR({ enableGMPTraining: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>Payroll Cycle</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.hr.payrollCycle}
                  onChange={(e) => updateHR({ payrollCycle: e.target.value as "Monthly" | "Bi-Weekly" })}
                  disabled={!isAdmin}
                >
                  <option>Monthly</option>
                  <option>Bi-Weekly</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security */}
      {tab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Minimum Length</Label>
                <Input
                  type="number"
                  value={config.security.passwordMinLength}
                  onChange={(e) => updateSecurity({ passwordMinLength: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <ToggleRow
                label="Require Uppercase Letter"
                value={config.security.passwordRequireUppercase}
                onChange={(v) => updateSecurity({ passwordRequireUppercase: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Require Number"
                value={config.security.passwordRequireNumber}
                onChange={(v) => updateSecurity({ passwordRequireNumber: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Require Symbol"
                value={config.security.passwordRequireSymbol}
                onChange={(v) => updateSecurity({ passwordRequireSymbol: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>Password Expiry (days)</Label>
                <Input
                  type="number"
                  value={config.security.passwordExpiryDays}
                  onChange={(e) => updateSecurity({ passwordExpiryDays: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session & Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  value={config.security.sessionTimeoutMinutes}
                  onChange={(e) => updateSecurity({ sessionTimeoutMinutes: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Login Attempts</Label>
                <Input
                  type="number"
                  value={config.security.maxLoginAttempts}
                  onChange={(e) => updateSecurity({ maxLoginAttempts: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <ToggleRow
                label="Enable Two-Factor Authentication"
                value={config.security.enableTwoFactor}
                onChange={(v) => updateSecurity({ enableTwoFactor: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Enforce Single Sign-On (SSO)"
                value={config.security.enforceSSO}
                onChange={(v) => updateSecurity({ enforceSSO: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="IP Whitelist Enabled"
                value={config.security.ipWhitelistEnabled}
                onChange={(v) => updateSecurity({ ipWhitelistEnabled: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>Audit Log Retention (days)</Label>
                <Input
                  type="number"
                  value={config.security.auditLogRetentionDays}
                  onChange={(e) => updateSecurity({ auditLogRetentionDays: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications */}
      {tab === "notifications" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                label="Email Notifications"
                value={config.notifications.emailEnabled}
                onChange={(v) => updateNotifications({ emailEnabled: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="SMS Notifications"
                value={config.notifications.smsEnabled}
                onChange={(v) => updateNotifications({ smsEnabled: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Push Notifications"
                value={config.notifications.pushEnabled}
                onChange={(v) => updateNotifications({ pushEnabled: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>Sender Email Address</Label>
                <Input
                  type="email"
                  value={config.notifications.emailFromAddress}
                  onChange={(e) => updateNotifications({ emailFromAddress: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Digest Frequency</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.notifications.digestFrequency}
                  onChange={(e) =>
                    updateNotifications({ digestFrequency: e.target.value as "Off" | "Daily" | "Weekly" })
                  }
                  disabled={!isAdmin}
                >
                  <option>Off</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alert Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                label="Notify on Batch Expiry"
                value={config.notifications.notifyOnExpiry}
                onChange={(v) => updateNotifications({ notifyOnExpiry: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Notify on Low Stock"
                value={config.notifications.notifyOnLowStock}
                onChange={(v) => updateNotifications({ notifyOnLowStock: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Notify on Cold Chain Alert"
                value={config.notifications.notifyOnColdChainAlert}
                onChange={(v) => updateNotifications({ notifyOnColdChainAlert: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Notify on Approval Required"
                value={config.notifications.notifyOnApprovalNeeded}
                onChange={(v) => updateNotifications({ notifyOnApprovalNeeded: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Notify on New Market Request"
                value={config.notifications.notifyOnNewMarketRequest}
                onChange={(v) => updateNotifications({ notifyOnNewMarketRequest: v })}
                disabled={!isAdmin}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integrations */}
      {tab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.integrations.mapProvider}
                  onChange={(e) =>
                    updateIntegrations({
                      mapProvider: e.target.value as "OpenStreetMap" | "Google" | "Mapbox",
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option value="OpenStreetMap">OpenStreetMap (Free, no key needed)</option>
                  <option value="Google">Google Maps</option>
                  <option value="Mapbox">Mapbox</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Map API Key (if required)</Label>
                <Input
                  type="password"
                  placeholder="Leave empty for OpenStreetMap"
                  value={config.integrations.mapApiKey}
                  onChange={(e) => updateIntegrations({ mapApiKey: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                OpenStreetMap is used by default and requires no API key.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SMTP (Email)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>SMTP Host</Label>
                <Input
                  value={config.integrations.smtpHost}
                  onChange={(e) => updateIntegrations({ smtpHost: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={config.integrations.smtpPort}
                    onChange={(e) => updateIntegrations({ smtpPort: Number(e.target.value) })}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>User</Label>
                  <Input
                    value={config.integrations.smtpUser}
                    onChange={(e) => updateIntegrations({ smtpUser: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              <ToggleRow
                label="Use TLS/SSL"
                value={config.integrations.smtpSecure}
                onChange={(v) => updateIntegrations({ smtpSecure: v })}
                disabled={!isAdmin}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">External Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                label="EDA e-Submission API (Egyptian Drug Authority)"
                value={config.integrations.edaApiEnabled}
                onChange={(v) => updateIntegrations({ edaApiEnabled: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="WhatsApp Business API"
                value={config.integrations.whatsappEnabled}
                onChange={(v) => updateIntegrations({ whatsappEnabled: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>WhatsApp Business Number</Label>
                <Input
                  placeholder="+20 100 000 0000"
                  value={config.integrations.whatsappNumber}
                  onChange={(e) => updateIntegrations({ whatsappNumber: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Webhook URL</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={config.integrations.webhookUrl}
                  onChange={(e) => updateIntegrations({ webhookUrl: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Backup & Recovery */}
      {tab === "backup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Automatic Backups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                label="Enable Automatic Backups"
                value={config.backup.autoBackupEnabled}
                onChange={(v) => updateBackup({ autoBackupEnabled: v })}
                disabled={!isAdmin}
              />
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.backup.backupFrequency}
                  onChange={(e) =>
                    updateBackup({ backupFrequency: e.target.value as "Hourly" | "Daily" | "Weekly" })
                  }
                  disabled={!isAdmin}
                >
                  <option>Hourly</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Retention (days)</Label>
                <Input
                  type="number"
                  value={config.backup.retentionDays}
                  onChange={(e) => updateBackup({ retentionDays: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <ToggleRow
                label="Encrypt Backups (AES-256)"
                value={config.backup.encryptBackups}
                onChange={(v) => updateBackup({ encryptBackups: v })}
                disabled={!isAdmin}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Storage & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Backup Location</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.backup.backupLocation}
                  onChange={(e) =>
                    updateBackup({
                      backupLocation: e.target.value as "Local" | "S3" | "Azure" | "GCP",
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option value="Local">Local Disk</option>
                  <option value="S3">Amazon S3</option>
                  <option value="Azure">Azure Blob Storage</option>
                  <option value="GCP">Google Cloud Storage</option>
                </select>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Backup</span>
                  <span className="font-medium">
                    {new Date(config.backup.lastBackupAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="success">Healthy</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={!isAdmin}>
                  Run Backup Now
                </Button>
                <Button size="sm" variant="outline" disabled={!isAdmin}>
                  Restore From Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Localization */}
      {tab === "localization" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regional Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="space-y-1.5">
                <Label>Default Language</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.localization.defaultLanguage}
                  onChange={(e) =>
                    updateLocalization({ defaultLanguage: e.target.value as "en" | "ar" | "fr" })
                  }
                  disabled={!isAdmin}
                >
                  <option value="en">English</option>
                  <option value="ar">العربية (Arabic)</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  value={config.localization.timezone}
                  onChange={(e) => updateLocalization({ timezone: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>First Day of Week</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.localization.firstDayOfWeek}
                  onChange={(e) =>
                    updateLocalization({
                      firstDayOfWeek: e.target.value as "Sunday" | "Monday" | "Saturday",
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option>Sunday</option>
                  <option>Monday</option>
                  <option>Saturday</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Number Format</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.localization.numberFormat}
                  onChange={(e) =>
                    updateLocalization({
                      numberFormat: e.target.value as "1,234.56" | "1.234,56" | "1 234.56",
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option value="1,234.56">1,234.56 (en-US)</option>
                  <option value="1.234,56">1.234,56 (de-DE)</option>
                  <option value="1 234.56">1 234.56 (fr-FR)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      {tab === "appearance" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance & Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="space-y-1.5">
                <Label>Theme</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.appearance.theme}
                  onChange={(e) =>
                    updateAppearance({ theme: e.target.value as "light" | "dark" | "auto" })
                  }
                  disabled={!isAdmin}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Primary Color</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.appearance.primaryColor}
                  onChange={(e) =>
                    updateAppearance({
                      primaryColor: e.target.value as "blue" | "green" | "purple" | "orange" | "red",
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="red">Red</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <ToggleRow
                label="Compact Mode (denser UI)"
                value={config.appearance.compactMode}
                onChange={(v) => updateAppearance({ compactMode: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Sidebar Collapsed by Default"
                value={config.appearance.sidebarDefaultCollapsed}
                onChange={(v) => updateAppearance({ sidebarDefaultCollapsed: v })}
                disabled={!isAdmin}
              />
              <ToggleRow
                label="Show Company Logo in Header"
                value={config.appearance.showCompanyLogo}
                onChange={(v) => updateAppearance({ showCompanyLogo: v })}
                disabled={!isAdmin}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {tab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent System Activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Retained for {config.security.auditLogRetentionDays} days. Export for SOX / GMP audits.
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Entity</th>
                  <th className="text-left p-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { t: "2026-04-11 09:42:18", u: "System Administrator", r: "ADMIN", a: "UPDATE", e: "Config › Security", ip: "10.0.0.12" },
                  { t: "2026-04-11 09:31:05", u: "Fatima El-Masry", r: "ACCOUNTANT", a: "CREATE", e: "Invoice INV-2026-0142", ip: "10.0.0.44" },
                  { t: "2026-04-11 09:15:32", u: "Mohamed El-Sayed", r: "MEDICAL_REP", a: "GPS_CHECKIN", e: "Visit V-0098 (Dr. Ahmed)", ip: "197.50.12.8" },
                  { t: "2026-04-11 08:58:10", u: "Khaled Farouk", r: "WAREHOUSE", a: "UPDATE", e: "Batch B-24-112", ip: "10.0.0.61" },
                  { t: "2026-04-11 08:42:44", u: "Dr. Hossam Tarek", r: "BUM", a: "EXPORT", e: "CRM Reports CSV", ip: "10.0.0.2" },
                  { t: "2026-04-11 08:30:21", u: "Laila Abdel-Rahman", r: "HR", a: "CREATE", e: "Job Posting J-0045", ip: "10.0.0.33" },
                  { t: "2026-04-11 08:10:03", u: "Ahmed Mostafa", r: "DISTRICT_MANAGER", a: "LOGIN", e: "—", ip: "197.50.22.1" },
                  { t: "2026-04-11 07:55:12", u: "System", r: "—", a: "BACKUP", e: "Daily automatic backup", ip: "—" },
                ].map((row, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-mono text-[10px]">{row.t}</td>
                    <td className="p-2">{row.u}</td>
                    <td className="p-2">
                      <Badge variant="secondary" className="text-[10px]">{row.r}</Badge>
                    </td>
                    <td className="p-2">
                      <span className="font-mono text-[10px]">{row.a}</span>
                    </td>
                    <td className="p-2 text-muted-foreground">{row.e}</td>
                    <td className="p-2 font-mono text-[10px] text-muted-foreground">{row.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Showing 8 of 24,418 entries</p>
              <Button size="sm" variant="outline" disabled={!isAdmin}>
                Export Full Log (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Matrix */}
      {tab === "permissions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role Permissions Matrix</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Default routes per role. Per-user overrides take precedence (set in &ldquo;Users &amp; Access&rdquo;).
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-2 font-semibold sticky left-0 bg-slate-50 z-10">Module</th>
                  {(["BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP", "ACCOUNTANT", "WAREHOUSE", "HR"] as const).map((r) => (
                    <th key={r} className="text-center p-2 font-semibold text-[10px]">
                      {ROLE_LABEL[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_ROUTES.map((route) => (
                  <tr key={route.href} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium sticky left-0 bg-white">
                      <div className="text-[10px] text-muted-foreground uppercase">{route.group}</div>
                      {route.label}
                    </td>
                    {(["BUM", "MARKETEER", "DISTRICT_MANAGER", "MEDICAL_REP", "ACCOUNTANT", "WAREHOUSE", "HR"] as const).map((r) => {
                      const has = ROLE_ROUTES[r].includes(route.href);
                      return (
                        <td key={r} className="text-center p-2">
                          {has ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="inline-block h-2 w-2 rounded-full bg-slate-200" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* User CRUD modal */}
      <EntityFormModal
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        title={editingUser ? `Edit ${editingUser.name}` : "Create User"}
        description="Assign a role that determines which modules this user can access."
        fields={userFormFields}
        initialData={
          editingUser
            ? {
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role,
                department: editingUser.department,
                territory: editingUser.territory ?? "",
              }
            : undefined
        }
        onSubmit={handleUserSubmit}
        submitLabel={editingUser ? "Save changes" : "Create user"}
      />

      <DeleteConfirmDialog
        open={!!deleteUserId}
        onOpenChange={(v) => !v && setDeleteUserId(null)}
        onConfirm={confirmDeleteUser}
        itemLabel={allUsers.find((u) => u.id === deleteUserId)?.name ?? "this user"}
        title="Delete user"
      />
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value ? "bg-blue-600" : "bg-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
