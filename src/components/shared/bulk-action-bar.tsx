"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkConfirmDialog } from "@/components/shared/bulk-confirm-dialog";
import { cn } from "@/lib/utils";

export interface BulkAction {
  /** Visible label for the action button */
  label: string;
  /** Optional Lucide icon component */
  icon?: LucideIcon;
  /** Handler called when action is confirmed (or clicked, if no confirmation needed) */
  onClick: (reason?: string) => void;
  /** Button variant */
  variant?: "default" | "destructive";
  /** Whether the button is disabled */
  disabled?: boolean;
  /** When true, shows a confirmation dialog before executing */
  requireConfirm?: boolean;
  /** When true, the confirmation dialog includes a reason textarea */
  requireReason?: boolean;
  /** Custom confirmation title (defaults to `Confirm ${label}`) */
  confirmTitle?: string;
  /** Custom confirmation description */
  confirmDescription?: string;
}

export interface BulkActionBarProps {
  /** Number of currently selected items */
  selectedCount: number;
  /** List of actions to display */
  actions: BulkAction[];
  /** Called when the user clicks "Clear Selection" */
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClear,
}: BulkActionBarProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  if (selectedCount === 0) return null;

  const handleActionClick = (action: BulkAction) => {
    if (action.requireConfirm) {
      setConfirmAction(action);
    } else {
      action.onClick();
    }
  };

  const handleConfirm = (reason?: string) => {
    confirmAction?.onClick(reason);
    setConfirmAction(null);
  };

  const handleCancel = () => {
    setConfirmAction(null);
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          "shadow-[0_-4px_16px_rgba(0,0,0,0.1)]",
          "animate-in slide-in-from-bottom duration-300 ease-out"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              <span className="font-semibold">{selectedCount}</span>{" "}
              {selectedCount === 1 ? "item" : "items"} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 gap-1 text-xs text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear Selection
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant={action.variant ?? "default"}
                  size="sm"
                  disabled={action.disabled}
                  onClick={() => handleActionClick(action)}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <BulkConfirmDialog
        open={confirmAction !== null}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title={confirmAction?.confirmTitle ?? `Confirm ${confirmAction?.label ?? "Action"}`}
        description={
          confirmAction?.confirmDescription ??
          `Are you sure you want to ${(confirmAction?.label ?? "perform this action").toLowerCase()} for the selected items?`
        }
        count={selectedCount}
        requireReason={confirmAction?.requireReason}
        variant={confirmAction?.variant ?? "default"}
      />
    </>
  );
}
