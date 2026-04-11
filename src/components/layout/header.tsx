"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Home,
  Users,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useCurrentUser, ROLE_LABEL, type UserRole } from "@/lib/user-context";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  erp: "ERP",
  finance: "Finance",
  accounting: "Accounting",
  procurement: "Procurement",
  inventory: "Inventory",
  projects: "Projects",
  hr: "HR & Payroll",
  assets: "Assets",
  manufacturing: "Manufacturing",
  collections: "Collections",
  returns: "Returns",
  crm: "CRM",
  leads: "Leads",
  opportunities: "Opportunities",
  accounts: "Accounts",
  contacts: "Contacts",
  campaigns: "Campaigns",
  tickets: "Tickets",
  "gps-tracking": "GPS Tracking",
  "medical-rep": "Medical Reps",
  "district-manager": "District Manager",
  marketeer: "Marketeer",
  bum: "BUM Dashboard",
  doctors: "Doctors",
  "market-requests": "Market Requests",
  reports: "Reports",
  loyalty: "Loyalty",
  ats: "ATS",
  jobs: "Jobs",
  candidates: "Candidates",
  interviews: "Interviews",
  onboarding: "Onboarding",
  training: "Training",
  automation: "Automation",
  ai: "AI Hub",
  documents: "Documents",
  settings: "Settings",
  industry: "Industry",
};

function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbSegment[] = [
    { label: "Home", href: "/dashboard" },
  ];

  let accumulated = "";
  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: accumulated });
  }

  return crumbs;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "bg-red-100 text-red-700";
    case "BUM":
      return "bg-purple-100 text-purple-700";
    case "MARKETEER":
      return "bg-pink-100 text-pink-700";
    case "DISTRICT_MANAGER":
      return "bg-blue-100 text-blue-700";
    case "MEDICAL_REP":
      return "bg-cyan-100 text-cyan-700";
    case "ACCOUNTANT":
      return "bg-emerald-100 text-emerald-700";
    case "WAREHOUSE":
      return "bg-amber-100 text-amber-700";
    case "HR":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, allUsers } = useCurrentUser();
  const [searchValue, setSearchValue] = useState("");
  const [notificationCount] = useState(3);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem("pharma.currentUser");
      localStorage.removeItem("token");
    } catch {
      // ignore
    }
    router.push("/login");
  }, [router]);

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="flex items-center h-16 shrink-0 bg-white border-b border-border px-4 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 flex-1 min-w-0">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <span key={crumb.href} className="flex items-center gap-1 min-w-0">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              {isLast ? (
                <span className="text-sm font-semibold text-foreground truncate">
                  {crumb.label}
                </span>
              ) : (
                <button
                  onClick={() => router.push(crumb.href)}
                  className={cn(
                    "flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors truncate",
                    isFirst && "shrink-0"
                  )}
                >
                  {isFirst && <Home className="h-3.5 w-3.5 shrink-0" />}
                  {!isFirst && crumb.label}
                </button>
              )}
            </span>
          );
        })}
      </nav>

      {/* Spacer on mobile */}
      <div className="flex-1 sm:hidden" />

      {/* Right side controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-56 pl-9 pr-4 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
          />
        </div>

        {/* Role switcher (demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="hidden md:flex items-center gap-1.5 h-9 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-input"
              aria-label="Switch user role"
              title="Switch demo user / role"
            >
              <Users className="h-3.5 w-3.5" />
              Switch Role
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Demo: switch logged-in user
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allUsers.map((u) => {
              const active = u.id === user.id;
              return (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => setUser(u)}
                  className="cursor-pointer flex items-start gap-2 py-2"
                >
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="bg-blue-600 text-white text-[10px] font-semibold">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {ROLE_LABEL[u.role]}
                      {u.territory ? ` · ${u.territory}` : ""}
                    </p>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-blue-600 mt-1.5" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={`${notificationCount} notifications`}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[140px]">
                  {user.name}
                </p>
                <span
                  className={cn(
                    "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded leading-tight",
                    getRoleBadgeColor(user.role)
                  )}
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  {user.department}
                  {user.territory ? ` · ${user.territory}` : ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => router.push("/settings/profile")}
              className="cursor-pointer gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
