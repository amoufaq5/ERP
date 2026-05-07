"use client";

import React, { Component, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/lib/dashboard/dashboard-config";
import { getWidget, type WidgetProps } from "@/lib/dashboard/widget-registry";
import {
  GripVertical,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Size-aware CSS grid column classes
// ---------------------------------------------------------------------------

const SIZE_CLASSES: Record<WidgetConfig["size"], string> = {
  small: "col-span-1",
  medium: "col-span-1 md:col-span-2",
  large: "col-span-1 md:col-span-2 lg:col-span-3",
  full: "col-span-full",
};

// ---------------------------------------------------------------------------
// Widget Error Boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  widgetTitle: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class WidgetErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[DashboardWidget:${this.props.widgetTitle}]`,
      error,
      info,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-sm text-destructive min-h-[100px]">
          <AlertTriangle className="h-5 w-5" />
          <span>Widget failed to load</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton for a single widget
// ---------------------------------------------------------------------------

function WidgetSkeleton() {
  return (
    <div className="space-y-3 p-1">
      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
      <div className="h-20 w-full bg-muted/60 animate-pulse rounded" />
      <div className="h-3 w-1/2 bg-muted/40 animate-pulse rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardWidget
// ---------------------------------------------------------------------------

export interface DashboardWidgetProps {
  config: WidgetConfig;
  /** When true the widget shows drag handle & edit controls */
  editMode?: boolean;
  loading?: boolean;
  onConfigure?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSizeChange?: (size: WidgetConfig["size"]) => void;
}

const NEXT_SIZE: Record<WidgetConfig["size"], WidgetConfig["size"]> = {
  small: "medium",
  medium: "large",
  large: "full",
  full: "small",
};

const PREV_SIZE: Record<WidgetConfig["size"], WidgetConfig["size"]> = {
  small: "full",
  medium: "small",
  large: "medium",
  full: "large",
};

export function DashboardWidget({
  config,
  editMode = false,
  loading = false,
  onConfigure,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSizeChange,
}: DashboardWidgetProps) {
  const WidgetComponent = getWidget(config.type);

  const widgetProps: WidgetProps = {
    config,
    onConfigure,
    onRemove,
  };

  return (
    <Card
      className={cn(
        SIZE_CLASSES[config.size],
        "relative transition-shadow",
        editMode && "ring-1 ring-primary/20 shadow-md",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {editMode && (
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />
          )}
          <CardTitle className="text-sm font-medium truncate">
            {config.title}
          </CardTitle>
          {editMode && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {config.size}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {editMode && (
            <>
              {/* Reorder buttons */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMoveUp}
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onMoveDown}
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>

              {/* Size cycle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onSizeChange?.(NEXT_SIZE[config.size])}
                title="Increase size"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onSizeChange?.(PREV_SIZE[config.size])}
                title="Decrease size"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            </>
          )}

          {/* Configure (always available if handler provided) */}
          {onConfigure && !editMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onConfigure}
              title="Configure"
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}

          {/* Remove (edit mode only) */}
          {editMode && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onRemove}
              title="Remove widget"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <WidgetSkeleton />
        ) : (
          <WidgetErrorBoundary widgetTitle={config.title}>
            {WidgetComponent ? (
              <WidgetComponent {...widgetProps} />
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                Unknown widget type: {config.type}
              </div>
            )}
          </WidgetErrorBoundary>
        )}
      </CardContent>
    </Card>
  );
}
