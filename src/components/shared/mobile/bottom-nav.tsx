"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  MessageSquare,
  Menu,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/user-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ── Nav item definitions for the bottom bar ──────────────────────────────────

interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: BottomNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Doctors", href: "/crm/doctors", icon: Stethoscope },
  { label: "Plans", href: "/crm/weekly-plan", icon: Calendar },
  { label: "Messages", href: "/messages", icon: MessageSquare },
];

// ── Sidebar sections imported inline (mirrors sidebar.tsx structure) ─────────

interface MoreNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MoreNavSection {
  title: string;
  items: MoreNavItem[];
}

// We lazily import these from the same icons sidebar uses
import {
  DollarSign,
  ShoppingCart,
  Package,
  FolderKanban,
  Users,
  Factory,
  UserCheck,
  Crown,
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
  Building,
  Building2,
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
  Database,
  Target,
  Calculator,
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
  Contact,
} from "lucide-react";

const MORE_SECTIONS: MoreNavSection[] = [
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
    items: [
      { label: "Finance & Banking", href: "/erp/finance", icon: DollarSign },
      { label: "Accounting", href: "/erp/accounting", icon: Calculator },
      { label: "Collections", href: "/erp/collections", icon: Banknote },
      { label: "Partner Ledger", href: "/erp/partner-detail", icon: Scale },
    ],
  },
  {
    title: "HR & Talent",
    items: [
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
    items: [
      { label: "Supply Chain", href: "/supply-chain", icon: Truck },
      { label: "Procurement", href: "/erp/procurement", icon: ShoppingCart },
      { label: "Sales Orders", href: "/erp/sales-order", icon: ShoppingBag },
      { label: "Inventory", href: "/erp/inventory", icon: Package },
      { label: "Products", href: "/erp/products", icon: Pill },
    ],
  },
  {
    title: "CRM Sales",
    items: [
      { label: "Accounts", href: "/crm/accounts", icon: Building2 },
      { label: "Sales Pipeline", href: "/crm/leads", icon: Sparkles },
      { label: "Marketing Hub", href: "/crm/campaigns", icon: Megaphone },
    ],
  },
  {
    title: "Field Operations",
    items: [
      { label: "Business Units", href: "/crm/business-units", icon: Building },
      { label: "My Team", href: "/crm/my-team", icon: Users },
      { label: "Medical Reps", href: "/crm/medical-rep", icon: UserCheck },
      { label: "District Manager", href: "/crm/district-manager", icon: Users },
      { label: "Marketeer", href: "/crm/marketeer", icon: Target },
      { label: "BUM Dashboard", href: "/crm/bum", icon: Crown },
      { label: "Territories (IMS)", href: "/crm/territories", icon: Globe },
      { label: "Weekly Plans", href: "/crm/weekly-plan", icon: CalendarCheck },
      { label: "Doctor Directory", href: "/crm/doctors", icon: Stethoscope },
      { label: "Visit Tracking", href: "/crm/gps-tracking", icon: MapPin },
      { label: "Market Requests", href: "/crm/market-requests", icon: ClipboardList },
      { label: "KPIs", href: "/crm/kpis", icon: Target },
      { label: "Call Analysis", href: "/crm/call-analysis", icon: BarChart3 },
      { label: "Expenses", href: "/crm/expenses", icon: Banknote },
      { label: "CRM Reports", href: "/crm/reports", icon: BarChart3 },
      { label: "Product Guide", href: "/crm/product-guide", icon: BookOpen },
    ],
  },
  {
    title: "Quality & Compliance",
    items: [
      { label: "QA / QC", href: "/qaqc", icon: CheckSquare },
      { label: "Safety", href: "/safety", icon: ShieldCheck },
      { label: "Compliance", href: "/compliance", icon: Scale },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Projects", href: "/erp/projects", icon: FolderKanban },
      { label: "Manufacturing", href: "/erp/manufacturing", icon: Factory },
      { label: "Facility", href: "/facility", icon: Wrench },
      { label: "Planning", href: "/planning", icon: Target },
      { label: "Industry", href: "/industry", icon: Factory },
    ],
  },
  {
    title: "Tools & Admin",
    items: [
      { label: "Spreadsheet", href: "/spreadsheet", icon: Table2 },
      { label: "Data Upload", href: "/data-upload", icon: Upload },
      { label: "Data Migration", href: "/data-migration", icon: Database },
      { label: "Integrations", href: "/integration", icon: Link2 },
      { label: "Workflows", href: "/erp/workflows", icon: GitBranch },
      { label: "Ecosystem", href: "/ecosystem", icon: Puzzle },
      { label: "Automation", href: "/automation", icon: Zap },
      { label: "AI Hub", href: "/ai", icon: Brain },
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Analytics", href: "/analytics", icon: PieChart },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "User Management", href: "/admin/users", icon: Users },
      { label: "Audit Log", href: "/admin/audit-log", icon: ShieldCheck },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function BottomNav() {
  const pathname = usePathname();
  const { canAccess } = useCurrentUser();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Filter "More" sections to only show items the user can access
  const visibleMoreSections = MORE_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Bottom navigation bar — mobile only, hidden on print */}
      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-40 md:hidden print:hidden",
          "border-t border-border/50",
          "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            if (!canAccess(item.href)) return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-w-0",
                  "transition-colors duration-150",
                  active
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {active && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-teal-500" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-tight truncate max-w-full">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-w-0",
              "transition-colors duration-150",
              moreOpen
                ? "text-teal-600 dark:text-teal-400"
                : "text-muted-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet — slides up from bottom */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="pb-2">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Browse all available sections</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-8">
            {visibleMoreSections.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {section.title}
                </p>
                <div className="grid grid-cols-1 gap-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
