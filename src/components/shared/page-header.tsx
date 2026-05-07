"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Slot for action buttons — rendered right-aligned */
  actions?: ReactNode;
  /** @deprecated Use actions prop instead */
  children?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: PageHeaderProps) {
  const actionSlot = actions ?? children;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6",
        className
      )}
    >
      {/* Left: title + description */}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
          {icon}
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {/* Right: action slot */}
      {actionSlot && (
        <div className="flex shrink-0 items-center gap-2 flex-wrap">
          {actionSlot}
        </div>
      )}
    </div>
  );
}
