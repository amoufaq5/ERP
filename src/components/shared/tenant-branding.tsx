"use client";

import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant/tenant-context";

interface TenantBrandingProps {
  /** Show the tenant name alongside the logo */
  showName?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function TenantBranding({
  showName = true,
  size = "md",
  className,
}: TenantBrandingProps) {
  const { tenant } = useTenant();

  // Apply tenant primary color as a CSS custom property on mount/change
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (tenant?.primaryColor) {
      root.style.setProperty("--tenant-primary", tenant.primaryColor);
    }
    return () => {
      root.style.removeProperty("--tenant-primary");
    };
  }, [tenant?.primaryColor]);

  const sizeConfig = {
    sm: { icon: "h-7 w-7", text: "text-sm", iconInner: "h-4 w-4" },
    md: { icon: "h-9 w-9", text: "text-base", iconInner: "h-5 w-5" },
    lg: { icon: "h-12 w-12", text: "text-lg", iconInner: "h-6 w-6" },
  }[size];

  if (!tenant) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            sizeConfig.icon,
            "flex items-center justify-center rounded-lg bg-muted text-muted-foreground"
          )}
        >
          <Building2 className={sizeConfig.iconInner} />
        </div>
        {showName && (
          <span
            className={cn(sizeConfig.text, "font-semibold text-foreground")}
          >
            Pharma ERP
          </span>
        )}
      </div>
    );
  }

  const initial = tenant.name.charAt(0).toUpperCase();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {tenant.logo ? (
        <img
          src={tenant.logo}
          alt={tenant.name}
          className={cn(sizeConfig.icon, "rounded-lg object-cover")}
        />
      ) : (
        <div
          className={cn(
            sizeConfig.icon,
            "flex items-center justify-center rounded-lg font-bold text-white shrink-0",
            size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm"
          )}
          style={{ backgroundColor: tenant.primaryColor ?? "#6366f1" }}
        >
          {initial}
        </div>
      )}
      {showName && (
        <span className={cn(sizeConfig.text, "font-semibold text-foreground truncate")}>
          {tenant.name}
        </span>
      )}
    </div>
  );
}
