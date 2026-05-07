"use client";

import React from "react";
import type { WidgetConfig } from "./dashboard-config";

// ---------------------------------------------------------------------------
// Widget Registry
// ---------------------------------------------------------------------------
// Central registry mapping widget type strings to React components. Widgets
// register themselves via `registerWidget` and are resolved via `getWidget`.
// ---------------------------------------------------------------------------

/**
 * Props passed to every registered widget component.
 */
export interface WidgetProps {
  config: WidgetConfig;
  onConfigure?: () => void;
  onRemove?: () => void;
}

// Internal map -- mutable by design so modules can register at import time.
const registry = new Map<string, React.ComponentType<WidgetProps>>();

/**
 * Register a widget component for a given type key.
 * If a component is already registered for `type` it will be overwritten.
 */
export function registerWidget(
  type: string,
  component: React.ComponentType<WidgetProps>,
): void {
  registry.set(type, component);
}

/**
 * Retrieve the component registered for `type`, or `null` if none exists.
 */
export function getWidget(
  type: string,
): React.ComponentType<WidgetProps> | null {
  return registry.get(type) ?? null;
}

/**
 * Returns all currently registered widget type keys.
 */
export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

// ---------------------------------------------------------------------------
// Built-in placeholder widgets
// ---------------------------------------------------------------------------
// These lightweight placeholders ensure every default widget type has a
// renderable component even before domain-specific widgets are registered.
// ---------------------------------------------------------------------------

function PlaceholderWidget({ config }: WidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-muted-foreground text-sm gap-2">
      <span className="font-medium">{config.title}</span>
      <span className="text-xs opacity-60">({config.type})</span>
    </div>
  );
}
PlaceholderWidget.displayName = "PlaceholderWidget";

// Register a placeholder for each built-in type so the grid always renders.
const BUILT_IN_TYPES = [
  "stats",
  "chart",
  "table",
  "list",
  "activity",
  "quick-actions",
] as const;

for (const type of BUILT_IN_TYPES) {
  if (!registry.has(type)) {
    registerWidget(type, PlaceholderWidget);
  }
}
