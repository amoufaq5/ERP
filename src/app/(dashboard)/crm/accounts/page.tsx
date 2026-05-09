"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Users, TrendingUp, DollarSign, Plus, ArrowRightLeft, ExternalLink, CheckCircle2,
  UserPlus, Link, UserX,
  Ticket, Clock, Star, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditDeleteMenu } from "@/components/shared/edit-delete-menu";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { FilterBar, type FilterState } from "@/components/shared/filter-bar";
import PageHeader from "@/components/shared/page-header";
import StatsCard from "@/components/shared/stats-card";
import DataTable from "@/components/shared/data-table";
import StatusBadge from "@/components/shared/status-badge";
import type { Column } from "@/components/shared/data-table";
import { useApiDataStore } from "@/lib/api/use-api-store";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { useCurrentUser, ROLE_LABEL } from "@/lib/user-context";
import { useAuditLogger } from "@/lib/audit-logger";

// ─── Tab type ─────────────────────────────────────────────────────────────────
type ActiveTab = "accounts" | "contacts" | "tickets";

// ─── Account types & data ─────────────────────────────────────────────────────
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
  { name: "revenue", label: "Annual Revenue (EGP)", type: "number", placeholder: "0" },
  { name: "owner", label: "Account Owner", type: "text", placeholder: "Rep name" },
];

const ACCOUNT_FILTER_FIELDS = [
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

const fmtEGP = (n: number) => { const v = n ?? 0; return `EGP ${v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : v.toLocaleString()}`; };

// ─── Contact types & data ─────────────────────────────────────────────────────
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  account: string | null;
  owner: string;
  status: string;
  createdAt: string;
}

const INITIAL_CONTACTS: Contact[] = [
  { id: "CON-001", firstName: "Alexandra", lastName: "Chen", title: "VP of Engineering", email: "a.chen@techcorp.io", phone: "+1 (415) 555-0192", account: "TechCorp Solutions", owner: "Marcus Williams", status: "active", createdAt: "2024-06-15" },
  { id: "CON-002", firstName: "James", lastName: "Martinez", title: "Chief Procurement Officer", email: "j.martinez@globalretail.com", phone: "+1 (212) 555-0148", account: "Global Retail Inc.", owner: "Sarah Johnson", status: "active", createdAt: "2024-03-22" },
  { id: "CON-003", firstName: "Priya", lastName: "Patel", title: "CTO", email: "priya.patel@nexusfinance.com", phone: "+1 (312) 555-0271", account: "Nexus Finance", owner: "Marcus Williams", status: "active", createdAt: "2023-11-10" },
  { id: "CON-004", firstName: "David", lastName: "Thompson", title: "IT Director", email: "d.thompson@healthplus.org", phone: "+1 (617) 555-0334", account: "HealthPlus Systems", owner: "Emma Davis", status: "active", createdAt: "2026-01-08" },
  { id: "CON-005", firstName: "Sofia", lastName: "Nguyen", title: "Head of Operations", email: "sofia.n@cloudbuild.tech", phone: "+1 (206) 555-0417", account: "CloudBuild Technologies", owner: "Sarah Johnson", status: "active", createdAt: "2026-02-14" },
  { id: "CON-006", firstName: "Robert", lastName: "Kim", title: "Plant Manager", email: "r.kim@manufactura.com", phone: "+1 (313) 555-0509", account: "Manufactura Group", owner: "Emma Davis", status: "active", createdAt: "2024-09-03" },
  { id: "CON-007", firstName: "Isabella", lastName: "Santos", title: "Logistics Coordinator", email: "i.santos@logisticspro.net", phone: "+1 (713) 555-0623", account: "LogisticsPro", owner: "Marcus Williams", status: "active", createdAt: "2025-04-17" },
  { id: "CON-008", firstName: "Michael", lastName: "O'Brien", title: "CEO", email: "m.obrien@quantumdata.ai", phone: "+1 (650) 555-0781", account: "Quantum Data AI", owner: "Sarah Johnson", status: "active", createdAt: "2025-08-29" },
  { id: "CON-009", firstName: "Natalie", lastName: "Foster", title: "Sales Director", email: "n.foster@independentco.com", phone: "+1 (404) 555-0855", account: null, owner: "Emma Davis", status: "pending", createdAt: "2026-03-10" },
  { id: "CON-010", firstName: "Carlos", lastName: "Reyes", title: "Business Development Manager", email: "c.reyes@freeagent.biz", phone: "+1 (305) 555-0933", account: null, owner: "Marcus Williams", status: "pending", createdAt: "2026-03-20" },
];

const CONTACT_FIELDS_STATIC: EntityField[] = [
  { name: "firstName", label: "First Name", type: "text", placeholder: "First name", required: true },
  { name: "lastName", label: "Last Name", type: "text", placeholder: "Last name" },
  { name: "title", label: "Job Title", type: "text", placeholder: "e.g. VP of Sales", fullWidth: true },
  { name: "email", label: "Email", type: "email", placeholder: "email@company.com", required: true },
  { name: "phone", label: "Phone", type: "text", placeholder: "+1 (555) 000-0000" },
];

const CONTACT_FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Active", value: "active" }, { label: "Pending", value: "pending" },
  ]},
];

// ─── Ticket types & data ──────────────────────────────────────────────────────
type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type TicketStatus = "OPEN" | "IN_PROGRESS" | "PENDING" | "RESOLVED" | "CLOSED";

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  account: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo: string;
  slaDeadline: string;
  createdAt: string;
}

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_MAP: Record<TicketStatus, string> = {
  OPEN: "open",
  IN_PROGRESS: "in progress",
  PENDING: "pending",
  RESOLVED: "completed",
  CLOSED: "closed",
};

const INITIAL_TICKETS: SupportTicket[] = [
  { id: "1", ticketNumber: "TKT-00341", subject: "Unable to export reports to PDF", account: "TechCorp Solutions", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "Alex Turner", slaDeadline: "2026-04-02 17:00", createdAt: "2026-03-30" },
  { id: "2", ticketNumber: "TKT-00340", subject: "Login issues after SSO migration", account: "Nexus Finance", priority: "CRITICAL", status: "OPEN", assignedTo: "Maya Rodriguez", slaDeadline: "2026-04-01 09:00", createdAt: "2026-03-30" },
  { id: "3", ticketNumber: "TKT-00339", subject: "Invoice totals not matching line items", account: "Global Retail Inc.", priority: "HIGH", status: "PENDING", assignedTo: "Alex Turner", slaDeadline: "2026-04-02 12:00", createdAt: "2026-03-29" },
  { id: "4", ticketNumber: "TKT-00338", subject: "Custom field not saving on contact form", account: "HealthPlus Systems", priority: "MEDIUM", status: "IN_PROGRESS", assignedTo: "Dana Park", slaDeadline: "2026-04-04 17:00", createdAt: "2026-03-28" },
  { id: "5", ticketNumber: "TKT-00337", subject: "Email notifications not being sent", account: "CloudBuild Technologies", priority: "MEDIUM", status: "OPEN", assignedTo: "Maya Rodriguez", slaDeadline: "2026-04-04 09:00", createdAt: "2026-03-27" },
  { id: "6", ticketNumber: "TKT-00336", subject: "Dashboard loading slowly (>10 sec)", account: "Manufactura Group", priority: "LOW", status: "RESOLVED", assignedTo: "Dana Park", slaDeadline: "2026-04-06 17:00", createdAt: "2026-03-25" },
  { id: "7", ticketNumber: "TKT-00335", subject: "Data import wizard crashes on large files", account: "LogisticsPro", priority: "HIGH", status: "RESOLVED", assignedTo: "Alex Turner", slaDeadline: "2026-03-28 17:00", createdAt: "2026-03-24" },
  { id: "8", ticketNumber: "TKT-00334", subject: "API rate limit documentation unclear", account: "Quantum Data AI", priority: "LOW", status: "CLOSED", assignedTo: "Dana Park", slaDeadline: "2026-03-31 17:00", createdAt: "2026-03-22" },
];

const TICKET_FIELDS_STATIC: EntityField[] = [
  { name: "subject", label: "Subject", type: "text", placeholder: "Brief description of the issue", required: true, fullWidth: true },
  { name: "priority", label: "Priority", type: "select", defaultValue: "MEDIUM", options: [
    { label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" }, { label: "Critical", value: "CRITICAL" },
  ]},
  { name: "assignedTo", label: "Assign To", type: "text", placeholder: "Support rep name" },
  { name: "slaDeadline", label: "SLA Deadline", type: "text", placeholder: "YYYY-MM-DD HH:MM" },
];

const TICKET_FILTER_FIELDS = [
  { key: "status", label: "Status", type: "select" as const, options: [
    { label: "Open", value: "OPEN" }, { label: "In Progress", value: "IN_PROGRESS" },
    { label: "Pending", value: "PENDING" }, { label: "Resolved", value: "RESOLVED" },
    { label: "Closed", value: "CLOSED" },
  ]},
  { key: "priority", label: "Priority", type: "select" as const, options: [
    { label: "Low", value: "LOW" }, { label: "Medium", value: "MEDIUM" },
    { label: "High", value: "HIGH" }, { label: "Critical", value: "CRITICAL" },
  ]},
];

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function AccountsPage() {
  const store = useApiDataStore();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, getReportsOf } = useCurrentUser();
  const { logAction } = useAuditLogger();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<ActiveTab>("accounts");

  // ── Account state ──
  const [allAccounts, setAllAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);

  // Role-based account scoping
  const accounts = useMemo(() => {
    // ADMIN / NSM: see all accounts
    if (user.role === "ADMIN" || user.role === "NSM") return allAccounts;
    // BUM: see all accounts (org-wide visibility for managers)
    if (user.role === "BUM") return allAccounts;
    // DISTRICT_MANAGER / MARKETEER: see accounts owned by self or reports
    const teamNames = new Set<string>();
    teamNames.add(user.name);
    const reports = getReportsOf(user.id);
    reports.forEach((r) => teamNames.add(r.name));
    return allAccounts.filter((a) => teamNames.has(a.owner));
  }, [allAccounts, user.role, user.id, user.name, getReportsOf]);

  // Wrapper to update allAccounts (preserving scoping)
  const setAccounts: React.Dispatch<React.SetStateAction<Account[]>> = setAllAccounts;
  const [accountFilters, setAccountFilters] = useState<FilterState>({ _search: "", type: "", industry: "" });
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [detailAccount, setDetailAccount] = useState<Account | null>(null);

  // ── Contact state ──
  const [allContacts, setAllContacts] = useState<Contact[]>(INITIAL_CONTACTS);

  // Role-based contact scoping
  const contacts = useMemo(() => {
    if (user.role === "ADMIN" || user.role === "NSM") return allContacts;
    if (user.role === "BUM") return allContacts;
    const teamNames = new Set<string>();
    teamNames.add(user.name);
    const reports = getReportsOf(user.id);
    reports.forEach((r) => teamNames.add(r.name));
    return allContacts.filter((c) => teamNames.has(c.owner));
  }, [allContacts, user.role, user.id, user.name, getReportsOf]);

  const setContacts: React.Dispatch<React.SetStateAction<Contact[]>> = setAllContacts;
  const [contactFilters, setContactFilters] = useState<FilterState>({ _search: "", status: "" });
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);

  // ── Ticket state ──
  const [allTickets, setAllTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);

  // Role-based ticket scoping
  const tickets = useMemo(() => {
    if (user.role === "ADMIN" || user.role === "NSM") return allTickets;
    if (user.role === "BUM") return allTickets;
    const teamNames = new Set<string>();
    teamNames.add(user.name);
    if (user.role === "DISTRICT_MANAGER" || user.role === "MARKETEER") {
      const reports = getReportsOf(user.id);
      reports.forEach((r) => teamNames.add(r.name));
    }
    return allTickets.filter((t) => teamNames.has(t.assignedTo));
  }, [allTickets, user.role, user.id, user.name, getReportsOf]);

  const setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>> = setAllTickets;
  const [ticketFilters, setTicketFilters] = useState<FilterState>({ _search: "", status: "", priority: "" });
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [detailTicket, setDetailTicket] = useState<SupportTicket | null>(null);

  // ── ERP sync (accounts) ──
  const syncedCustomerMap = useMemo(() => {
    const map = new Map<string, (typeof store.customers)[number]>();
    for (const c of store.customers) {
      map.set(c.name, c);
    }
    return map;
  }, [store.customers]);

  const syncAccountToERP = useCallback((account: Account) => {
    const existing = syncedCustomerMap.get(account.name);
    if (existing) return;
    const newCustomer = {
      id: store.genId("CUST"),
      code: store.generateCustomerCode(),
      name: account.name,
      type: account.industry === "Healthcare" ? "Hospital" : "Distributor",
      phone: account.phone || "",
      email: "",
      address: account.city || "",
      city: account.city || "",
      creditLimit: 50000,
      outstanding: 0,
      currency: "EGP",
      paymentTerms: "Net 30",
      status: "ACTIVE" as const,
      createdAt: new Date().toISOString(),
    };
    store.add("customers", newCustomer);
  }, [store, syncedCustomerMap]);

  // ── Dynamic form fields that depend on store ──
  const CONTACT_FIELDS: EntityField[] = [
    ...CONTACT_FIELDS_STATIC,
    { name: "account", label: "Account", type: "select", options: [{ label: "None", value: "" }, ...store.customers.map(c => ({ label: c.name, value: c.name }))] },
    { name: "owner", label: "Owner", type: "text", placeholder: "Assigned rep" },
  ];

  const TICKET_FIELDS: EntityField[] = [
    TICKET_FIELDS_STATIC[0],
    { name: "account", label: "Account", type: "select", required: true, options: store.customers.map(c => ({ label: c.name, value: c.name })) },
    ...TICKET_FIELDS_STATIC.slice(1),
  ];

  // ── Filtered data ──
  const filteredAccounts = accounts.filter((a) => {
    const q = (accountFilters._search || "").toLowerCase();
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.industry.toLowerCase().includes(q) || a.city.toLowerCase().includes(q);
    const matchesType = !accountFilters.type || a.type === accountFilters.type;
    const matchesIndustry = !accountFilters.industry || a.industry === accountFilters.industry;
    return matchesSearch && matchesType && matchesIndustry;
  });

  const filteredContacts = contacts.filter((c) => {
    const q = (contactFilters._search || "").toLowerCase();
    const matchesSearch = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.account || "").toLowerCase().includes(q);
    const matchesStatus = !contactFilters.status || c.status === contactFilters.status;
    return matchesSearch && matchesStatus;
  });

  const filteredTickets = tickets.filter((tk) => {
    const q = (ticketFilters._search || "").toLowerCase();
    const matchesSearch = !q || tk.subject.toLowerCase().includes(q) || tk.account.toLowerCase().includes(q) || tk.ticketNumber.toLowerCase().includes(q);
    const matchesStatus = !ticketFilters.status || tk.status === ticketFilters.status;
    const matchesPriority = !ticketFilters.priority || tk.priority === ticketFilters.priority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // ── Account stats ──
  const totalAccounts = accounts.length;
  const customerCount = accounts.filter((a) => a.type === "CUSTOMER").length;
  const prospectCount = accounts.filter((a) => a.type === "PROSPECT").length;
  const totalRevenue = accounts.filter((a) => a.type === "CUSTOMER").reduce((sum, a) => sum + a.revenue, 0);

  // ── Contact stats ──
  const totalContacts = contacts.length;
  const newThisMonth = contacts.filter((c) => c.createdAt >= "2026-03-01").length;
  const withAccount = contacts.filter((c) => c.account !== null).length;
  const withoutAccount = contacts.filter((c) => c.account === null).length;

  // ── Ticket stats ──
  const openTickets = tickets.filter((tk) => tk.status === "OPEN" || tk.status === "IN_PROGRESS" || tk.status === "PENDING").length;
  const inProgress = tickets.filter((tk) => tk.status === "IN_PROGRESS").length;
  const avgResolution = "4.2 hrs";
  const satisfaction = "94%";

  // Status transition guards: only allow forward transitions; CLOSED cannot be reopened
  const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    OPEN: ["IN_PROGRESS"],
    IN_PROGRESS: ["PENDING", "RESOLVED"],
    PENDING: ["IN_PROGRESS"],
    RESOLVED: ["CLOSED"],
    CLOSED: [],
  };

  // ── Account columns ──
  const accountColumns: Column<Record<string, unknown>>[] = [
    { key: "name", label: "Account Name" },
    { key: "industry", label: "Industry" },
    { key: "type", label: "Type", render: (v) => <TypeBadge type={v as AccountType} /> },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "revenue", label: "Revenue", render: (v) => <span className="font-medium">EGP {(((v as number) ?? 0) / 1000000).toFixed(1)}M</span> },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", render: (v, row) => {
      const synced = syncedCustomerMap.has(row.name as string);
      return (
        <div className="flex items-center gap-2">
          <StatusBadge status={v as string} />
          {synced && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> Synced
            </span>
          )}
        </div>
      );
    }},
    { key: "createdAt", label: "Created" },
    {
      key: "id", label: "",
      render: (_v, row) => {
        const a = accounts.find((x) => x.id === row.id);
        if (!a) return null;
        const matchedCustomer = syncedCustomerMap.get(a.name);
        const syncItems = matchedCustomer
          ? [{ label: "View in ERP", icon: <ExternalLink className="w-4 h-4" />, onClick: () => router.push(`/erp/partner-detail?type=customer&id=${matchedCustomer.id}`) }]
          : [{ label: "Sync to ERP", icon: <ArrowRightLeft className="w-4 h-4" />, onClick: () => syncAccountToERP(a) }];
        const convertItems = a.type === "PROSPECT" ? [{ label: "Convert to Customer", onClick: () => setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, type: "CUSTOMER" as AccountType, status: "active" } : x)) }] : [];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingAccount(a); setShowAccountModal(true); }}
            onDelete={() => {
              setAccounts((prev) => prev.filter((x) => x.id !== a.id));
              logAction({
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                action: "DELETE",
                module: "CRM",
                entity: "Account",
                entityId: a.id,
                entityName: a.name,
                details: `Deleted account ${a.name}`,
              });
            }}
            onView={() => setDetailAccount(a)}
            canView
            itemLabel={a.name}
            extraItems={[...syncItems, ...convertItems]}
          />
        );
      },
    },
  ];

  // ── Contact columns ──
  const contactColumns: Column<Record<string, unknown>>[] = [
    {
      key: "firstName",
      label: "Name",
      render: (_v, row) => (
        <div className="font-medium">
          {row.firstName as string} {row.lastName as string}
        </div>
      ),
    },
    { key: "title", label: "Title" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    {
      key: "account",
      label: "Account",
      render: (v) => v ? <span>{v as string}</span> : <span className="text-muted-foreground italic text-xs">No account</span>,
    },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v as string} /> },
    { key: "createdAt", label: "Created" },
    {
      key: "id",
      label: "",
      render: (_v, row) => {
        const c = contacts.find((x) => x.id === row.id);
        if (!c) return null;
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingContact(c); setShowContactModal(true); }}
            onDelete={() => {
              setContacts((prev) => prev.filter((x) => x.id !== c.id));
              logAction({
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                action: "DELETE",
                module: "CRM",
                entity: "Contact",
                entityId: c.id,
                entityName: `${c.firstName} ${c.lastName}`,
                details: `Deleted contact ${c.firstName} ${c.lastName}`,
              });
            }}
            onView={() => setDetailContact(c)}
            canView
            itemLabel={`${c.firstName} ${c.lastName}`}
            extraItems={c.status === "pending" ? [{ label: "Set Active", onClick: () => setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, status: "active" } : x)) }] : []}
          />
        );
      },
    },
  ];

  // ── Ticket columns ──
  const ticketColumns: Column<Record<string, unknown>>[] = [
    { key: "ticketNumber", label: "Ticket #", className: "w-28" },
    { key: "subject", label: "Subject" },
    { key: "account", label: "Account" },
    { key: "priority", label: "Priority", render: (v) => <PriorityBadge priority={v as Priority} /> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={STATUS_MAP[v as TicketStatus]} /> },
    { key: "assignedTo", label: "Assigned To" },
    { key: "slaDeadline", label: "SLA Deadline" },
    { key: "createdAt", label: "Created" },
    {
      key: "id",
      label: "",
      render: (_v, row) => {
        const tk = tickets.find((x) => x.id === row.id);
        if (!tk) return null;
        const nextStates = STATUS_TRANSITIONS[tk.status] || [];
        return (
          <EditDeleteMenu
            onEdit={() => { setEditingTicket(tk); setShowTicketModal(true); }}
            onDelete={() => setTickets((prev) => prev.filter((x) => x.id !== tk.id))}
            onView={() => setDetailTicket(tk)}
            canView
            itemLabel={tk.ticketNumber}
            extraItems={nextStates.map((ns) => ({
              label: `Move to ${ns.replace(/_/g, " ")}`,
              onClick: () => setTickets((prev) => prev.map((x) => x.id === tk.id ? { ...x, status: ns } : x)),
            }))}
          />
        );
      },
    },
  ];

  // ── Per-tab header info ──
  const roleLabel = ROLE_LABEL[user.role];
  const tabConfig: Record<ActiveTab, { title: string; description: string; buttonLabel: string; onAdd: () => void }> = {
    accounts: {
      title: t("account.title"),
      description: `${t("account.manageAccounts")} Viewing as ${roleLabel}.`,
      buttonLabel: "Add Account",
      onAdd: () => { setEditingAccount(null); setShowAccountModal(true); },
    },
    contacts: {
      title: t("contact.title"),
      description: `${t("contact.manageContacts")} Viewing as ${roleLabel}.`,
      buttonLabel: "Add Contact",
      onAdd: () => { setEditingContact(null); setShowContactModal(true); },
    },
    tickets: {
      title: t("ticket.title"),
      description: `${t("ticket.manageTickets")} Viewing as ${roleLabel}.`,
      buttonLabel: "New Ticket",
      onAdd: () => { setEditingTicket(null); setShowTicketModal(true); },
    },
  };

  const current = tabConfig[activeTab];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={current.title} description={current.description}>
        <Button onClick={current.onAdd} className="gap-2">
          <Plus className="w-4 h-4" /> {current.buttonLabel}
        </Button>
      </PageHeader>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2">
        <Button variant={activeTab === "accounts" ? "default" : "ghost"} onClick={() => setActiveTab("accounts")} className="gap-2">
          <Building2 className="w-4 h-4" /> Accounts
        </Button>
        <Button variant={activeTab === "contacts" ? "default" : "ghost"} onClick={() => setActiveTab("contacts")} className="gap-2">
          <Users className="w-4 h-4" /> Contacts
        </Button>
        <Button variant={activeTab === "tickets" ? "default" : "ghost"} onClick={() => setActiveTab("tickets")} className="gap-2">
          <Ticket className="w-4 h-4" /> Tickets
        </Button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ACCOUNTS TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "accounts" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Accounts" value={totalAccounts} subtitle="All account types" icon={<Building2 className="w-5 h-5" />} trend={{ value: 5, label: "vs last month" }} />
            <StatsCard title="Customers" value={customerCount} subtitle="Active paying customers" icon={<Users className="w-5 h-5" />} />
            <StatsCard title="Prospects" value={prospectCount} subtitle="In evaluation phase" icon={<TrendingUp className="w-5 h-5" />} />
            <StatsCard title="Total Revenue" value={`EGP ${(totalRevenue / 1000000).toFixed(0)}M`} subtitle="Customer accounts only" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 9, label: "vs last year" }} />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={accountFilters._search}
                onSearchChange={(v) => setAccountFilters((f) => ({ ...f, _search: v }))}
                fields={ACCOUNT_FILTER_FIELDS}
                values={accountFilters}
                onChange={(k, v) => setAccountFilters((f) => ({ ...f, [k]: v }))}
              />
            </div>
            <DataTable columns={accountColumns} data={filteredAccounts as unknown as Record<string, unknown>[]} emptyMessage="No accounts found." exportable exportFilename="accounts.csv" />
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          CONTACTS TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "contacts" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Contacts" value={totalContacts} subtitle="All contacts in system" icon={<Users className="w-5 h-5" />} trend={{ value: 7, label: "vs last month" }} />
            <StatsCard title="New This Month" value={newThisMonth} subtitle="Added in March 2026" icon={<UserPlus className="w-5 h-5" />} />
            <StatsCard title="With Account" value={withAccount} subtitle="Linked to an account" icon={<Link className="w-5 h-5" />} />
            <StatsCard title="Without Account" value={withoutAccount} subtitle="Not yet linked" icon={<UserX className="w-5 h-5" />} />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={contactFilters._search}
                onSearchChange={(v) => setContactFilters((f) => ({ ...f, _search: v }))}
                fields={CONTACT_FILTER_FIELDS}
                values={contactFilters}
                onChange={(k, v) => setContactFilters((f) => ({ ...f, [k]: v }))}
              />
            </div>
            <DataTable columns={contactColumns} data={filteredContacts as unknown as Record<string, unknown>[]} emptyMessage="No contacts found." exportable exportFilename="contacts.csv" />
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TICKETS TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Open Tickets" value={openTickets} subtitle="Requires attention" icon={<Ticket className="w-5 h-5" />} />
            <StatsCard title="In Progress" value={inProgress} subtitle="Currently being worked on" icon={<AlertTriangle className="w-5 h-5" />} />
            <StatsCard title="Avg Resolution Time" value={avgResolution} subtitle="Last 30 days" icon={<Clock className="w-5 h-5" />} trend={{ value: -8, label: "faster than last month" }} />
            <StatsCard title="Customer Satisfaction" value={satisfaction} subtitle="Based on CSAT surveys" icon={<Star className="w-5 h-5" />} trend={{ value: 2, label: "vs last month" }} />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-4 border-b border-border">
              <FilterBar
                searchValue={ticketFilters._search}
                onSearchChange={(v) => setTicketFilters((f) => ({ ...f, _search: v }))}
                fields={TICKET_FILTER_FIELDS}
                values={ticketFilters}
                onChange={(k, v) => setTicketFilters((f) => ({ ...f, [k]: v }))}
              />
            </div>
            <DataTable columns={ticketColumns} data={filteredTickets as unknown as Record<string, unknown>[]} emptyMessage="No tickets found." exportable exportFilename="tickets.csv" />
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODALS — Account
         ════════════════════════════════════════════════════════════════════════ */}
      <EntityFormModal
        open={showAccountModal}
        onOpenChange={(open) => { setShowAccountModal(open); if (!open) setEditingAccount(null); }}
        title={editingAccount ? "Edit Account" : "Add New Account"}
        fields={ACCOUNT_FIELDS}
        initialData={editingAccount ? { name: editingAccount.name, industry: editingAccount.industry, type: editingAccount.type, phone: editingAccount.phone, city: editingAccount.city, revenue: editingAccount.revenue, owner: editingAccount.owner } : undefined}
        onSubmit={(data) => {
          // Validate required fields
          const accountName = (data.name as string || "").trim();
          if (!accountName) {
            alert("Account Name is required.");
            return;
          }

          if (editingAccount) {
            setAccounts((prev) => prev.map((a) => a.id === editingAccount.id ? {
              ...a,
              name: accountName,
              industry: (data.industry as Industry) || a.industry,
              type: (data.type as AccountType) || a.type,
              phone: (data.phone as string) || a.phone,
              city: (data.city as string) || a.city,
              revenue: (data.revenue as number) || a.revenue,
              owner: (data.owner as string) || a.owner,
            } : a));
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "UPDATE",
              module: "CRM",
              entity: "Account",
              entityId: editingAccount.id,
              entityName: editingAccount.name,
              details: `Updated account ${editingAccount.name}`,
            });
          } else {
            const newAccount: Account = {
              id: `ACC-${Date.now().toString(36)}`,
              name: accountName,
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
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "CREATE",
              module: "CRM",
              entity: "Account",
              entityId: newAccount.id,
              entityName: newAccount.name,
              details: `Created account ${newAccount.name}`,
            });
          }
          setShowAccountModal(false);
          setEditingAccount(null);
        }}
      />

      {/* ── Account Detail Dialog ── */}
      <Dialog open={!!detailAccount} onOpenChange={(open) => { if (!open) setDetailAccount(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailAccount?.name}</DialogTitle>
          </DialogHeader>
          {detailAccount && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Account Name</span><p className="font-medium">{detailAccount.name}</p></div>
                <div><span className="text-sm text-muted-foreground">Industry</span><p className="font-medium">{detailAccount.industry}</p></div>
                <div><span className="text-sm text-muted-foreground">Type</span><p><TypeBadge type={detailAccount.type} /></p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailAccount.status} /></p></div>
                <div><span className="text-sm text-muted-foreground">Phone</span><p className="font-medium">{detailAccount.phone || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">City</span><p className="font-medium">{detailAccount.city || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Annual Revenue</span><p className="font-medium">{fmtEGP(detailAccount.revenue)}</p></div>
                <div><span className="text-sm text-muted-foreground">Account Owner</span><p className="font-medium">{detailAccount.owner}</p></div>
                <div><span className="text-sm text-muted-foreground">Created</span><p className="font-medium">{detailAccount.createdAt}</p></div>
              </div>
              {/* Cross-module: related invoices from ERP */}
              {(() => {
                const matchedCustomer = store.customers.find(c => c.name === detailAccount.name);
                const relatedInvoices = matchedCustomer ? store.invoices.filter(i => i.customerId === matchedCustomer.id) : [];
                return matchedCustomer ? (
                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-semibold mb-2">ERP Data — {matchedCustomer.name}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Outstanding</span><p className="font-medium">EGP {(matchedCustomer.outstanding ?? 0).toLocaleString()}</p></div>
                      <div><span className="text-muted-foreground">Credit Limit</span><p className="font-medium">EGP {(matchedCustomer.creditLimit ?? 0).toLocaleString()}</p></div>
                      <div><span className="text-muted-foreground">Invoices</span><p className="font-medium">{relatedInvoices.length} ({relatedInvoices.filter(i => i.status === "PAID").length} paid)</p></div>
                      <div><span className="text-muted-foreground">Payment Terms</span><p className="font-medium">{matchedCustomer.paymentTerms}</p></div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODALS — Contact
         ════════════════════════════════════════════════════════════════════════ */}
      <EntityFormModal
        open={showContactModal}
        onOpenChange={(open) => { setShowContactModal(open); if (!open) setEditingContact(null); }}
        title={editingContact ? "Edit Contact" : "Add New Contact"}
        fields={CONTACT_FIELDS}
        initialData={editingContact ? { firstName: editingContact.firstName, lastName: editingContact.lastName, title: editingContact.title, email: editingContact.email, phone: editingContact.phone, account: editingContact.account || "", owner: editingContact.owner } : undefined}
        onSubmit={(data) => {
          // Validate required fields
          const firstName = (data.firstName as string || "").trim();
          const email = (data.email as string || "").trim();
          if (!firstName || !email) {
            alert("First Name and Email are required.");
            return;
          }

          if (editingContact) {
            setContacts((prev) => prev.map((c) => c.id === editingContact.id ? {
              ...c,
              firstName,
              lastName: (data.lastName as string) || c.lastName,
              title: (data.title as string) || c.title,
              email,
              phone: (data.phone as string) || c.phone,
              account: (data.account as string) || null,
              owner: (data.owner as string) || c.owner,
            } : c));
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "UPDATE",
              module: "CRM",
              entity: "Contact",
              entityId: editingContact.id,
              entityName: `${editingContact.firstName} ${editingContact.lastName}`,
              details: `Updated contact ${editingContact.firstName} ${editingContact.lastName}`,
            });
          } else {
            const newContact: Contact = {
              id: `CON-${Date.now().toString(36)}`,
              firstName,
              lastName: (data.lastName as string) || "",
              title: (data.title as string) || "",
              email,
              phone: (data.phone as string) || "",
              account: (data.account as string) || null,
              owner: (data.owner as string) || "Unassigned",
              status: "active",
              createdAt: new Date().toISOString().split("T")[0],
            };
            setContacts((prev) => [newContact, ...prev]);
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "CREATE",
              module: "CRM",
              entity: "Contact",
              entityId: newContact.id,
              entityName: `${newContact.firstName} ${newContact.lastName}`,
              details: `Created contact ${newContact.firstName} ${newContact.lastName}`,
            });
          }
          setShowContactModal(false);
          setEditingContact(null);
        }}
      />

      {/* ── Contact Detail Dialog ── */}
      <Dialog open={!!detailContact} onOpenChange={(open) => { if (!open) setDetailContact(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailContact?.firstName} {detailContact?.lastName}</DialogTitle>
          </DialogHeader>
          {detailContact && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Name</span><p className="font-medium">{detailContact.firstName} {detailContact.lastName}</p></div>
                <div><span className="text-sm text-muted-foreground">Job Title</span><p className="font-medium">{detailContact.title || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{detailContact.email}</p></div>
                <div><span className="text-sm text-muted-foreground">Phone</span><p className="font-medium">{detailContact.phone || "—"}</p></div>
                <div><span className="text-sm text-muted-foreground">Account</span><p className="font-medium">{detailContact.account || "No account"}</p></div>
                <div><span className="text-sm text-muted-foreground">Owner</span><p className="font-medium">{detailContact.owner}</p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={detailContact.status} /></p></div>
                <div><span className="text-sm text-muted-foreground">Created</span><p className="font-medium">{detailContact.createdAt}</p></div>
              </div>
              {/* Cross-module: ERP customer data */}
              {(() => {
                if (!detailContact.account) return null;
                const matchedCustomer = store.customers.find(c => c.name === detailContact.account);
                const relatedInvoices = matchedCustomer ? store.invoices.filter(i => i.customerId === matchedCustomer.id) : [];
                return matchedCustomer ? (
                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-semibold mb-2">ERP Customer Data — {matchedCustomer.name}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Outstanding</span><p className="font-medium">EGP {(matchedCustomer.outstanding ?? 0).toLocaleString()}</p></div>
                      <div><span className="text-muted-foreground">Credit Limit</span><p className="font-medium">EGP {(matchedCustomer.creditLimit ?? 0).toLocaleString()}</p></div>
                      <div><span className="text-muted-foreground">Invoices</span><p className="font-medium">{relatedInvoices.length} ({relatedInvoices.filter(i => i.status === "PAID").length} paid)</p></div>
                      <div><span className="text-muted-foreground">Payment Terms</span><p className="font-medium">{matchedCustomer.paymentTerms}</p></div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODALS — Ticket
         ════════════════════════════════════════════════════════════════════════ */}
      <EntityFormModal
        open={showTicketModal}
        onOpenChange={(open) => { setShowTicketModal(open); if (!open) setEditingTicket(null); }}
        title={editingTicket ? "Edit Ticket" : "Create New Ticket"}
        fields={TICKET_FIELDS}
        initialData={editingTicket ? { subject: editingTicket.subject, account: editingTicket.account, priority: editingTicket.priority, assignedTo: editingTicket.assignedTo, slaDeadline: editingTicket.slaDeadline } : undefined}
        onSubmit={(data) => {
          // Validate required fields
          const subject = (data.subject as string || "").trim();
          const ticketAccount = (data.account as string || "").trim();
          if (!subject || !ticketAccount) {
            alert("Subject and Account are required.");
            return;
          }

          if (editingTicket) {
            setTickets((prev) => prev.map((tk) => tk.id === editingTicket.id ? {
              ...tk,
              subject,
              account: ticketAccount,
              priority: (data.priority as Priority) || tk.priority,
              assignedTo: (data.assignedTo as string) || tk.assignedTo,
              slaDeadline: (data.slaDeadline as string) || tk.slaDeadline,
            } : tk));
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "UPDATE",
              module: "CRM",
              entity: "Ticket",
              entityId: editingTicket.id,
              entityName: editingTicket.ticketNumber,
              details: `Updated ticket ${editingTicket.ticketNumber}`,
            });
          } else {
            const uniqueId = Date.now().toString(36);
            const newTicket: SupportTicket = {
              id: uniqueId,
              ticketNumber: `TKT-${uniqueId}`,
              subject,
              account: ticketAccount,
              priority: (data.priority as Priority) || "MEDIUM",
              status: "OPEN",
              assignedTo: (data.assignedTo as string) || "Unassigned",
              slaDeadline: (data.slaDeadline as string) || "",
              createdAt: new Date().toISOString().split("T")[0],
            };
            setTickets((prev) => [newTicket, ...prev]);
            logAction({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: "CREATE",
              module: "CRM",
              entity: "Ticket",
              entityId: newTicket.id,
              entityName: newTicket.ticketNumber,
              details: `Created ticket ${newTicket.ticketNumber}: ${newTicket.subject}`,
            });
          }
          setShowTicketModal(false);
          setEditingTicket(null);
        }}
      />

      {/* ── Ticket Detail Dialog ── */}
      <Dialog open={!!detailTicket} onOpenChange={(open) => { if (!open) setDetailTicket(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTicket?.ticketNumber} &mdash; {detailTicket?.subject}</DialogTitle>
          </DialogHeader>
          {detailTicket && (() => {
            const slaDate = new Date(detailTicket.slaDeadline.replace(" ", "T"));
            const now = new Date();
            const slaBreached = slaDate < now && detailTicket.status !== "CLOSED" && detailTicket.status !== "RESOLVED";
            const slaRemaining = slaDate > now ? Math.round((slaDate.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-sm text-muted-foreground">Ticket #</span><p className="font-medium font-mono">{detailTicket.ticketNumber}</p></div>
                  <div><span className="text-sm text-muted-foreground">Priority</span><p><PriorityBadge priority={detailTicket.priority} /></p></div>
                  <div className="col-span-2"><span className="text-sm text-muted-foreground">Subject</span><p className="font-medium">{detailTicket.subject}</p></div>
                  <div><span className="text-sm text-muted-foreground">Account</span><p className="font-medium">{detailTicket.account}</p></div>
                  <div><span className="text-sm text-muted-foreground">Status</span><p><StatusBadge status={STATUS_MAP[detailTicket.status]} /></p></div>
                  <div><span className="text-sm text-muted-foreground">Assigned To</span><p className="font-medium">{detailTicket.assignedTo}</p></div>
                  <div><span className="text-sm text-muted-foreground">Created</span><p className="font-medium">{detailTicket.createdAt}</p></div>
                </div>
                {/* SLA Info */}
                <div className={`rounded-lg border p-4 ${slaBreached ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : "border-border bg-muted/30"}`}>
                  <h4 className="text-sm font-semibold mb-2">SLA Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-sm text-muted-foreground">SLA Deadline</span><p className="font-medium">{detailTicket.slaDeadline}</p></div>
                    <div>
                      <span className="text-sm text-muted-foreground">SLA Status</span>
                      {slaBreached ? (
                        <p className="font-medium text-red-600 dark:text-red-400">Breached</p>
                      ) : detailTicket.status === "CLOSED" || detailTicket.status === "RESOLVED" ? (
                        <p className="font-medium text-green-600 dark:text-green-400">Met</p>
                      ) : (
                        <p className="font-medium text-foreground">{slaRemaining}h remaining</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Cross-module: ERP customer data */}
                {(() => {
                  const matchedCustomer = store.customers.find(c => c.name === detailTicket.account);
                  const relatedInvoices = matchedCustomer ? store.invoices.filter(i => i.customerId === matchedCustomer.id) : [];
                  const overdueInvoices = relatedInvoices.filter(i => i.status === "OVERDUE");
                  return matchedCustomer ? (
                    <div className="pt-3 border-t">
                      <h4 className="text-sm font-semibold mb-2">ERP Customer Data — {matchedCustomer.name}</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Customer Status</span><p className="font-medium">{matchedCustomer.status}</p></div>
                        <div><span className="text-muted-foreground">Outstanding</span><p className="font-medium">EGP {(matchedCustomer.outstanding ?? 0).toLocaleString()}</p></div>
                        <div><span className="text-muted-foreground">Invoices</span><p className="font-medium">{relatedInvoices.length} total ({overdueInvoices.length} overdue)</p></div>
                        <div><span className="text-muted-foreground">Payment Terms</span><p className="font-medium">{matchedCustomer.paymentTerms}</p></div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
