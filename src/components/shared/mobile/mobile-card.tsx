"use client";

import { type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface MobileCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  onClick?: () => void;
  rightContent?: ReactNode;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MobileCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  onClick,
  rightContent,
  className,
}: MobileCardProps) {
  const isClickable = !!onClick;

  const Wrapper = isClickable ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full min-h-[44px] px-4 py-3",
        "bg-card border border-border rounded-lg",
        "text-left",
        isClickable && [
          "cursor-pointer",
          "active:scale-[0.98] active:bg-muted/50",
          "transition-all duration-100 ease-out",
        ],
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {title}
          </p>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right content or chevron */}
      {rightContent ? (
        <div className="shrink-0">{rightContent}</div>
      ) : isClickable ? (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      ) : null}
    </Wrapper>
  );
}
