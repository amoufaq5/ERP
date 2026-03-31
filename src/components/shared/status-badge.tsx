"use client";

import { cn } from "@/lib/utils";

// Colour families used in the mapping
const GREEN  = "bg-green-100  text-green-800  border-green-200";
const YELLOW = "bg-yellow-100 text-yellow-800 border-yellow-200";
const BLUE   = "bg-blue-100   text-blue-800   border-blue-200";
const RED    = "bg-red-100    text-red-800    border-red-200";
const PURPLE = "bg-purple-100 text-purple-800 border-purple-200";
const GRAY   = "bg-gray-100   text-gray-700   border-gray-200";
const INDIGO = "bg-indigo-100 text-indigo-800 border-indigo-200";
const ORANGE = "bg-orange-100 text-orange-800 border-orange-200";

/**
 * All status strings that map to a non-default colour.
 * Keys are lower-cased; lookup is case-insensitive.
 */
const STATUS_MAP: Record<string, string> = {
  // --- GREEN: active / open / done ---
  active:          GREEN,
  open:            GREEN,
  new:             GREEN,
  present:         GREEN,
  paid:            GREEN,
  approved:        GREEN,
  received:        GREEN,
  "in stock":      GREEN,
  fulfilled:       GREEN,
  completed:       GREEN,
  done:            GREEN,
  hired:           GREEN,
  closed:          BLUE,   // "closed" ticket = resolved → blue
  finished:        GREEN,

  // --- YELLOW / AMBER: pending / draft / planning / scheduled ---
  pending:         YELLOW,
  draft:           YELLOW,
  planning:        YELLOW,
  scheduled:       YELLOW,
  "pending approval": YELLOW,
  "on hold":       GRAY,
  waiting:         GRAY,
  paused:          GRAY,
  maintenance:     YELLOW,
  "low stock":     ORANGE,
  partial:         ORANGE,
  "on leave":      ORANGE,

  // --- BLUE: in-progress / processing / screening ---
  in_progress:     BLUE,
  "in progress":   BLUE,
  processing:      BLUE,
  screening:       BLUE,
  sent:            BLUE,
  ordered:         BLUE,
  released:        BLUE,
  shipped:         INDIGO,
  "in production": INDIGO,
  review:          PURPLE,

  // --- RED: cancelled / rejected / void / terminated / disposed / overdue / critical / urgent ---
  cancelled:       RED,
  rejected:        RED,
  void:            RED,
  terminated:      RED,
  disposed:        RED,
  overdue:         RED,
  critical:        RED,
  urgent:          RED,
  "out of stock":  RED,

  // --- PURPLE: in_progress variants already done above; screening variants ---
  interviewing:    PURPLE,

  // --- GRAY: inactive / retired / todo / closed-as-won ---
  inactive:        GRAY,
  retired:         GRAY,
  todo:            GRAY,
  planned:         GRAY,
  draft_closed:    GRAY,
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase().trim();
  const colorClasses = STATUS_MAP[key] ?? GRAY;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize whitespace-nowrap",
        colorClasses,
        className
      )}
    >
      {status}
    </span>
  );
}
