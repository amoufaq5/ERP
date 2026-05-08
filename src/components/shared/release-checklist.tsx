"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Circle,
  MinusCircle,
  AlertTriangle,
  ShieldCheck,
  PenLine,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";
import type {
  ChecklistItem,
  ChecklistCategory,
  ChecklistItemStatus,
} from "@/lib/quality/batch-release-types";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  ChecklistCategory,
  { label: string; color: string; bgColor: string }
> = {
  manufacturing: {
    label: "Manufacturing",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  qc: {
    label: "Quality Control",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
  regulatory: {
    label: "Regulatory",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  documentation: {
    label: "Documentation",
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
};

const STATUS_ICON: Record<ChecklistItemStatus, typeof CheckCircle2> = {
  passed: CheckCircle2,
  failed: XCircle,
  pending: Circle,
  na: MinusCircle,
};

const STATUS_COLOR: Record<ChecklistItemStatus, string> = {
  passed: "text-green-600",
  failed: "text-red-600",
  pending: "text-gray-400",
  na: "text-gray-400",
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ReleaseChecklistProps {
  items: ChecklistItem[];
  readOnly?: boolean;
  onItemUpdate?: (
    itemId: string,
    status: "passed" | "failed" | "na",
    reviewer: string,
    comments?: string
  ) => void;
  onQPSignOff?: (qpName: string, signature: string) => void;
  showSignOff?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReleaseChecklistComponent({
  items,
  readOnly = false,
  onItemUpdate,
  onQPSignOff,
  showSignOff = false,
  className,
}: ReleaseChecklistProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [comments, setComments] = useState("");
  const [signName, setSignName] = useState("");
  const [signSignature, setSignSignature] = useState("");

  // Group items by category
  const grouped = (
    ["manufacturing", "qc", "regulatory", "documentation"] as ChecklistCategory[]
  ).map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  }));

  // Overall progress
  const totalItems = items.length;
  const completedItems = items.filter(
    (i) => i.status === "passed" || i.status === "na"
  ).length;
  const failedItems = items.filter((i) => i.status === "failed").length;
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Blocker check: any required item that failed
  const blockers = items.filter((i) => i.required && i.status === "failed");

  function handleStatusChange(
    itemId: string,
    status: "passed" | "failed" | "na"
  ) {
    if (onItemUpdate && reviewer.trim()) {
      onItemUpdate(itemId, status, reviewer.trim(), comments.trim() || undefined);
      setExpandedItem(null);
      setComments("");
    }
  }

  function handleSignOff() {
    if (onQPSignOff && signName.trim() && signSignature.trim()) {
      onQPSignOff(signName.trim(), signSignature.trim());
      setSignName("");
      setSignSignature("");
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Overall Completion</span>
          <span className="text-muted-foreground">
            {completedItems}/{totalItems} items ({overallPct}%)
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              failedItems > 0 ? "bg-amber-500" : overallPct === 100 ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${overallPct}%` }}
          />
        </div>
        {failedItems > 0 && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {failedItems} item(s) failed review
          </p>
        )}
      </div>

      {/* Blockers Warning */}
      {blockers.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-red-800">
            <AlertTriangle className="h-4 w-4" />
            Release Blockers ({blockers.length})
          </div>
          {blockers.map((b) => (
            <p key={b.id} className="text-xs text-red-700 ml-6">
              {b.description}
              {b.comments && <span className="italic"> — {b.comments}</span>}
            </p>
          ))}
        </div>
      )}

      {/* Grouped Checklists */}
      {grouped.map(({ category, items: catItems }) => {
        const cfg = CATEGORY_CONFIG[category];
        const catCompleted = catItems.filter(
          (i) => i.status === "passed" || i.status === "na"
        ).length;
        const catPct =
          catItems.length > 0
            ? Math.round((catCompleted / catItems.length) * 100)
            : 0;

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className={cn("text-sm font-semibold", cfg.color)}>
                {cfg.label}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {catCompleted}/{catItems.length}
                </span>
                <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      catPct === 100 ? "bg-green-500" : "bg-blue-500"
                    )}
                    style={{ width: `${catPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className={cn("rounded-lg border p-1 space-y-0.5", cfg.bgColor)}>
              {catItems.map((item) => {
                const Icon = STATUS_ICON[item.status];
                const iconColor = STATUS_COLOR[item.status];
                const isExpanded = expandedItem === item.id;

                return (
                  <div key={item.id}>
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-md px-3 py-2 transition-colors",
                        !readOnly && item.status === "pending" && "hover:bg-white/60 cursor-pointer"
                      )}
                      onClick={() => {
                        if (!readOnly && item.status === "pending") {
                          setExpandedItem(isExpanded ? null : item.id);
                        }
                      }}
                    >
                      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm",
                              item.status === "passed" && "line-through text-muted-foreground",
                              item.status === "failed" && "text-red-700"
                            )}
                          >
                            {item.description}
                          </span>
                          {item.required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-red-300 text-red-600"
                            >
                              Required
                            </Badge>
                          )}
                        </div>
                        {(item.reviewer || item.date || item.comments) && (
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                            {item.reviewer && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.reviewer}
                              </span>
                            )}
                            {item.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            )}
                            {item.comments && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {item.comments}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {isExpanded && !readOnly && (
                      <div className="ml-8 mr-3 mb-2 p-3 bg-white rounded-md border space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Reviewer Name</label>
                          <Input
                            placeholder="Your name"
                            value={reviewer}
                            onChange={(e) => setReviewer(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Comments (optional)</label>
                          <Textarea
                            placeholder="Add comments..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            disabled={!reviewer.trim()}
                            onClick={() => handleStatusChange(item.id, "passed")}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Pass
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={!reviewer.trim()}
                            onClick={() => handleStatusChange(item.id, "failed")}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Fail
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={!reviewer.trim()}
                            onClick={() => handleStatusChange(item.id, "na")}
                          >
                            <MinusCircle className="h-3 w-3 mr-1" />
                            N/A
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs ml-auto"
                            onClick={() => setExpandedItem(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* QP Digital Signature */}
      {showSignOff && (
        <>
          <Separator />
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
              <ShieldCheck className="h-5 w-5" />
              QP Digital Sign-Off
            </div>
            <p className="text-xs text-indigo-700">
              By signing below, I certify that I have reviewed all batch records,
              quality control data, and related documentation. The batch meets all
              approved specifications and is suitable for release.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-indigo-800">QP Name</label>
                <Input
                  placeholder="Qualified Person full name"
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-indigo-800">
                  <PenLine className="h-3 w-3 inline mr-1" />
                  Digital Signature
                </label>
                <Input
                  placeholder="Type signature (e.g. QP-LF-2026)"
                  value={signSignature}
                  onChange={(e) => setSignSignature(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!signName.trim() || !signSignature.trim()}
              onClick={handleSignOff}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Confirm QP Sign-Off
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
