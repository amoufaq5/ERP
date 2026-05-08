"use client";

import { useState } from "react";
import { Building2, ChevronDown, Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant/tenant-context";
import type { Tenant } from "@/lib/tenant/tenant-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TenantSwitcherProps {
  /** Only show the switcher when user has this role. Defaults to ADMIN. */
  requiredRole?: string;
  /** Current user role — if not ADMIN the component renders nothing */
  userRole?: string;
  className?: string;
}

export default function TenantSwitcher({
  requiredRole = "ADMIN",
  userRole = "ADMIN",
  className,
}: TenantSwitcherProps) {
  const { tenant, tenants, switchTenant } = useTenant();
  const [open, setOpen] = useState(false);

  // Only visible to users with the required role
  if (userRole !== requiredRole) return null;

  const activeTenants = tenants.filter((t) => t.isActive);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "w-full justify-between",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <TenantIcon tenant={tenant} size="sm" />
          <span className="truncate">{tenant?.name ?? "Select Tenant"}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch Organization
        </DropdownMenuLabel>

        {activeTenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => {
              switchTenant(t.slug);
              setOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <TenantIcon tenant={t} size="sm" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-sm font-medium">{t.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {t.slug} &middot; {t.plan}
              </span>
            </div>
            {tenant?.id === t.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href="/admin/tenants"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Tenants</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Small Tenant Icon ──────────────────────────────────────────────

function TenantIcon({
  tenant,
  size = "sm",
}: {
  tenant: Tenant | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";

  if (!tenant) {
    return (
      <div
        className={cn(
          dim,
          "flex items-center justify-center rounded-md bg-muted text-muted-foreground"
        )}
      >
        <Building2 className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </div>
    );
  }

  if (tenant.logo) {
    return (
      <img
        src={tenant.logo}
        alt={tenant.name}
        className={cn(dim, "rounded-md object-cover")}
      />
    );
  }

  const initial = tenant.name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        dim,
        "flex items-center justify-center rounded-md font-bold text-white shrink-0"
      )}
      style={{ backgroundColor: tenant.primaryColor ?? "#6366f1" }}
    >
      {initial}
    </div>
  );
}
