"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface BulkConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called with the optional reason text when confirmed */
  onConfirm: (reason?: string) => void;
  /** Called when the dialog is cancelled / closed */
  onCancel: () => void;
  /** Dialog title */
  title: string;
  /** Descriptive text shown below the title */
  description: string;
  /** Number of items affected */
  count: number;
  /** When true, shows a textarea for the user to enter a reason */
  requireReason?: boolean;
  /** Visual variant -- destructive shows a red confirm button */
  variant?: "default" | "destructive";
}

export function BulkConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  count,
  requireReason = false,
  variant = "default",
}: BulkConfirmDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(requireReason ? reason : undefined);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  const isConfirmDisabled = requireReason && reason.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground">
            This action will affect{" "}
            <span className="font-semibold text-foreground">{count}</span>{" "}
            {count === 1 ? "item" : "items"}.
          </p>
        </div>

        {requireReason && (
          <div className="space-y-2">
            <label htmlFor="bulk-reason" className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="bulk-reason"
              placeholder="Enter a reason for this action..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
