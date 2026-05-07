import {
  CheckCircle,
  XCircle,
  Download,
  UserCog,
  Tag,
  Building2,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import type { BulkAction } from "@/components/shared/bulk-action-bar";

// ─── Doctor Bulk Actions ────────────────────────────────────────────────────

export interface DoctorBulkActionHandlers {
  onReassignRep?: (ids: string[]) => void;
  onChangeClassification?: (ids: string[]) => void;
  onChangeBU?: (ids: string[]) => void;
  onExport?: (ids: string[]) => void;
}

/**
 * Pre-built bulk actions for the Doctors list.
 */
export function doctorBulkActions(
  selectedIds: string[],
  handlers: DoctorBulkActionHandlers
): BulkAction[] {
  return [
    {
      label: "Reassign to Rep",
      icon: UserCog,
      onClick: () => handlers.onReassignRep?.(selectedIds),
      disabled: !handlers.onReassignRep,
    },
    {
      label: "Change Classification",
      icon: Tag,
      onClick: () => handlers.onChangeClassification?.(selectedIds),
      disabled: !handlers.onChangeClassification,
    },
    {
      label: "Change BU Assignment",
      icon: Building2,
      onClick: () => handlers.onChangeBU?.(selectedIds),
      disabled: !handlers.onChangeBU,
    },
    {
      label: "Export Selected",
      icon: Download,
      onClick: () => handlers.onExport?.(selectedIds),
      disabled: !handlers.onExport,
    },
  ];
}

// ─── Visit Bulk Actions ─────────────────────────────────────────────────────

export interface VisitBulkActionHandlers {
  onApproveAll?: (ids: string[]) => void;
  onRejectAll?: (ids: string[], reason?: string) => void;
  onExport?: (ids: string[]) => void;
}

/**
 * Pre-built bulk actions for the Visits list.
 */
export function visitBulkActions(
  selectedIds: string[],
  handlers: VisitBulkActionHandlers
): BulkAction[] {
  return [
    {
      label: "Approve All",
      icon: CheckCircle,
      onClick: () => handlers.onApproveAll?.(selectedIds),
      requireConfirm: true,
      confirmTitle: "Approve Visits",
      confirmDescription: "Are you sure you want to approve the selected visits?",
      disabled: !handlers.onApproveAll,
    },
    {
      label: "Reject All",
      icon: XCircle,
      variant: "destructive",
      onClick: (reason?: string) => handlers.onRejectAll?.(selectedIds, reason),
      requireConfirm: true,
      requireReason: true,
      confirmTitle: "Reject Visits",
      confirmDescription: "Are you sure you want to reject the selected visits? Please provide a reason.",
      disabled: !handlers.onRejectAll,
    },
    {
      label: "Export Selected",
      icon: Download,
      onClick: () => handlers.onExport?.(selectedIds),
      disabled: !handlers.onExport,
    },
  ];
}

// ─── Market Request Bulk Actions ────────────────────────────────────────────

export interface MarketRequestBulkActionHandlers {
  onApprove?: (ids: string[]) => void;
  onReject?: (ids: string[], reason?: string) => void;
  onChangePriority?: (ids: string[]) => void;
  onExport?: (ids: string[]) => void;
}

/**
 * Pre-built bulk actions for the Market Requests list.
 */
export function marketRequestBulkActions(
  selectedIds: string[],
  handlers: MarketRequestBulkActionHandlers
): BulkAction[] {
  return [
    {
      label: "Approve Selected",
      icon: CheckCircle,
      onClick: () => handlers.onApprove?.(selectedIds),
      requireConfirm: true,
      confirmTitle: "Approve Market Requests",
      confirmDescription: "Are you sure you want to approve the selected market requests?",
      disabled: !handlers.onApprove,
    },
    {
      label: "Reject Selected",
      icon: XCircle,
      variant: "destructive",
      onClick: (reason?: string) => handlers.onReject?.(selectedIds, reason),
      requireConfirm: true,
      requireReason: true,
      confirmTitle: "Reject Market Requests",
      confirmDescription: "Are you sure you want to reject the selected market requests? Please provide a reason.",
      disabled: !handlers.onReject,
    },
    {
      label: "Change Priority",
      icon: ArrowUpDown,
      onClick: () => handlers.onChangePriority?.(selectedIds),
      disabled: !handlers.onChangePriority,
    },
    {
      label: "Export Selected",
      icon: Download,
      onClick: () => handlers.onExport?.(selectedIds),
      disabled: !handlers.onExport,
    },
  ];
}

// ─── Expense Bulk Actions ───────────────────────────────────────────────────

export interface ExpenseBulkActionHandlers {
  onApprove?: (ids: string[]) => void;
  onReject?: (ids: string[], reason?: string) => void;
  onExport?: (ids: string[]) => void;
}

/**
 * Pre-built bulk actions for the Expenses list.
 */
export function expenseBulkActions(
  selectedIds: string[],
  handlers: ExpenseBulkActionHandlers
): BulkAction[] {
  return [
    {
      label: "Approve Selected",
      icon: CheckCircle,
      onClick: () => handlers.onApprove?.(selectedIds),
      requireConfirm: true,
      confirmTitle: "Approve Expenses",
      confirmDescription: "Are you sure you want to approve the selected expenses?",
      disabled: !handlers.onApprove,
    },
    {
      label: "Reject Selected",
      icon: XCircle,
      variant: "destructive",
      onClick: (reason?: string) => handlers.onReject?.(selectedIds, reason),
      requireConfirm: true,
      requireReason: true,
      confirmTitle: "Reject Expenses",
      confirmDescription: "Are you sure you want to reject the selected expenses? Please provide a reason.",
      disabled: !handlers.onReject,
    },
    {
      label: "Export Selected",
      icon: Download,
      onClick: () => handlers.onExport?.(selectedIds),
      disabled: !handlers.onExport,
    },
  ];
}

// ─── Weekly Plan Bulk Actions ───────────────────────────────────────────────

export interface WeeklyPlanBulkActionHandlers {
  onApprove?: (ids: string[]) => void;
  onReject?: (ids: string[], reason?: string) => void;
  onExport?: (ids: string[]) => void;
}

/**
 * Pre-built bulk actions for the Weekly Plans list.
 */
export function weeklyPlanBulkActions(
  selectedIds: string[],
  handlers: WeeklyPlanBulkActionHandlers
): BulkAction[] {
  return [
    {
      label: "Approve Selected",
      icon: CheckCircle,
      onClick: () => handlers.onApprove?.(selectedIds),
      requireConfirm: true,
      confirmTitle: "Approve Weekly Plans",
      confirmDescription: "Are you sure you want to approve the selected weekly plans?",
      disabled: !handlers.onApprove,
    },
    {
      label: "Reject Selected",
      icon: AlertTriangle,
      variant: "destructive",
      onClick: (reason?: string) => handlers.onReject?.(selectedIds, reason),
      requireConfirm: true,
      requireReason: true,
      confirmTitle: "Reject Weekly Plans",
      confirmDescription: "Are you sure you want to reject the selected weekly plans? Please provide a reason.",
      disabled: !handlers.onReject,
    },
    {
      label: "Export Selected",
      icon: Download,
      onClick: () => handlers.onExport?.(selectedIds),
      disabled: !handlers.onExport,
    },
  ];
}
