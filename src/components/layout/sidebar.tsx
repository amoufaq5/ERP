"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  ShoppingCart,
  Package,
  FolderKanban,
  Users,
  Monitor,
  Factory,
  UserPlus,
  TrendingUp,
  Building2,
  Contact,
  Megaphone,
  Ticket,
  MapPin,
  Heart,
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
  Building,
  X,
  ShieldCheck,
  Scale,
  ClipboardList,
  CheckSquare,
  Truck,
  Wrench,
  Globe,
  Puzzle,
  Link2,
  Table2,
  Upload,
  MessageSquare,
  Database,
  Target,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
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
    title: "ERP",
    items: [
      { label: "Finance", href: "/erp/finance", icon: DollarSign },
      { label: "Procurement", href: "/erp/procurement", icon: ShoppingCart },
      { label: "Inventory", href: "/erp/inventory", icon: Package },
      { label: "Projects", href: "/erp/projects", icon: FolderKanban },
      { label: "HR & Payroll", href: "/erp/hr", icon: Users },
      { label: "Assets", href: "/erp/assets", icon: Monitor },
      { label: "Manufacturing", href: "/erp/manufacturing", icon: Factory },
    ],
  },
  {
    title: "CRM",
    items: [
      { label: "Leads", href: "/crm/leads", icon: UserPlus },
      { label: "Opportunities", href: "/crm/opportunities", icon: TrendingUp },
      { label: "Accounts", href: "/crm/accounts", icon: Building2 },
      { label: "Contacts", href: "/crm/contacts", icon: Contact },
      { label: "Campaigns", href: "/crm/campaigns", icon: Megaphone },
      { label: "Tickets", href: "/crm/tickets", icon: Ticket },
      { label: "GPS Tracking", href: "/crm/gps-tracking", icon: MapPin },
      { label: "Loyalty", href: "/crm/loyalty", icon: Heart },
    ],
  },
  {
    title: "ATS",
    items: [
      { label: "Jobs", href: "/ats/jobs", icon: Briefcase },
      { label: "Candidates", href: "/ats/candidates", icon: UserSearch },
      { label: "Interviews", href: "/ats/interviews", icon: CalendarCheck },
      { label: "Onboarding", href: "/ats/onboarding", icon: Rocket },
      { label: "Training", href: "/ats/training", icon: GraduationCap },
    ],
  },
  {
    title: "Supply Chain",
    items: [
      { label: "Supply Chain", href: "/supply-chain", icon: Truck },
      { label: "QA / QC", href: "/qaqc", icon: CheckSquare },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Safety", href: "/safety", icon: ShieldCheck },
      { label: "Compliance", href: "/compliance", icon: Scale },
      { label: "Facility", href: "/facility", icon: Wrench },
      { label: "Planning", href: "/planning", icon: Target },
      { label: "Industry", href: "/industry", icon: Factory },
    ],
  },
  {
    title: "System",
    items: [
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

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

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
  onMobileClose?: () => void;
  isMobile?: boolean;
}

function SidebarContent({
  collapsed,
  onCollapsedChange,
  isActive,
  onMobileClose,
  isMobile,
}: SidebarContentProps) {
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
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-1">
            {!collapsed && (
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                {section.title}
              </p>
            )}
            {collapsed && (
              <div className="my-1 mx-3 border-t border-slate-800" />
            )}

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
                        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
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
          </div>
        ))}
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
