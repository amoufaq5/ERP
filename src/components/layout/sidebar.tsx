"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/user-context";
import {
  LayoutDashboard,
  DollarSign,
  ShoppingCart,
  Package,
  FolderKanban,
  Users,

  Factory,
  UserCheck,
  Crown,
  Stethoscope,
  MapPin,
  Banknote,

  Briefcase,
  UserSearch,
  CalendarCheck,
  Rocket,
  GraduationCap,
  Zap,
  Brain,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building,
  Building2,
  X,
  ShieldCheck,
  Scale,
  ClipboardList,
  CheckSquare,
  Truck,
  Wrench,
  Puzzle,
  Link2,
  Table2,
  Upload,
  MessageSquare,
  Database,
  Target,
  Calculator,
  Contact,
  Megaphone,
  TrendingUp,


  Sparkles,
  Globe,
  ShoppingBag,


  PieChart,
  Code2,
  GitBranch,
  Pill,
  BookOpen,
  Heart,
  Mail,
  Star,
  Network,
  FlaskConical,
  AlertTriangle,
  Bug,
  Microscope,
  Thermometer,
  Activity,
  LineChart,
  ScrollText,
  Droplets,
  Undo2,
  Search,
  FileCheck,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/i18n-context";

interface NavItem {
  label: string;
  labelKey?: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  titleKey?: string;
  icon?: LucideIcon;
  hub?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main", titleKey: "sidebar.main",
    items: [
      { label: "Dashboard", labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Messages", labelKey: "nav.messages", href: "/messages", icon: MessageSquare },
      { label: "Tasks", labelKey: "sidebar.tasks", href: "/tasks", icon: ClipboardList },
    ],
  },
  {
    title: "Finance & Accounting", titleKey: "nav.finance",
    icon: DollarSign,
    hub: "/hubs/finance",
    items: [
      { label: "Hub Overview", labelKey: "sidebar.hubOverview", href: "/hubs/finance", icon: LayoutDashboard },
      { label: "Finance & Banking", labelKey: "sidebar.finance", href: "/erp/finance", icon: DollarSign },
      { label: "Accounting", labelKey: "nav.accounting", href: "/erp/accounting", icon: Calculator },
      { label: "Collections", labelKey: "nav.collections", href: "/erp/collections", icon: Banknote },
      { label: "Partner Ledger", labelKey: "nav.partnerLedger", href: "/erp/partner-detail", icon: Scale },
    ],
  },
  {
    title: "HR & Talent", titleKey: "nav.hr",
    icon: Users,
    hub: "/hubs/hr",
    items: [
      { label: "Hub Overview", labelKey: "sidebar.hubOverview", href: "/hubs/hr", icon: LayoutDashboard },
      { label: "HR & Payroll", labelKey: "sidebar.hrPayroll", href: "/erp/hr", icon: Users },
      { label: "Jobs", labelKey: "sidebar.jobs", href: "/ats/jobs", icon: Briefcase },
      { label: "Candidates", labelKey: "sidebar.candidates", href: "/ats/candidates", icon: UserSearch },
      { label: "Interviews", labelKey: "nav.interviews", href: "/ats/interviews", icon: CalendarCheck },
      { label: "Onboarding", labelKey: "nav.onboarding", href: "/ats/onboarding", icon: Rocket },
      { label: "Training", labelKey: "nav.training", href: "/ats/training", icon: GraduationCap },
    ],
  },
  {
    title: "Supply Chain", titleKey: "nav.supplyChain",
    icon: Truck,
    hub: "/hubs/supply-chain",
    items: [
      { label: "Hub Overview", labelKey: "sidebar.hubOverview", href: "/hubs/supply-chain", icon: LayoutDashboard },
      { label: "Supply Chain", labelKey: "sidebar.supplyChain", href: "/supply-chain", icon: Truck },
      { label: "Procurement", labelKey: "nav.procurement", href: "/erp/procurement", icon: ShoppingCart },
      { label: "Sales Orders", labelKey: "sidebar.salesOrders", href: "/erp/sales-order", icon: ShoppingBag },
      { label: "Inventory", labelKey: "nav.inventory", href: "/erp/inventory", icon: Package },
      { label: "Products", labelKey: "nav.products", href: "/erp/products", icon: Pill },
    ],
  },
  {
    title: "CRM Sales", titleKey: "nav.sales",
    icon: TrendingUp,
    hub: "/hubs/crm",
    items: [
      { label: "Hub Overview", labelKey: "sidebar.hubOverview", href: "/hubs/crm", icon: LayoutDashboard },
      { label: "Accounts", labelKey: "nav.accounts", href: "/crm/accounts", icon: Building2 },
      { label: "Sales Pipeline", labelKey: "nav.leads", href: "/crm/leads", icon: Sparkles },
      { label: "Marketing Hub", labelKey: "nav.campaigns", href: "/crm/campaigns", icon: Megaphone },
    ],
  },
  {
    title: "Field Operations", titleKey: "sidebar.fieldOps",
    icon: MapPin,
    items: [
      { label: "Business Units", labelKey: "sidebar.businessUnits", href: "/crm/business-units", icon: Building },
      { label: "My Team", labelKey: "sidebar.myTeam", href: "/crm/my-team", icon: Users },
      { label: "Medical Reps", labelKey: "sidebar.medicalReps", href: "/crm/medical-rep", icon: UserCheck },
      { label: "District Manager", labelKey: "sidebar.districtManager", href: "/crm/district-manager", icon: Users },
      { label: "Marketeer", labelKey: "sidebar.marketeer", href: "/crm/marketeer", icon: Target },
      { label: "BUM Dashboard", labelKey: "sidebar.bumDashboard", href: "/crm/bum", icon: Crown },
      { label: "Territories (IMS)", labelKey: "sidebar.territories", href: "/crm/territories", icon: Globe },
      { label: "Weekly Plans", labelKey: "sidebar.weeklyPlans", href: "/crm/weekly-plan", icon: CalendarCheck },
      { label: "Doctor Directory", labelKey: "sidebar.doctorDirectory", href: "/crm/doctors", icon: Stethoscope },
      { label: "Visit Tracking", labelKey: "sidebar.visitTracking", href: "/crm/gps-tracking", icon: MapPin },
      { label: "Market Requests", labelKey: "sidebar.marketRequests", href: "/crm/market-requests", icon: ClipboardList },
      { label: "KPIs", labelKey: "sidebar.kpis", href: "/crm/kpis", icon: Target },
      { label: "Call Analysis", labelKey: "sidebar.callAnalysis", href: "/crm/call-analysis", icon: BarChart3 },
      { label: "Expenses", labelKey: "sidebar.expenses", href: "/crm/expenses", icon: Banknote },
      { label: "CRM Reports", labelKey: "sidebar.crmReports", href: "/crm/reports", icon: BarChart3 },
      { label: "Product Guide", labelKey: "sidebar.productGuide", href: "/crm/product-guide", icon: BookOpen },
      { label: "NSM Dashboard", href: "/crm/nsm", icon: Network },
      { label: "Customer 360", href: "/crm/customer-360", icon: Contact },
      { label: "Loyalty Program", href: "/crm/loyalty", icon: Heart },
      { label: "CRM Contacts", href: "/crm/contacts", icon: Contact },
      { label: "Opportunities", href: "/crm/opportunities", icon: Star },
      { label: "CRM Forecasting", href: "/crm/forecasting", icon: TrendingUp },
      { label: "Email Hub", href: "/crm/email", icon: Mail },
      { label: "Support Tickets", href: "/crm/tickets", icon: ClipboardList },
    ],
  },
  {
    title: "Quality & Compliance", titleKey: "nav.quality",
    icon: ShieldCheck,
    hub: "/hubs/quality",
    items: [
      { label: "Hub Overview", labelKey: "sidebar.hubOverview", href: "/hubs/quality", icon: LayoutDashboard },
      { label: "QA / QC Hub", labelKey: "nav.qaqc", href: "/qaqc", icon: CheckSquare },
      { label: "Stability Studies", href: "/qaqc/stability-studies", icon: FlaskConical },
      { label: "Deviations", href: "/qaqc/deviations", icon: AlertTriangle },
      { label: "CAPA", href: "/qaqc/capa", icon: Bug },
      { label: "Batch Release", href: "/qaqc/batch-release", icon: FileCheck },
      { label: "Document Control", href: "/qaqc/document-control", icon: ScrollText },
      { label: "Change Control", href: "/qaqc/change-control", icon: Undo2 },
      { label: "OOS Investigation", href: "/qaqc/oos-investigation", icon: Search },
      { label: "Complaints", href: "/qaqc/complaints", icon: MessageSquare },
      { label: "Env. Monitoring", href: "/qaqc/environmental-monitoring", icon: Thermometer },
      { label: "SPC Charts", href: "/qaqc/spc-charts", icon: LineChart },
      { label: "Audit Management", href: "/qaqc/audit-management", icon: ShieldCheck },
      { label: "Training Matrix", href: "/qaqc/training-matrix", icon: GraduationCap },
      { label: "Risk Assessment", href: "/qaqc/risk-assessment", icon: Activity },
      { label: "Cleaning Validation", href: "/qaqc/cleaning-validation", icon: Microscope },
      { label: "Product Recalls", href: "/qaqc/recalls", icon: Undo2 },
      { label: "Water System", href: "/qaqc/water-system", icon: Droplets },
      { label: "Safety", labelKey: "nav.safety", href: "/safety", icon: ShieldCheck },
      { label: "Compliance", labelKey: "nav.compliance", href: "/compliance", icon: Scale },
    ],
  },
  {
    title: "Operations", titleKey: "sidebar.operations",
    icon: Factory,
    items: [
      { label: "Projects", labelKey: "sidebar.projects", href: "/erp/projects", icon: FolderKanban },
      { label: "Manufacturing", labelKey: "sidebar.manufacturing", href: "/erp/manufacturing", icon: Factory },
      { label: "Facility", labelKey: "sidebar.facility", href: "/facility", icon: Wrench },
      { label: "Planning", labelKey: "sidebar.planning", href: "/planning", icon: Target },
      { label: "Industry", labelKey: "sidebar.industry", href: "/industry", icon: Factory },
    ],
  },
  {
    title: "Tools & Admin", titleKey: "nav.tools",
    icon: Settings,
    hub: "/hubs/tools",
    items: [
      { label: "Hub Overview", labelKey: "sidebar.hubOverview", href: "/hubs/tools", icon: LayoutDashboard },
      { label: "Spreadsheet", labelKey: "tools.spreadsheet", href: "/spreadsheet", icon: Table2 },
      { label: "Data Upload", labelKey: "nav.dataUpload", href: "/data-upload", icon: Upload },
      { label: "Data Migration", labelKey: "sidebar.dataMigration", href: "/data-migration", icon: Database },
      { label: "Integrations", labelKey: "nav.integration", href: "/integration", icon: Link2 },
      { label: "Workflows", labelKey: "sidebar.workflows", href: "/erp/workflows", icon: GitBranch },
      { label: "Ecosystem", labelKey: "sidebar.ecosystem", href: "/ecosystem", icon: Puzzle },
      { label: "Automation", labelKey: "nav.automation", href: "/automation", icon: Zap },
      { label: "AI Hub", labelKey: "sidebar.aiHub", href: "/ai", icon: Brain },
      { label: "Documents", labelKey: "nav.documents", href: "/documents", icon: FileText },
      { label: "Reports", labelKey: "nav.reports", href: "/reports", icon: BarChart3 },
      { label: "Analytics", labelKey: "sidebar.analytics", href: "/analytics", icon: PieChart },
      { label: "Settings", labelKey: "nav.settings", href: "/settings", icon: Settings },
      { label: "User Management", labelKey: "sidebar.userManagement", href: "/admin/users", icon: Users },
      { label: "Tenants", labelKey: "sidebar.tenants", href: "/admin/tenants", icon: Building2 },
      { label: "Database", labelKey: "sidebar.database", href: "/admin/database", icon: Database },
      { label: "API Docs", labelKey: "sidebar.apiDocs", href: "/admin/api", icon: Code2 },
      { label: "Audit Log", labelKey: "sidebar.auditLog", href: "/admin/audit-log", icon: ShieldCheck },
    ],
  },
];

// ---------------------------------------------------------------------------
// Role-specific sidebar section definitions
// Each entry maps a custom section title to an array of nav-item labels drawn
// from the master NAV_SECTIONS list. For ADMIN (or any unlisted role) we fall
// back to the full NAV_SECTIONS unchanged.
// ---------------------------------------------------------------------------

interface RoleSectionDef {
  title: string;
  titleKey?: string;
  items: string[]; // labels referencing NavItem.label in NAV_SECTIONS
}

const ROLE_SECTIONS: Record<string, RoleSectionDef[]> = {
  MEDICAL_REP: [
    { title: "Main", titleKey: "sidebar.main", items: ["Medical Reps", "Messages", "Tasks"] },
    {
      title: "My Field Work", titleKey: "sidebar.myFieldWork",
      items: ["Doctor Directory", "Weekly Plans", "Visit Tracking", "Customer 360"],
    },
    {
      title: "Operations", titleKey: "sidebar.market",
      items: ["Market Requests", "Expenses", "KPIs"],
    },
  ],
  DISTRICT_MANAGER: [
    { title: "Main", titleKey: "sidebar.main", items: ["District Manager", "Messages", "Tasks"] },
    {
      title: "My Team", titleKey: "sidebar.teamManagement",
      items: ["Medical Reps", "Weekly Plans", "Visit Tracking", "KPIs", "Call Analysis"],
    },
    {
      title: "Field Operations", titleKey: "sidebar.fieldOps",
      items: ["Doctor Directory", "Customer 360", "Market Requests", "Expenses", "CRM Reports"],
    },
  ],
  MARKETEER: [
    { title: "Main", titleKey: "sidebar.main", items: ["Dashboard", "Messages", "Tasks"] },
    {
      title: "Regional Overview", titleKey: "sidebar.regionalOverview",
      items: ["Business Units", "Territories (IMS)", "KPIs", "Call Analysis", "CRM Reports"],
    },
    {
      title: "Sales & Marketing", titleKey: "nav.sales",
      items: ["Marketing Hub", "Sales Pipeline", "Customer 360"],
    },
    {
      title: "Team Management", titleKey: "sidebar.teamManagement",
      items: ["District Manager", "Medical Reps", "Weekly Plans", "Doctor Directory", "Visit Tracking"],
    },
    {
      title: "Operations",
      items: ["Market Requests", "Expenses"],
    },
  ],
  NSM: [
    { title: "Main", titleKey: "sidebar.main", items: ["NSM Dashboard", "Messages", "Tasks"] },
    {
      title: "National Overview",
      items: ["Business Units", "Territories (IMS)", "KPIs", "CRM Reports", "Product Guide"],
    },
    {
      title: "Sales & Marketing",
      items: ["Sales Pipeline", "Marketing Hub", "Opportunities", "CRM Forecasting", "Customer 360", "Loyalty Program"],
    },
    {
      title: "Field Force",
      items: ["BUM Dashboard", "Marketeer", "District Manager", "Medical Reps", "Weekly Plans", "Doctor Directory", "Visit Tracking", "Call Analysis"],
    },
    {
      title: "Operations",
      items: ["Market Requests", "Expenses", "Email Hub", "CRM Contacts", "Support Tickets"],
    },
    {
      title: "Administration",
      items: ["Audit Log", "Analytics"],
    },
  ],
  BUM: [
    { title: "Main", titleKey: "sidebar.main", items: ["BUM Dashboard", "Messages", "Tasks"] },
    {
      title: "My Business Unit", titleKey: "sidebar.businessUnit",
      items: ["Business Units", "Territories (IMS)", "KPIs", "Call Analysis", "CRM Reports"],
    },
    {
      title: "Sales & Marketing",
      items: ["Sales Pipeline", "Marketing Hub", "Opportunities", "Customer 360"],
    },
    {
      title: "Team & Field", titleKey: "sidebar.teamField",
      items: ["Marketeer", "District Manager", "Medical Reps", "Weekly Plans", "Doctor Directory", "Visit Tracking"],
    },
    {
      title: "Requests & Operations", titleKey: "sidebar.salesMarketing",
      items: ["Market Requests", "Expenses", "Product Guide"],
    },
  ],
  ACCOUNTANT: [
    { title: "Main", titleKey: "sidebar.main", items: ["Dashboard", "Messages", "Tasks"] },
    {
      title: "Finance & Accounting", titleKey: "nav.finance",
      items: ["Finance & Banking", "Accounting", "Collections", "Partner Ledger"],
    },
    {
      title: "Supply Chain", titleKey: "nav.supplyChain",
      items: ["Procurement", "Sales Orders", "Inventory"],
    },
  ],
  WAREHOUSE: [
    { title: "Main", titleKey: "sidebar.main", items: ["Dashboard", "Messages", "Tasks"] },
    {
      title: "Supply Chain", titleKey: "nav.supplyChain",
      items: ["Inventory", "Products", "Procurement", "Sales Orders"],
    },
    {
      title: "Operations", titleKey: "sidebar.operations",
      items: ["Manufacturing"],
    },
  ],
  HR: [
    { title: "Main", titleKey: "sidebar.main", items: ["Dashboard", "Messages", "Tasks"] },
    {
      title: "HR & Talent", titleKey: "nav.hr",
      items: ["HR & Payroll", "Jobs", "Candidates", "Interviews", "Onboarding", "Training"],
    },
    {
      title: "Approvals", titleKey: "sidebar.approvals",
      items: ["Expenses"],
    },
  ],
};

/** Build a flat lookup: item label -> NavItem (from the master list). */
function buildItemIndex(): Map<string, NavItem> {
  const idx = new Map<string, NavItem>();
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      idx.set(item.label, item);
    }
  }
  return idx;
}

const ITEM_INDEX = buildItemIndex();

/**
 * Return sidebar sections tailored to the given role.
 * ADMIN (and any unknown role) gets the default NAV_SECTIONS.
 */
function getOrderedSections(role: string): NavSection[] {
  const defs = ROLE_SECTIONS[role];
  if (!defs) return NAV_SECTIONS; // ADMIN / fallback

  return defs.map((def) => ({
    title: def.title,
    titleKey: def.titleKey,
    items: def.items
      .map((label) => ITEM_INDEX.get(label))
      .filter((item): item is NavItem => item != null),
  }));
}

// ---------------------------------------------------------------------------

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, canAccess } = useCurrentUser();

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function sectionHasActive(section: NavSection): boolean {
    return section.items.some((item) => isActive(item.href));
  }

  const role = user?.role ?? "ADMIN";
  const baseSections = getOrderedSections(role);

  // ---------------------------------------------------------------------------
  // Role-based nav filtering — only show routes the current user can access.
  //
  // 1. Remove orphan/debug routes that should never appear in navigation
  // 2. Block /admin/* routes for non-ADMIN roles (canAccess checks ROLE_ROUTES
  //    which only grants /admin/* to ADMIN via wildcard, plus explicit entries
  //    like /admin/audit-log for NSM)
  // 3. Check every remaining item against canAccess() backed by ROLE_ROUTES
  //    (src/lib/auth/role-routes.ts) — ADMIN has wildcard "*" so sees everything
  // 4. Drop entire sections when all their items are filtered out
  // ---------------------------------------------------------------------------
  const HIDDEN_ROUTES = ["/test-auth", "/integration-hub"];

  const visibleSections: NavSection[] = baseSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Always exclude orphan / debug routes from navigation
        if (HIDDEN_ROUTES.some((r) => item.href === r || item.href.startsWith(r + "/"))) {
          return false;
        }
        // For /admin/* routes, non-ADMIN roles must have an explicit grant in
        // ROLE_ROUTES (e.g. NSM has /admin/audit-log). canAccess() handles this
        // because ADMIN's wildcard "*" allows everything while other roles need
        // the route listed explicitly.
        return canAccess(item.href);
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-slate-900 text-white shrink-0 sidebar-transition overflow-hidden border-r rtl:border-r-0 rtl:border-l border-slate-800",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          isActive={isActive}
          sectionHasActive={sectionHasActive}
          sections={visibleSections}
        />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 z-30 flex flex-col w-64 bg-slate-900 text-white lg:hidden transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        <SidebarContent
          collapsed={false}
          onCollapsedChange={() => {}}
          isActive={isActive}
          sectionHasActive={sectionHasActive}
          sections={visibleSections}
          onMobileClose={onMobileClose}
          isMobile
        />
      </aside>
    </>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  isActive: (href: string) => boolean;
  sectionHasActive: (section: NavSection) => boolean;
  sections: NavSection[];
  onMobileClose?: () => void;
  isMobile?: boolean;
}

function SidebarContent({
  collapsed,
  onCollapsedChange,
  isActive,
  sectionHasActive,
  sections,
  onMobileClose,
  isMobile,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach((s) => initial.add(s.title));
    return initial;
  });

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 shrink-0 border-b border-slate-800",
          collapsed ? "justify-center px-0" : "px-4 gap-3"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <Building className="h-4 w-4 text-white" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">
              Enterprise Suite
            </p>
            <p className="text-[10px] text-slate-400 truncate leading-tight">
              ERP · CRM · ATS
            </p>
          </div>
        )}

        {isMobile && (
          <button
            onClick={onMobileClose}
            className="ml-auto rtl:mr-auto rtl:ml-0 p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.title);
          const hasActive = sectionHasActive(section);
          const isCollapsible = section.title !== "Main";

          return (
            <div key={section.title} className="mb-0.5">
              {!collapsed && isCollapsible ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider select-none transition-colors",
                    hasActive
                      ? "text-blue-400"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      !isExpanded && "-rotate-90"
                    )}
                  />
                  <span className="truncate">{section.titleKey ? t(section.titleKey) : section.title}</span>
                  {section.hub && (
                    <span className="ml-auto text-[9px] font-normal text-slate-600 tracking-normal normal-case">
                      Hub
                    </span>
                  )}
                </button>
              ) : !collapsed ? (
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                  {section.titleKey ? t(section.titleKey) : section.title}
                </p>
              ) : (
                <div className="my-1 mx-3 border-t border-slate-800" />
              )}

              {(collapsed || !isCollapsible || isExpanded) && (
                <ul>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? (item.labelKey ? t(item.labelKey) : item.label) : undefined}
                          className={cn(
                            "group flex items-center gap-3 mx-2 rounded-md text-sm font-medium transition-all duration-150",
                            collapsed ? "justify-center px-0 py-2.5" : "px-3 py-1.5",
                            active
                              ? "bg-blue-600 text-white shadow-sm shadow-blue-900/40"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                          )}
                        >
                          <Icon
                            className={cn(
                              "shrink-0 transition-colors",
                              collapsed ? "h-5 w-5" : "h-4 w-4",
                              active
                                ? "text-white"
                                : "text-slate-400 group-hover:text-slate-200"
                            )}
                          />
                          {!collapsed && (
                            <span className="truncate">{item.labelKey ? t(item.labelKey) : item.label}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="shrink-0 border-t border-slate-800 p-2">
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors",
              collapsed && "justify-center px-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
