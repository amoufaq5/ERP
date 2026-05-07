"use client";

import React, { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/lib/dashboard/dashboard-config";
import {
  ChevronUp,
  ChevronDown,
  RotateCcw,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DashboardCustomizeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
  onReset: () => void;
}

// ---------------------------------------------------------------------------
// Size labels for display
// ---------------------------------------------------------------------------

const SIZE_LABELS: Record<WidgetConfig["size"], string> = {
  small: "Small (1 col)",
  medium: "Medium (2 col)",
  large: "Large (3 col)",
  full: "Full width",
};

const SIZES: WidgetConfig["size"][] = ["small", "medium", "large", "full"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardCustomize({
  open,
  onOpenChange,
  widgets: initialWidgets,
  onSave,
  onReset,
}: DashboardCustomizeProps) {
  const [draft, setDraft] = useState<WidgetConfig[]>(() =>
    initialWidgets.map((w) => ({ ...w })),
  );

  // Re-sync draft whenever the panel opens with new data
  React.useEffect(() => {
    if (open) {
      setDraft(initialWidgets.map((w) => ({ ...w })));
    }
  }, [open, initialWidgets]);

  // Helpers ----------------------------------------------------------------

  const sorted = [...draft].sort((a, b) => a.position - b.position);

  const updateWidget = useCallback(
    (id: string, patch: Partial<WidgetConfig>) => {
      setDraft((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      );
    },
    [],
  );

  const moveUp = useCallback(
    (id: string) => {
      setDraft((prev) => {
        const items = [...prev].sort((a, b) => a.position - b.position);
        const idx = items.findIndex((w) => w.id === id);
        if (idx <= 0) return prev;
        // Swap positions
        const prevPos = items[idx - 1].position;
        const currPos = items[idx].position;
        return prev.map((w) => {
          if (w.id === items[idx].id) return { ...w, position: prevPos };
          if (w.id === items[idx - 1].id) return { ...w, position: currPos };
          return w;
        });
      });
    },
    [],
  );

  const moveDown = useCallback(
    (id: string) => {
      setDraft((prev) => {
        const items = [...prev].sort((a, b) => a.position - b.position);
        const idx = items.findIndex((w) => w.id === id);
        if (idx < 0 || idx >= items.length - 1) return prev;
        const nextPos = items[idx + 1].position;
        const currPos = items[idx].position;
        return prev.map((w) => {
          if (w.id === items[idx].id) return { ...w, position: nextPos };
          if (w.id === items[idx + 1].id) return { ...w, position: currPos };
          return w;
        });
      });
    },
    [],
  );

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  // Count visible widgets for the preview line
  const visibleCount = draft.filter((w) => w.visible).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-lg overflow-hidden"
      >
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Toggle widgets, reorder them, and choose sizes. {visibleCount} of{" "}
            {draft.length} widgets visible.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable widget list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-2">
          {sorted.map((widget, idx) => (
            <div
              key={widget.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                widget.visible
                  ? "bg-card border-border"
                  : "bg-muted/30 border-border/50 opacity-60",
              )}
            >
              {/* Drag handle (visual) */}
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />

              {/* Widget info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {widget.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {widget.type}
                  </Badge>
                </div>

                {/* Size selector */}
                <Select
                  value={widget.size}
                  onValueChange={(val) =>
                    updateWidget(widget.id, {
                      size: val as WidgetConfig["size"],
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {SIZE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={idx === 0}
                  onClick={() => moveUp(widget.id)}
                  title="Move up"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={idx === sorted.length - 1}
                  onClick={() => moveDown(widget.id)}
                  title="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center gap-1.5">
                {widget.visible ? (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Switch
                  checked={widget.visible}
                  onCheckedChange={(checked) =>
                    updateWidget(widget.id, { visible: checked })
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {/* Layout preview */}
        <div className="border-t pt-3 -mx-6 px-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Layout Preview
          </p>
          <div className="grid grid-cols-4 gap-1">
            {sorted
              .filter((w) => w.visible)
              .map((w) => {
                const colSpan =
                  w.size === "small"
                    ? 1
                    : w.size === "medium"
                      ? 2
                      : w.size === "large"
                        ? 3
                        : 4;
                return (
                  <div
                    key={w.id}
                    className="bg-primary/20 rounded h-4 text-[8px] leading-4 text-center truncate px-0.5"
                    style={{ gridColumn: `span ${colSpan}` }}
                    title={w.title}
                  >
                    {w.title}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Footer actions */}
        <SheetFooter className="flex-row gap-2 pt-4 border-t mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="mr-auto"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset to Default
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
