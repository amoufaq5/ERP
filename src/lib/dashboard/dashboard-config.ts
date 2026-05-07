"use client";

// ---------------------------------------------------------------------------
// Dashboard Layout Configuration Store
// ---------------------------------------------------------------------------
// Manages per-user dashboard widget layouts persisted to localStorage.
// ---------------------------------------------------------------------------

export interface WidgetConfig {
  id: string;
  type: "stats" | "chart" | "table" | "list" | "activity" | "quick-actions";
  title: string;
  size: "small" | "medium" | "large" | "full";
  visible: boolean;
  position: number;
  config?: Record<string, unknown>; // widget-specific settings
}

export interface DashboardLayout {
  userId: string;
  widgets: WidgetConfig[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Role-based default widget sets
// ---------------------------------------------------------------------------

const MEDICAL_REP_WIDGETS: WidgetConfig[] = [
  { id: "mr-todays-visits", type: "list", title: "Today's Visits", size: "medium", visible: true, position: 0 },
  { id: "mr-weekly-plan", type: "chart", title: "Weekly Plan Progress", size: "medium", visible: true, position: 1 },
  { id: "mr-doctor-coverage", type: "stats", title: "Doctor Coverage", size: "small", visible: true, position: 2 },
  { id: "mr-pending-requests", type: "table", title: "Pending Requests", size: "medium", visible: true, position: 3 },
  { id: "mr-quick-actions", type: "quick-actions", title: "Quick Actions", size: "small", visible: true, position: 4 },
  { id: "mr-recent-activity", type: "activity", title: "Recent Activity", size: "medium", visible: true, position: 5 },
];

const DISTRICT_MANAGER_WIDGETS: WidgetConfig[] = [
  { id: "dm-team-performance", type: "chart", title: "Team Performance", size: "large", visible: true, position: 0 },
  { id: "dm-plan-approval", type: "table", title: "Plan Approval Queue", size: "medium", visible: true, position: 1 },
  { id: "dm-visit-compliance", type: "stats", title: "Visit Compliance", size: "small", visible: true, position: 2 },
  { id: "dm-territory-coverage", type: "chart", title: "Territory Coverage", size: "medium", visible: true, position: 3 },
  { id: "dm-kpi-summary", type: "stats", title: "KPI Summary", size: "medium", visible: true, position: 4 },
  { id: "dm-alerts", type: "list", title: "Alerts", size: "small", visible: true, position: 5 },
];

const BUM_WIDGETS: WidgetConfig[] = [
  { id: "bum-bu-overview", type: "stats", title: "BU Overview", size: "full", visible: true, position: 0 },
  { id: "bum-team-kpis", type: "chart", title: "Team KPIs", size: "medium", visible: true, position: 1 },
  { id: "bum-pending-approvals", type: "table", title: "Pending Approvals", size: "medium", visible: true, position: 2 },
  { id: "bum-revenue-trend", type: "chart", title: "Revenue Trend", size: "medium", visible: true, position: 3 },
  { id: "bum-field-force", type: "list", title: "Field Force Status", size: "medium", visible: true, position: 4 },
  { id: "bum-market-requests", type: "table", title: "Market Requests", size: "medium", visible: true, position: 5 },
];

const NSM_WIDGETS: WidgetConfig[] = [
  { id: "nsm-national-kpis", type: "stats", title: "National KPIs", size: "full", visible: true, position: 0 },
  { id: "nsm-bu-comparison", type: "chart", title: "BU Comparison", size: "large", visible: true, position: 1 },
  { id: "nsm-approval-pipeline", type: "table", title: "Approval Pipeline", size: "medium", visible: true, position: 2 },
  { id: "nsm-coverage-heatmap", type: "chart", title: "Coverage Heatmap", size: "medium", visible: true, position: 3 },
  { id: "nsm-top-performers", type: "list", title: "Top Performers", size: "small", visible: true, position: 4 },
  { id: "nsm-strategic-alerts", type: "list", title: "Strategic Alerts", size: "small", visible: true, position: 5 },
];

const ADMIN_WIDGETS: WidgetConfig[] = [
  { id: "admin-system-health", type: "stats", title: "System Health", size: "medium", visible: true, position: 0 },
  { id: "admin-user-activity", type: "chart", title: "User Activity", size: "medium", visible: true, position: 1 },
  { id: "admin-audit-summary", type: "table", title: "Audit Summary", size: "large", visible: true, position: 2 },
  { id: "admin-quick-stats", type: "stats", title: "Quick Stats", size: "small", visible: true, position: 3 },
  { id: "admin-recent-changes", type: "activity", title: "Recent Changes", size: "medium", visible: true, position: 4 },
];

const DEFAULT_LAYOUTS: Record<string, WidgetConfig[]> = {
  medical_rep: MEDICAL_REP_WIDGETS,
  district_manager: DISTRICT_MANAGER_WIDGETS,
  bum: BUM_WIDGETS,
  nsm: NSM_WIDGETS,
  admin: ADMIN_WIDGETS,
};

// Fallback when role is unknown
const GENERIC_WIDGETS: WidgetConfig[] = [
  { id: "generic-kpis", type: "stats", title: "KPI Summary", size: "full", visible: true, position: 0 },
  { id: "generic-chart", type: "chart", title: "Performance Chart", size: "medium", visible: true, position: 1 },
  { id: "generic-activity", type: "activity", title: "Recent Activity", size: "medium", visible: true, position: 2 },
  { id: "generic-quick-actions", type: "quick-actions", title: "Quick Actions", size: "small", visible: true, position: 3 },
];

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = "dashboard_layout_";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__ls_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the sensible default widget list for a given role.
 */
export function getDefaultLayout(role: string): WidgetConfig[] {
  const normalized = role.toLowerCase().replace(/[\s-]+/g, "_");
  const widgets = DEFAULT_LAYOUTS[normalized] ?? GENERIC_WIDGETS;
  // Return deep copies so callers cannot mutate the static defaults
  return widgets.map((w) => ({ ...w }));
}

/**
 * Reads the persisted layout for a user from localStorage.
 * Returns a default layout when nothing has been persisted yet.
 */
export function getLayout(userId: string, role = "admin"): DashboardLayout {
  if (!isLocalStorageAvailable()) {
    return {
      userId,
      widgets: getDefaultLayout(role),
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed: DashboardLayout = JSON.parse(raw);
      // Validate minimal structure
      if (parsed && Array.isArray(parsed.widgets)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted data -- fall through to default
  }

  return {
    userId,
    widgets: getDefaultLayout(role),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Persists a layout for the given user to localStorage.
 */
export function saveLayout(userId: string, layout: DashboardLayout): void {
  if (!isLocalStorageAvailable()) return;

  const toStore: DashboardLayout = {
    ...layout,
    userId,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(toStore));
  } catch {
    // localStorage quota exceeded or blocked -- silently fail
  }
}

/**
 * Resets the user's layout back to the role default by removing persisted data.
 */
export function resetLayout(userId: string): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Returns all known role keys that have default layouts.
 */
export function getAvailableRoles(): string[] {
  return Object.keys(DEFAULT_LAYOUTS);
}
