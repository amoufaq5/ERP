"use client";

import { useState, useMemo } from "react";
import {
  Settings,
  Users,
  LayoutGrid,
  Save,
  ShieldCheck,
  RotateCcw,
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
} from "@/lib/user-context";
import { useAppConfig } from "@/lib/config-context";

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
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const { user, allUsers, navOverrides, setNavOverride } = useCurrentUser();
  const {
    config,
    updateFinance,
    updateInventory,
    updateProcurement,
    updateCRM,
    updateHR,
    updateAccounting,
    resetConfig,
  } = useAppConfig();

  const [tab, setTab] = useState<TabId>("general");
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers[0]?.id ?? "");

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
            <CardHeader>
              <CardTitle className="text-base">Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {ROLE_LABEL[u.role]}
                          {u.territory ? ` · ${u.territory}` : ""}
                        </p>
                      </div>
                      {navOverrides[u.id] && (
                        <Badge variant="warning" className="shrink-0 text-[10px]">
                          Custom
                        </Badge>
                      )}
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
