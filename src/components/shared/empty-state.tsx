"use client";

import { type LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Lucide icon to display. Defaults to Inbox. */
  icon?: LucideIcon;
  /** Main heading */
  title: string;
  /** Explanatory sub-text */
  description?: string;
  /** Optional action element — typically a Button */
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
        className
      )}
    >
      {/* Icon container */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
