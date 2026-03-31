"use client";

import { useEffect, useState, useCallback } from "react";
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

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BreadcrumbSegment {
  label: string;
  href: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  erp: "ERP",
  finance: "Finance",
  procurement: "Procurement",
  inventory: "Inventory",
  projects: "Projects",
  hr: "HR & Payroll",
  assets: "Assets",
  manufacturing: "Manufacturing",
  crm: "CRM",
  leads: "Leads",
  opportunities: "Opportunities",
  accounts: "Accounts",
  contacts: "Contacts",
  campaigns: "Campaigns",
  tickets: "Tickets",
  "gps-tracking": "GPS Tracking",
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
  reports: "Reports",
  settings: "Settings",
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

function getRoleBadgeColor(role: string): string {
  switch (role.toLowerCase()) {
    case "admin":
      return "bg-red-100 text-red-700";
    case "manager":
      return "bg-blue-100 text-blue-700";
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
  const [user, setUser] = useState<StoredUser | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [notificationCount] = useState(3);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored) as StoredUser);
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
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
                  {user ? getInitials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[120px]">
                  {user?.name ?? "Guest"}
                </p>
                {user?.role && (
                  <span
                    className={cn(
                      "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize leading-tight",
                      getRoleBadgeColor(user.role)
                    )}
                  >
                    {user.role}
                  </span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {user?.name ?? "Guest"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email ?? ""}
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
