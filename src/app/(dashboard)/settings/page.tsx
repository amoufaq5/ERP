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
  Upload,
  KeyRound,
  UserX,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Car,
  Monitor,
  Moon,
  Sun,
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
import { useAuditLogger, type AuditFilters } from "@/lib/audit-logger";
import {
  EntityFormModal,
  type EntityField,
  type EntityFormData,
} from "@/components/shared/entity-form-modal";
import { DeleteConfirmDialog } from "@/components/shared/edit-delete-menu";
import { useTranslation } from "@/lib/i18n/i18n-context";

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
  { group: "ERP", href: "/erp/products", label: "Products" },
  { group: "ERP", href: "/erp/sales-order", label: "Sales Orders" },
  { group: "ERP", href: "/erp/integrations", label: "Integrations" },
  { group: "ERP", href: "/erp/workflows", label: "Workflows" },

  { group: "CRM", href: "/crm/medical-rep", label: "Medical Reps" },
  { group: "CRM", href: "/crm/district-manager", label: "District Manager" },
  { group: "CRM", href: "/crm/marketeer", label: "Marketeer" },
  { group: "CRM", href: "/crm/bum", label: "BUM Dashboard" },
  { group: "CRM", href: "/crm/territories", label: "Territories (IMS)" },
  { group: "CRM", href: "/crm/doctors", label: "Doctor Directory" },
  { group: "CRM", href: "/crm/gps-tracking", label: "Visit Tracking" },
  { group: "CRM", href: "/crm/market-requests", label: "Market Requests" },
  { group: "CRM", href: "/crm/reports", label: "CRM Reports" },
  { group: "CRM", href: "/crm/kpis", label: "KPIs" },
  { group: "CRM", href: "/crm/expenses", label: "Expenses" },
  { group: "CRM", href: "/crm/business-units", label: "Business Units" },
  { group: "CRM", href: "/crm/weekly-plan", label: "Weekly Plans" },
  { group: "CRM", href: "/crm/my-team", label: "My Team" },
  { group: "CRM", href: "/crm/call-analysis", label: "Call Analysis" },
  { group: "CRM", href: "/crm/accounts", label: "Accounts" },
  { group: "CRM", href: "/crm/contacts", label: "Contacts" },
  { group: "CRM", href: "/crm/leads", label: "Sales Pipeline" },
  { group: "CRM", href: "/crm/campaigns", label: "Marketing Hub" },
  { group: "CRM", href: "/crm/loyalty", label: "Loyalty" },
  { group: "CRM", href: "/crm/tickets", label: "Tickets" },

  { group: "ATS", href: "/ats/jobs", label: "Jobs" },
  { group: "ATS", href: "/ats/candidates", label: "Candidates" },
  { group: "ATS", href: "/ats/interviews", label: "Interviews" },
  { group: "ATS", href: "/ats/onboarding", label: "Onboarding" },
  { group: "ATS", href: "/ats/training", label: "Training" },
  { group: "ATS", href: "/ats/quizzes", label: "Quizzes" },

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

// Role badge color map
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800 border-red-200",
  BUM: "bg-purple-100 text-purple-800 border-purple-200",
  MARKETEER: "bg-pink-100 text-pink-800 border-pink-200",
  DISTRICT_MANAGER: "bg-blue-100 text-blue-800 border-blue-200",
  MEDICAL_REP: "bg-teal-100 text-teal-800 border-teal-200",
  ACCOUNTANT: "bg-amber-100 text-amber-800 border-amber-200",
  WAREHOUSE: "bg-orange-100 text-orange-800 border-orange-200",
  HR: "bg-green-100 text-green-800 border-green-200",
};

// Company profile stored in localStorage
interface CompanyProfile {
  name: string;
  logo: string; // base64
  address: string;
  phone: string;
  taxId: string;
  commercialRegister: string;
}

const COMPANY_PROFILE_KEY = "pharma.companyProfile";
const GENERAL_SETTINGS_KEY = "pharma.generalSettings";

interface GeneralSettings {
  fiscalYearStartMonth: number; // 1-12
  workingDays: string[]; // e.g. ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"]
  ratePerKm: number;
}

const DEFAULT_COMPANY: CompanyProfile = {
  name: "Pharma Egypt S.A.E.",
  logo: "",
  address: "6th of October City, Giza Governorate, Egypt",
  phone: "+20 2 3456 7890",
  taxId: "123-456-789",
  commercialRegister: "CR-2020-54321",
};

const DEFAULT_GENERAL: GeneralSettings = {
  fiscalYearStartMonth: 1,
  workingDays: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
  ratePerKm: 2.50,
};

const ALL_WEEKDAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// IP whitelist stored separately
const IP_WHITELIST_KEY = "pharma.ipWhitelist";

// Notification event types for granular control
const NOTIFICATION_EVENTS = [
  { key: "planSubmitted", label: "Weekly plan submitted for approval", group: "CRM" },
  { key: "planApproved", label: "Weekly plan approved", group: "CRM" },
  { key: "expenseSubmitted", label: "Expense report submitted", group: "CRM" },
  { key: "expenseApproved", label: "Expense report approved/rejected", group: "CRM" },
  { key: "visitCompleted", label: "Visit completed", group: "CRM" },
  { key: "invoiceCreated", label: "New invoice created", group: "Finance" },
  { key: "paymentReceived", label: "Payment received", group: "Finance" },
  { key: "lowStock", label: "Low stock alert", group: "Inventory" },
  { key: "batchExpiry", label: "Batch nearing expiry", group: "Inventory" },
  { key: "coldChainAlert", label: "Cold chain temperature breach", group: "Inventory" },
  { key: "leaveRequested", label: "Leave request submitted", group: "HR" },
  { key: "newHireOnboarded", label: "New hire onboarded", group: "HR" },
  { key: "marketRequest", label: "New market request", group: "CRM" },
  { key: "ticketEscalated", label: "Support ticket escalated", group: "CRM" },
];

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
  const { t } = useTranslation();
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

  const { logs, getAuditLogs } = useAuditLogger();

  const [tab, setTab] = useState<TabId>("general");
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers[0]?.id ?? "");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Company profile state
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const raw = localStorage.getItem(COMPANY_PROFILE_KEY);
      return raw ? { ...DEFAULT_COMPANY, ...JSON.parse(raw) } : DEFAULT_COMPANY;
    } catch { return DEFAULT_COMPANY; }
  });

  // General settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => {
    try {
      const raw = localStorage.getItem(GENERAL_SETTINGS_KEY);
      return raw ? { ...DEFAULT_GENERAL, ...JSON.parse(raw) } : DEFAULT_GENERAL;
    } catch { return DEFAULT_GENERAL; }
  });

  // IP whitelist
  const [ipWhitelist, setIpWhitelist] = useState<string>(() => {
    try {
      return localStorage.getItem(IP_WHITELIST_KEY) || "";
    } catch { return ""; }
  });

  // Notification event toggles
  const [notifEvents, setNotifEvents] = useState<Record<string, { email: boolean; inApp: boolean; escalation: boolean }>>(() => {
    try {
      const raw = localStorage.getItem("pharma.notifEvents");
      return raw ? JSON.parse(raw) : Object.fromEntries(
        NOTIFICATION_EVENTS.map((e) => [e.key, { email: true, inApp: true, escalation: false }])
      );
    } catch {
      return Object.fromEntries(
        NOTIFICATION_EVENTS.map((e) => [e.key, { email: true, inApp: true, escalation: false }])
      );
    }
  });

  // Audit log filters
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({});
  const [auditPage, setAuditPage] = useState(0);
  const AUDIT_PAGE_SIZE = 15;

  // Custom roles
  const [customRoles, setCustomRoles] = useState<{ id: string; name: string; description: string; routes: string[] }[]>(() => {
    try {
      const raw = localStorage.getItem("pharma.customRoles");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [customRoleFormOpen, setCustomRoleFormOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleRoutes, setNewRoleRoutes] = useState<string[]>([]);

  // General tab: section collapse state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    companyProfile: true,
    systemDefaults: true,
    workingWeek: false,
    kilometrage: false,
  });

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function deleteCustomRole(id: string) {
    const next = customRoles.filter((r) => r.id !== id);
    setCustomRoles(next);
    try { localStorage.setItem("pharma.customRoles", JSON.stringify(next)); } catch {}
  }

  function saveCompanyProfile(patch: Partial<CompanyProfile>) {
    const next = { ...companyProfile, ...patch };
    setCompanyProfile(next);
    try { localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(next)); } catch {}
  }

  function saveGeneralSettings(patch: Partial<GeneralSettings>) {
    const next = { ...generalSettings, ...patch };
    setGeneralSettings(next);
    try { localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(next)); } catch {}
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      saveCompanyProfile({ logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function saveIpWhitelist(value: string) {
    setIpWhitelist(value);
    try { localStorage.setItem(IP_WHITELIST_KEY, value); } catch {}
  }

  function toggleNotifEvent(key: string, channel: "email" | "inApp" | "escalation") {
    const updated = {
      ...notifEvents,
      [key]: { ...notifEvents[key], [channel]: !notifEvents[key]?.[channel] },
    };
    setNotifEvents(updated);
    try { localStorage.setItem("pharma.notifEvents", JSON.stringify(updated)); } catch {}
  }

  const userFormFields: EntityField[] = [
    { name: "name", label: "Full Name", type: "text", required: true, placeholder: "e.g. Dr. Sarah Ahmed" },
    { name: "email", label: "Email", type: "email", required: true, placeholder: "name@pharma.com" },
    { name: "username", label: "Username (Login)", type: "text", required: true, placeholder: "e.g. sarah.ahmed" },
    { name: "password", label: "Password", type: "text", required: !editingUser, placeholder: editingUser ? "(leave blank to keep current)" : "min 6 characters" },
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
    const username = String(data.username || "").trim();
    const password = String(data.password || "").trim();

    if (editingUser) {
      updateUser(editingUser.id, payload);
      if (username) {
        saveUserCredential(editingUser.id, username, password || undefined);
      }
    } else {
      const created = createUser(payload);
      setSelectedUserId(created.id);
      if (username && password) {
        saveUserCredential(created.id, username, password);
      }
    }
    setUserFormOpen(false);
    setEditingUser(null);
  }

  function saveUserCredential(userId: string, username: string, password?: string) {
    try {
      const raw = localStorage.getItem("pharma.credentials") || "{}";
      const creds: Record<string, { username: string; password: string }> = JSON.parse(raw);
      if (password) {
        creds[userId] = { username, password };
      } else if (creds[userId]) {
        creds[userId].username = username;
      }
      localStorage.setItem("pharma.credentials", JSON.stringify(creds));
    } catch { /* ignore */ }
  }

  function getUserCredential(userId: string): { username: string; password: string } | null {
    try {
      const raw = localStorage.getItem("pharma.credentials") || "{}";
      const creds: Record<string, { username: string; password: string }> = JSON.parse(raw);
      return creds[userId] ?? null;
    } catch { return null; }
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

  function getInitials(name: string): string {
    return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
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

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return getAuditLogs(auditFilters);
  }, [getAuditLogs, auditFilters]);

  const pagedAuditLogs = useMemo(() => {
    const start = auditPage * AUDIT_PAGE_SIZE;
    return filteredAuditLogs.slice(start, start + AUDIT_PAGE_SIZE);
  }, [filteredAuditLogs, auditPage]);

  const auditTotalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / AUDIT_PAGE_SIZE));

  // Unique modules/actions for filter dropdowns
  const auditModules = useMemo(() => {
    const set = new Set(logs.map((l) => l.module));
    return ["All", ...Array.from(set).sort()];
  }, [logs]);

  const auditActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return ["All", ...Array.from(set).sort()];
  }, [logs]);

  const auditUsers = useMemo(() => {
    const set = new Set(logs.map((l) => l.userName));
    return ["All", ...Array.from(set).sort()];
  }, [logs]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? t("settings.systemConfig")
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

      {/* ═══════════════════════ General Tab ═══════════════════════ */}
      {tab === "general" && (
        <div className="space-y-4">
          {/* Company Profile Section */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("companyProfile")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Company Profile</CardTitle>
                </div>
                {expandedSections.companyProfile ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSections.companyProfile && (
              <CardContent className="space-y-4">
                <div className="flex items-start gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                      {companyProfile.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={companyProfile.logo}
                          alt="Company Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    {isAdmin && (
                      <label className="flex items-center gap-1 text-xs text-blue-600 cursor-pointer hover:underline">
                        <Upload className="h-3 w-3" />
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                    )}
                  </div>

                  {/* Company Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Company Name</Label>
                      <Input
                        value={companyProfile.name}
                        onChange={(e) => saveCompanyProfile({ name: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Industry</Label>
                      <Input defaultValue="Pharmaceutical" disabled />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={companyProfile.address}
                        onChange={(e) => saveCompanyProfile({ address: e.target.value })}
                        disabled={!isAdmin}
                        placeholder="Full company address"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input
                        value={companyProfile.phone}
                        onChange={(e) => saveCompanyProfile({ phone: e.target.value })}
                        disabled={!isAdmin}
                        placeholder="+20 2 XXXX XXXX"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tax ID</Label>
                      <Input
                        value={companyProfile.taxId}
                        onChange={(e) => saveCompanyProfile({ taxId: e.target.value })}
                        disabled={!isAdmin}
                        placeholder="Tax identification number"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Commercial Register Number</Label>
                      <Input
                        value={companyProfile.commercialRegister}
                        onChange={(e) => saveCompanyProfile({ commercialRegister: e.target.value })}
                        disabled={!isAdmin}
                        placeholder="CR number"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input defaultValue="Egypt" disabled />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* System Defaults Section */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("systemDefaults")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">System Defaults</CardTitle>
                </div>
                {expandedSections.systemDefaults ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSections.systemDefaults && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                  <div className="space-y-1.5">
                    <Label>Default Currency</Label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={config.finance.currency}
                      onChange={(e) => updateFinance({ currency: e.target.value })}
                      disabled={!isAdmin}
                    >
                      <option value="EGP">EGP (Egyptian Pound)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
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
                    <Label>Fiscal Year Start Month</Label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={generalSettings.fiscalYearStartMonth}
                      onChange={(e) => saveGeneralSettings({ fiscalYearStartMonth: Number(e.target.value) })}
                      disabled={!isAdmin}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
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
                  <div className="space-y-1.5">
                    <Label>Approval Threshold ({config.finance.currency})</Label>
                    <Input
                      type="number"
                      value={config.finance.approvalThreshold}
                      onChange={(e) => updateFinance({ approvalThreshold: Number(e.target.value) })}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Working Week Configuration */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("workingWeek")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Working Week Configuration</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">Egyptian Standard: Sat-Thu</Badge>
                </div>
                {expandedSections.workingWeek ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSections.workingWeek && (
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Select which days are working days. Off-days (unchecked) are treated as weekends for scheduling and leave calculations.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_WEEKDAYS.map((day) => {
                    const isWorking = generalSettings.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        disabled={!isAdmin}
                        onClick={() => {
                          const next = isWorking
                            ? generalSettings.workingDays.filter((d) => d !== day)
                            : [...generalSettings.workingDays, day];
                          saveGeneralSettings({ workingDays: next });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          isWorking
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "bg-slate-100 border-slate-200 text-slate-500"
                        } ${isAdmin ? "cursor-pointer hover:border-blue-400" : "cursor-not-allowed opacity-70"}`}
                      >
                        {day}
                        <span className="block text-[10px] font-normal">
                          {isWorking ? "Working" : "Off"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Rate per KM */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("kilometrage")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Kilometrage Rate</CardTitle>
                </div>
                {expandedSections.kilometrage ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSections.kilometrage && (
              <CardContent>
                <div className="max-w-sm space-y-2">
                  <Label>Rate per KM ({config.finance.currency})</Label>
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    value={generalSettings.ratePerKm}
                    onChange={(e) => saveGeneralSettings({ ratePerKm: Number(e.target.value) })}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to calculate kilometrage expenses for field force representatives.
                    Currently {generalSettings.ratePerKm.toFixed(2)} {config.finance.currency}/km.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex gap-2">
            <Button disabled={!isAdmin}>
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
            <Button variant="outline" onClick={() => {
              resetConfig();
              setCompanyProfile(DEFAULT_COMPANY);
              setGeneralSettings(DEFAULT_GENERAL);
              try {
                localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(DEFAULT_COMPANY));
                localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(DEFAULT_GENERAL));
              } catch {}
            }} disabled={!isAdmin}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset to Defaults
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════ Users & Access Tab ═══════════════════════ */}
      {tab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User list */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Users ({allUsers.length})</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={handleCreateUser}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 max-h-[560px] overflow-y-auto">
              <ul className="divide-y">
                {allUsers.map((u) => {
                  const cred = getUserCredential(u.id);
                  const hasCredentials = !!cred;
                  const roleColor = ROLE_COLORS[u.role] || "bg-slate-100 text-slate-800 border-slate-200";
                  return (
                    <li
                      key={u.id}
                      className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedUserId === u.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                      }`}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar with initials */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${roleColor}`}>
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            {hasCredentials ? (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Credentials set" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" title="No credentials" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${roleColor}`}>
                              {ROLE_LABEL[u.role]}
                            </span>
                            {navOverrides[u.id] && (
                              <Badge variant="warning" className="text-[10px]">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {u.department || "No department"}
                            {u.territory ? ` | ${u.territory}` : ""}
                          </p>
                          {hasCredentials && (
                            <p className="text-[10px] text-blue-500 font-mono truncate">
                              @{cred!.username}
                            </p>
                          )}
                        </div>
                        {/* Quick actions */}
                        {isAdmin && (
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditUser(u);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit user"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditUser(u);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                              title="Reset password"
                            >
                              <KeyRound className="h-3 w-3" />
                            </button>
                            {u.id !== "u-admin" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteUserId(u.id);
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Deactivate user"
                              >
                                <UserX className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Per-user nav editor */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Interface for {selectedUser?.name ?? "---"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Toggle which menu items this user can see. {selectedOverride
                    ? <>Currently using <Badge variant="warning" className="text-[10px] mx-0.5">custom overrides</Badge>.</>
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
                            allowed ? "bg-blue-50 border-blue-200" : "bg-card"
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

      {/* ═══════════════════════ Module Config Tab ═══════════════════════ */}
      {tab === "modules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label>Max Visits Per Day / Rep</Label>
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
              <div className="space-y-1.5">
                <Label>Doctor Segmentation Model</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.crm.doctorSegmentation}
                  onChange={(e) =>
                    updateCRM({ doctorSegmentation: e.target.value as "ABC" | "ABCD" | "VIP" })
                  }
                  disabled={!isAdmin}
                >
                  <option value="ABC">ABC (3-tier)</option>
                  <option value="ABCD">ABCD (4-tier)</option>
                  <option value="VIP">VIP (Priority-based)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Finance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Default Currency</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.finance.currency}
                  onChange={(e) => updateFinance({ currency: e.target.value })}
                  disabled={!isAdmin}
                >
                  <option value="EGP">EGP (Egyptian Pound)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Approval Threshold ({config.finance.currency})</Label>
                <Input
                  type="number"
                  value={config.finance.approvalThreshold}
                  onChange={(e) => updateFinance({ approvalThreshold: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fiscal Year Start</Label>
                <Input
                  value={config.finance.fiscalYearStart}
                  onChange={(e) => updateFinance({ fiscalYearStart: e.target.value })}
                  disabled={!isAdmin}
                  placeholder="DD-MM"
                />
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
              <ToggleRow
                label="Enable Performance Reviews"
                value={config.hr.enablePerformanceReviews}
                onChange={(v) => updateHR({ enablePerformanceReviews: v })}
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

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Low Stock Threshold (%)</Label>
                <Input
                  type="number"
                  value={config.inventory.lowStockThreshold}
                  onChange={(e) => updateInventory({ lowStockThreshold: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this % of reorder level
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Alert (days before)</Label>
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
              <div className="space-y-1.5">
                <Label>Default Warehouse</Label>
                <Input
                  value={config.inventory.defaultWarehouse}
                  onChange={(e) => updateInventory({ defaultWarehouse: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
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
              <div className="space-y-1.5">
                <Label>Supplier Rating Scale</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={config.procurement.supplierRatingScale}
                  onChange={(e) => updateProcurement({ supplierRatingScale: Number(e.target.value) as 5 | 10 })}
                  disabled={!isAdmin}
                >
                  <option value={5}>1-5 Stars</option>
                  <option value={10}>1-10 Scale</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════ Security Tab ═══════════════════════ */}
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
                label="Require Special Character"
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
              {/* Password strength preview */}
              <div className="rounded-lg bg-slate-50 border p-3 text-xs space-y-1.5">
                <p className="font-medium text-slate-700">Current Policy Summary:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>Min {config.security.passwordMinLength} characters</li>
                  {config.security.passwordRequireUppercase && <li>At least 1 uppercase letter</li>}
                  {config.security.passwordRequireNumber && <li>At least 1 number</li>}
                  {config.security.passwordRequireSymbol && <li>At least 1 special character (!@#$...)</li>}
                  <li>Expires every {config.security.passwordExpiryDays} days</li>
                </ul>
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
                <p className="text-xs text-muted-foreground">
                  Users will be logged out after {config.security.sessionTimeoutMinutes} minutes of inactivity
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Login Attempt Lockout After N Failures</Label>
                <Input
                  type="number"
                  value={config.security.maxLoginAttempts}
                  onChange={(e) => updateSecurity({ maxLoginAttempts: Number(e.target.value) })}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Account locks after {config.security.maxLoginAttempts} failed login attempts
                </p>
              </div>
              <div className="border-t pt-3">
                <ToggleRow
                  label="Two-Factor Authentication (2FA)"
                  value={config.security.enableTwoFactor}
                  onChange={(v) => updateSecurity({ enableTwoFactor: v })}
                  disabled={!isAdmin}
                />
                {config.security.enableTwoFactor && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 mt-2">
                    2FA is enabled. Users will be prompted to configure TOTP on next login. (Demo mode - no actual 2FA enforced)
                  </p>
                )}
              </div>
              <ToggleRow
                label="Enforce Single Sign-On (SSO)"
                value={config.security.enforceSSO}
                onChange={(v) => updateSecurity({ enforceSSO: v })}
                disabled={!isAdmin}
              />
              <div className="border-t pt-3 space-y-2">
                <ToggleRow
                  label="IP Whitelist Enabled"
                  value={config.security.ipWhitelistEnabled}
                  onChange={(v) => updateSecurity({ ipWhitelistEnabled: v })}
                  disabled={!isAdmin}
                />
                {config.security.ipWhitelistEnabled && (
                  <div className="space-y-1.5">
                    <Label>Allowed IP Addresses (one per line)</Label>
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm font-mono min-h-[80px]"
                      placeholder={"10.0.0.0/24\n192.168.1.0/24\n197.50.0.0/16"}
                      value={ipWhitelist}
                      onChange={(e) => saveIpWhitelist(e.target.value)}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground">
                      CIDR notation supported. Only these IPs can access the system.
                    </p>
                  </div>
                )}
              </div>
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

      {/* ═══════════════════════ Notifications Tab ═══════════════════════ */}
      {tab === "notifications" && (
        <div className="space-y-4">
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Digest & Frequency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Notification Digest Frequency</Label>
                  <div className="flex gap-2">
                    {(["Off", "Daily", "Weekly"] as const).map((freq) => (
                      <button
                        key={freq}
                        disabled={!isAdmin}
                        onClick={() => updateNotifications({ digestFrequency: freq })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          config.notifications.digestFrequency === freq
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        } ${isAdmin ? "cursor-pointer hover:border-blue-400" : "cursor-not-allowed opacity-70"}`}
                      >
                        {freq === "Off" ? "Real-time" : freq}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.notifications.digestFrequency === "Off"
                      ? "Notifications are sent immediately as events occur"
                      : `Notifications are batched and sent as a ${config.notifications.digestFrequency.toLowerCase()} digest`}
                  </p>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <h4 className="text-sm font-medium">Alert Rules</h4>
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-event notification matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Event Notification Settings</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Fine-grained control over which events trigger notifications via each channel.
              </p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y">
                  <tr>
                    <th className="text-left p-3 font-medium">Event</th>
                    <th className="text-left p-3 font-medium text-xs">Module</th>
                    <th className="text-center p-3 font-medium text-xs">Email</th>
                    <th className="text-center p-3 font-medium text-xs">In-App</th>
                    <th className="text-center p-3 font-medium text-xs">Escalation</th>
                  </tr>
                </thead>
                <tbody>
                  {NOTIFICATION_EVENTS.map((evt) => {
                    const state = notifEvents[evt.key] || { email: true, inApp: true, escalation: false };
                    return (
                      <tr key={evt.key} className="border-b hover:bg-slate-50">
                        <td className="p-3 text-sm">{evt.label}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-[10px]">{evt.group}</Badge>
                        </td>
                        <td className="text-center p-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={state.email}
                            onChange={() => toggleNotifEvent(evt.key, "email")}
                            disabled={!isAdmin}
                          />
                        </td>
                        <td className="text-center p-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={state.inApp}
                            onChange={() => toggleNotifEvent(evt.key, "inApp")}
                            disabled={!isAdmin}
                          />
                        </td>
                        <td className="text-center p-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={state.escalation}
                            onChange={() => toggleNotifEvent(evt.key, "escalation")}
                            disabled={!isAdmin}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════ Integrations Tab ═══════════════════════ */}
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

      {/* ═══════════════════════ Backup & Recovery Tab ═══════════════════════ */}
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

      {/* ═══════════════════════ Localization Tab ═══════════════════════ */}
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
                  <option value="ar">Arabic</option>
                  <option value="fr">Francais</option>
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

      {/* ═══════════════════════ Appearance Tab ═══════════════════════ */}
      {tab === "appearance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {([
                  { value: "light" as const, label: "Light", icon: Sun },
                  { value: "dark" as const, label: "Dark", icon: Moon },
                  { value: "auto" as const, label: "System", icon: Monitor },
                ]).map((theme) => {
                  const Icon = theme.icon;
                  const isSelected = config.appearance.theme === theme.value;
                  return (
                    <button
                      key={theme.value}
                      disabled={!isAdmin}
                      onClick={() => updateAppearance({ theme: theme.value })}
                      className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-card text-muted-foreground hover:border-slate-300"
                      } ${isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Color</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {([
                  { value: "blue" as const, label: "Blue", bg: "bg-blue-500" },
                  { value: "green" as const, label: "Green", bg: "bg-emerald-500" },
                  { value: "purple" as const, label: "Purple", bg: "bg-purple-500" },
                  { value: "orange" as const, label: "Orange", bg: "bg-orange-500" },
                  { value: "red" as const, label: "Red", bg: "bg-red-500" },
                ]).map((color) => {
                  const isSelected = config.appearance.primaryColor === color.value;
                  return (
                    <button
                      key={color.value}
                      disabled={!isAdmin}
                      onClick={() => updateAppearance({ primaryColor: color.value })}
                      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-card hover:border-slate-300"
                      } ${isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                    >
                      <div className={`w-8 h-8 rounded-full ${color.bg} ${isSelected ? "ring-2 ring-offset-2 ring-blue-400" : ""}`} />
                      <span className="text-xs font-medium">{color.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Layout & Display</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-w-2xl">
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════ Audit Log Tab ═══════════════════════ */}
      {tab === "audit" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recent System Activity</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredAuditLogs.length} entries found. Retained for {config.security.auditLogRetentionDays} days.
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={!isAdmin}>
                <Download className="h-3 w-3 mr-1" /> Export CSV
              </Button>
            </div>
            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    className="pl-7 h-8 text-xs"
                    placeholder="Search..."
                    value={auditFilters.search || ""}
                    onChange={(e) => { setAuditFilters({ ...auditFilters, search: e.target.value || undefined }); setAuditPage(0); }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Module</Label>
                <select
                  className="w-full rounded-md border px-2 py-1.5 text-xs h-8"
                  value={auditFilters.module || "All"}
                  onChange={(e) => { setAuditFilters({ ...auditFilters, module: e.target.value === "All" ? undefined : e.target.value }); setAuditPage(0); }}
                >
                  {auditModules.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</Label>
                <select
                  className="w-full rounded-md border px-2 py-1.5 text-xs h-8"
                  value={auditFilters.action || "All"}
                  onChange={(e) => { setAuditFilters({ ...auditFilters, action: e.target.value === "All" ? undefined : e.target.value }); setAuditPage(0); }}
                >
                  {auditActions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">User</Label>
                <select
                  className="w-full rounded-md border px-2 py-1.5 text-xs h-8"
                  value={auditFilters.userName || "All"}
                  onChange={(e) => { setAuditFilters({ ...auditFilters, userName: e.target.value === "All" ? undefined : e.target.value }); setAuditPage(0); }}
                >
                  {auditUsers.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={auditFilters.dateFrom || ""}
                  onChange={(e) => { setAuditFilters({ ...auditFilters, dateFrom: e.target.value || undefined }); setAuditPage(0); }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={auditFilters.dateTo || ""}
                  onChange={(e) => { setAuditFilters({ ...auditFilters, dateTo: e.target.value || undefined }); setAuditPage(0); }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-y">
                <tr>
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Module</th>
                  <th className="text-left p-2">Entity</th>
                  <th className="text-left p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {pagedAuditLogs.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-mono text-[10px] whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${ROLE_COLORS[entry.userRole] || "bg-slate-100 text-slate-600"}`}>
                          {getInitials(entry.userName)}
                        </div>
                        <div>
                          <p className="text-[11px] font-medium truncate max-w-[120px]">{entry.userName}</p>
                          <p className="text-[9px] text-muted-foreground">{entry.userRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge
                        variant={
                          entry.action === "DELETE" ? "destructive"
                            : entry.action === "CREATE" ? "success"
                            : entry.action === "APPROVE" ? "success"
                            : entry.action === "REJECT" ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-[10px]">{entry.module}</Badge>
                    </td>
                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                      {entry.entityName || entry.entity}
                    </td>
                    <td className="p-2 text-muted-foreground max-w-[250px] truncate" title={entry.details}>
                      {entry.details || "---"}
                    </td>
                  </tr>
                ))}
                {pagedAuditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No audit entries match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="p-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {auditPage + 1} of {auditTotalPages} ({filteredAuditLogs.length} entries)
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={auditPage === 0}
                  onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={auditPage >= auditTotalPages - 1}
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════ Permissions Matrix Tab ═══════════════════════ */}
      {tab === "permissions" && (
        <div className="space-y-4">
          {/* Custom Roles */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Custom Roles</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Create custom roles with specific permissions. Click &ldquo;+&rdquo; to create a new role.
                </p>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setCustomRoleFormOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> New Role
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {customRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom roles yet. Built-in roles are shown below.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customRoles.map((cr) => (
                    <div key={cr.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{cr.name}</p>
                          <p className="text-[11px] text-muted-foreground">{cr.description}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => deleteCustomRole(cr.id)}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cr.routes.slice(0, 5).map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {ALL_ROUTES.find((ar) => ar.href === r)?.label ?? r}
                          </Badge>
                        ))}
                        {cr.routes.length > 5 && (
                          <Badge variant="secondary" className="text-[10px]">+{cr.routes.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Built-in Role Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Built-in Role Permissions Matrix</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Default routes per built-in role. {isAdmin ? "Click cells to toggle access for all users of that role." : "Read-only — switch to Administrator to edit."} Per-user overrides in &ldquo;Users &amp; Access&rdquo; take precedence.
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
                      <td className="p-2 font-medium sticky left-0 bg-card">
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
        </div>
      )}

      {/* Custom Role Create Dialog */}
      {customRoleFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setCustomRoleFormOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Create Custom Role</h3>
              <p className="text-sm text-muted-foreground">Define a new role with specific module access.</p>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Role Name</Label>
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Regional Manager"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="Brief description of role"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Permitted Modules</Label>
                {Object.entries(groups).map(([group, items]) => (
                  <div key={group} className="mb-3">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 tracking-wider">{group}</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map((item) => (
                        <label key={item.href} className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer hover:border-blue-400 ${newRoleRoutes.includes(item.href) ? "bg-blue-50 border-blue-200" : "bg-card"}`}>
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={newRoleRoutes.includes(item.href)}
                            onChange={() => {
                              setNewRoleRoutes((prev) =>
                                prev.includes(item.href)
                                  ? prev.filter((r) => r !== item.href)
                                  : [...prev, item.href]
                              );
                            }}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-3 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCustomRoleFormOpen(false)}>Cancel</Button>
              <Button
                disabled={!newRoleName.trim() || newRoleRoutes.length === 0}
                onClick={() => {
                  const role = {
                    id: `cr-${Date.now()}`,
                    name: newRoleName.trim(),
                    description: newRoleDesc.trim(),
                    routes: newRoleRoutes,
                  };
                  const next = [...customRoles, role];
                  setCustomRoles(next);
                  try { localStorage.setItem("pharma.customRoles", JSON.stringify(next)); } catch {}
                  setNewRoleName("");
                  setNewRoleDesc("");
                  setNewRoleRoutes([]);
                  setCustomRoleFormOpen(false);
                }}
              >
                Create Role
              </Button>
            </div>
          </div>
        </div>
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
                username: getUserCredential(editingUser.id)?.username ?? "",
                password: "",
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
