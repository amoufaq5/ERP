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
  Monitor,
  Factory,
  UserCheck,
  Crown,
  Stethoscope,
  MapPin,
  Banknote,
  RotateCcw,
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
  LifeBuoy,
  Heart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  icon?: LucideIcon;
  hub?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Messages", href: "/messages", icon: MessageSquare },
      { label: "Tasks", href: "/tasks", icon: ClipboardList },
    ],
  },
  {
    title: "Finance & Accounting",
    icon: DollarSign,
    hub: "/hubs/finance",
    items: [
      { label: "Hub Overview", href: "/hubs/finance", icon: LayoutDashboard },
      { label: "Finance", href: "/erp/finance", icon: DollarSign },
      { label: "Accounting", href: "/erp/accounting", icon: Calculator },
      { label: "Collections", href: "/erp/collections", icon: Banknote },
      { label: "Returns", href: "/erp/returns", icon: RotateCcw },
      { label: "Partner Ledger", href: "/erp/partner-ledger", icon: Scale },
    ],
  },
  {
    title: "HR & Talent",
    icon: Users,
    hub: "/hubs/hr",
    items: [
      { label: "Hub Overview", href: "/hubs/hr", icon: LayoutDashboard },
      { label: "HR & Payroll", href: "/erp/hr", icon: Users },
      { label: "Jobs", href: "/ats/jobs", icon: Briefcase },
      { label: "Candidates", href: "/ats/candidates", icon: UserSearch },
      { label: "Interviews", href: "/ats/interviews", icon: CalendarCheck },
      { label: "Onboarding", href: "/ats/onboarding", icon: Rocket },
      { label: "Training", href: "/ats/training", icon: GraduationCap },
    ],
  },
  {
    title: "Supply Chain",
    icon: Truck,
    hub: "/hubs/supply-chain",
    items: [
      { label: "Hub Overview", href: "/hubs/supply-chain", icon: LayoutDashboard },
      { label: "Supply Chain", href: "/supply-chain", icon: Truck },
      { label: "Procurement", href: "/erp/procurement", icon: ShoppingCart },
      { label: "Inventory", href: "/erp/inventory", icon: Package },
    ],
  },
  {
    title: "CRM Sales",
    icon: TrendingUp,
    hub: "/hubs/crm",
    items: [
      { label: "Hub Overview", href: "/hubs/crm", icon: LayoutDashboard },
      { label: "Accounts", href: "/crm/accounts", icon: Building2 },
      { label: "Contacts", href: "/crm/contacts", icon: Contact },
      { label: "Leads", href: "/crm/leads", icon: Sparkles },
      { label: "Opportunities", href: "/crm/opportunities", icon: TrendingUp },
      { label: "Campaigns", href: "/crm/campaigns", icon: Megaphone },
      { label: "Tickets", href: "/crm/tickets", icon: LifeBuoy },
      { label: "Loyalty", href: "/crm/loyalty", icon: Heart },
    ],
  },
  {
    title: "Field Operations",
    icon: MapPin,
    items: [
      { label: "Business Units", href: "/crm/business-units", icon: Building },
      { label: "Medical Reps", href: "/crm/medical-rep", icon: UserCheck },
      { label: "District Manager", href: "/crm/district-manager", icon: Users },
      { label: "Marketeer", href: "/crm/marketeer", icon: Target },
      { label: "BUM Dashboard", href: "/crm/bum", icon: Crown },
      { label: "Doctor Directory", href: "/crm/doctors", icon: Stethoscope },
      { label: "Visit Tracking", href: "/crm/gps-tracking", icon: MapPin },
      { label: "Market Requests", href: "/crm/market-requests", icon: ClipboardList },
      { label: "CRM Reports", href: "/crm/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Quality & Compliance",
    icon: ShieldCheck,
    hub: "/hubs/quality",
    items: [
      { label: "Hub Overview", href: "/hubs/quality", icon: LayoutDashboard },
      { label: "QA / QC", href: "/qaqc", icon: CheckSquare },
      { label: "Safety", href: "/safety", icon: ShieldCheck },
      { label: "Compliance", href: "/compliance", icon: Scale },
    ],
  },
  {
    title: "Operations",
    icon: Factory,
    items: [
      { label: "Projects", href: "/erp/projects", icon: FolderKanban },
      { label: "Assets", href: "/erp/assets", icon: Monitor },
      { label: "Manufacturing", href: "/erp/manufacturing", icon: Factory },
      { label: "Facility", href: "/facility", icon: Wrench },
      { label: "Planning", href: "/planning", icon: Target },
      { label: "Industry", href: "/industry", icon: Factory },
    ],
  },
  {
    title: "Tools & Admin",
    icon: Settings,
    hub: "/hubs/tools",
    items: [
      { label: "Hub Overview", href: "/hubs/tools", icon: LayoutDashboard },
      { label: "Spreadsheet", href: "/spreadsheet", icon: Table2 },
      { label: "Data Upload", href: "/data-upload", icon: Upload },
      { label: "Data Migration", href: "/data-migration", icon: Database },
      { label: "Integration", href: "/integration", icon: Link2 },
      { label: "Ecosystem", href: "/ecosystem", icon: Puzzle },
      { label: "Automation", href: "/automation", icon: Zap },
      { label: "AI Hub", href: "/ai", icon: Brain },
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

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
  const { canAccess } = useCurrentUser();

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function sectionHasActive(section: NavSection): boolean {
    return section.items.some((item) => isActive(item.href));
  }

  const visibleSections: NavSection[] = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-slate-900 text-white shrink-0 sidebar-transition overflow-hidden border-r border-slate-800",
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
          "fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-slate-900 text-white lg:hidden transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach((s) => {
      if (sectionHasActive(s)) initial.add(s.title);
    });
    if (initial.size === 0) initial.add("Main");
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
            className="ml-auto p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                  <span className="truncate">{section.title}</span>
                  {section.hub && (
                    <span className="ml-auto text-[9px] font-normal text-slate-600 tracking-normal normal-case">
                      Hub
                    </span>
                  )}
                </button>
              ) : !collapsed ? (
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                  {section.title}
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
                          title={collapsed ? item.label : undefined}
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
                            <span className="truncate">{item.label}</span>
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
