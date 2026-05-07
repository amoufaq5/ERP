"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/lib/dashboard/dashboard-config";
import {
  getLayout,
  saveLayout,
  resetLayout,
  getDefaultLayout,
} from "@/lib/dashboard/dashboard-config";
import { DashboardWidget } from "./dashboard-widget";
import { DashboardCustomize } from "./dashboard-customize";
import { Settings2, Pencil, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DashboardGridProps {
  userId: string;
  role: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardGrid({ userId, role, className }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load layout from localStorage after mount (client-only)
  useEffect(() => {
    const layout = getLayout(userId, role);
    setWidgets(layout.widgets);
    setMounted(true);
  }, [userId, role]);

  // Persist whenever widgets change (skip initial mount)
  useEffect(() => {
    if (!mounted) return;
    saveLayout(userId, {
      userId,
      widgets,
      updatedAt: new Date().toISOString(),
    });
  }, [widgets, userId, mounted]);

  // Handler: save from customize panel
  const handleCustomizeSave = useCallback(
    (updated: WidgetConfig[]) => {
      setWidgets(updated);
    },
    [],
  );

  // Handler: reset to role defaults
  const handleReset = useCallback(() => {
    resetLayout(userId);
    setWidgets(getDefaultLayout(role));
  }, [userId, role]);

  // Handler: toggle widget visibility via remove button
  const handleRemove = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: false } : w)),
    );
  }, []);

  // Handler: reorder
  const handleMoveUp = useCallback((id: string) => {
    setWidgets((prev) => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const visibleSorted = sorted.filter((w) => w.visible);
      const idx = visibleSorted.findIndex((w) => w.id === id);
      if (idx <= 0) return prev;

      const prevId = visibleSorted[idx - 1].id;
      const prevPos = visibleSorted[idx - 1].position;
      const currPos = visibleSorted[idx].position;

      return prev.map((w) => {
        if (w.id === id) return { ...w, position: prevPos };
        if (w.id === prevId) return { ...w, position: currPos };
        return w;
      });
    });
  }, []);

  const handleMoveDown = useCallback((id: string) => {
    setWidgets((prev) => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const visibleSorted = sorted.filter((w) => w.visible);
      const idx = visibleSorted.findIndex((w) => w.id === id);
      if (idx < 0 || idx >= visibleSorted.length - 1) return prev;

      const nextId = visibleSorted[idx + 1].id;
      const nextPos = visibleSorted[idx + 1].position;
      const currPos = visibleSorted[idx].position;

      return prev.map((w) => {
        if (w.id === id) return { ...w, position: nextPos };
        if (w.id === nextId) return { ...w, position: currPos };
        return w;
      });
    });
  }, []);

  // Handler: resize widget
  const handleSizeChange = useCallback(
    (id: string, size: WidgetConfig["size"]) => {
      setWidgets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, size } : w)),
      );
    },
    [],
  );

  // Visible widgets sorted by position
  const visibleWidgets = [...widgets]
    .filter((w) => w.visible)
    .sort((a, b) => a.position - b.position);

  // Don't render until client-side hydration is done
  if (!mounted) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-lg bg-muted animate-pulse col-span-1 md:col-span-2"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        {editMode ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => setEditMode(false)}
          >
            <Check className="h-4 w-4 mr-1" />
            Done Editing
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(true)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit Layout
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCustomizeOpen(true)}
        >
          <Settings2 className="h-4 w-4 mr-1" />
          Customize Dashboard
        </Button>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleWidgets.map((widget) => (
          <DashboardWidget
            key={widget.id}
            config={widget}
            editMode={editMode}
            onRemove={() => handleRemove(widget.id)}
            onMoveUp={() => handleMoveUp(widget.id)}
            onMoveDown={() => handleMoveDown(widget.id)}
            onSizeChange={(size) => handleSizeChange(widget.id, size)}
          />
        ))}
      </div>

      {visibleWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <p className="text-sm">No widgets are visible.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCustomizeOpen(true)}
          >
            Customize Dashboard
          </Button>
        </div>
      )}

      {/* Customization side panel */}
      <DashboardCustomize
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        widgets={widgets}
        onSave={handleCustomizeSave}
        onReset={handleReset}
      />
    </div>
  );
}
