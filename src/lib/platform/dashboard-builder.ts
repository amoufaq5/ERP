export type WidgetSize = { w: number; h: number };
export type WidgetPosition = { x: number; y: number; w: number; h: number };

export interface DashboardDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerType: 'user' | 'role' | 'org';
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters?: DashboardFilter[];
  refreshInterval?: number;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'freeform';
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  config: WidgetConfig;
  refreshInterval?: number;
  permissions?: string[];
}

export type WidgetType =
  | 'stat_card' | 'chart_bar' | 'chart_line' | 'chart_pie' | 'chart_area' | 'chart_donut'
  | 'table' | 'list' | 'calendar' | 'map'
  | 'activity_feed' | 'todo_list' | 'quick_actions'
  | 'progress_bar' | 'gauge' | 'heatmap'
  | 'custom';

export interface WidgetConfig {
  dataSource?: WidgetDataSource;
  display?: DisplayConfig;
  actions?: WidgetAction[];
  thresholds?: ThresholdConfig[];
}

export interface WidgetDataSource {
  type: 'api' | 'query' | 'static' | 'formula';
  endpoint?: string;
  entity?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  filters?: Record<string, unknown>;
  groupBy?: string;
  limit?: number;
  query?: string;
  staticData?: unknown;
  formula?: string;
}

export interface DisplayConfig {
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  currency?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  color?: string;
  icon?: string;
  showTrend?: boolean;
  trendPeriod?: 'day' | 'week' | 'month';
  colorScheme?: string[];
}

export interface WidgetAction {
  label: string;
  type: 'link' | 'modal' | 'api_call';
  target: string;
  icon?: string;
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
}

export interface DashboardFilter {
  id: string;
  label: string;
  type: 'date_range' | 'select' | 'multi_select' | 'text';
  field: string;
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
  affectsWidgets: string[];
}

export class DashboardBuilder {
  private dashboards: Map<string, DashboardDefinition> = new Map();

  createDashboard(def: Omit<DashboardDefinition, 'id' | 'createdAt' | 'updatedAt'>): DashboardDefinition {
    const dashboard: DashboardDefinition = {
      ...def,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  updateDashboard(id: string, updates: Partial<Omit<DashboardDefinition, 'id' | 'tenantId' | 'createdAt'>>): DashboardDefinition {
    const existing = this.dashboards.get(id);
    if (!existing) throw new Error(`Dashboard ${id} not found`);
    const updated: DashboardDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.dashboards.set(id, updated);
    return updated;
  }

  deleteDashboard(id: string): void {
    this.dashboards.delete(id);
  }

  getDashboard(id: string): DashboardDefinition | undefined {
    return this.dashboards.get(id);
  }

  listDashboards(tenantId: string, options?: { ownerId?: string; ownerType?: string }): DashboardDefinition[] {
    return Array.from(this.dashboards.values()).filter(d => {
      if (d.tenantId !== tenantId) return false;
      if (options?.ownerId && d.ownerId !== options.ownerId) return false;
      if (options?.ownerType && d.ownerType !== options.ownerType) return false;
      return true;
    });
  }

  addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): DashboardWidget {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error(`Dashboard ${dashboardId} not found`);

    const newWidget: DashboardWidget = {
      ...widget,
      id: `wgt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    };

    const position = this.findAvailablePosition(dashboard, widget.position);
    newWidget.position = position;

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();
    return newWidget;
  }

  updateWidget(dashboardId: string, widgetId: string, updates: Partial<Omit<DashboardWidget, 'id'>>): DashboardWidget {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error(`Dashboard ${dashboardId} not found`);

    const idx = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (idx === -1) throw new Error(`Widget ${widgetId} not found`);

    dashboard.widgets[idx] = { ...dashboard.widgets[idx], ...updates };
    dashboard.updatedAt = new Date();
    return dashboard.widgets[idx];
  }

  removeWidget(dashboardId: string, widgetId: string): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error(`Dashboard ${dashboardId} not found`);
    dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
    dashboard.updatedAt = new Date();
  }

  moveWidget(dashboardId: string, widgetId: string, newPosition: WidgetPosition): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error(`Dashboard ${dashboardId} not found`);

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) throw new Error(`Widget ${widgetId} not found`);

    if (this.isValidPosition(dashboard, newPosition, widgetId)) {
      widget.position = newPosition;
      dashboard.updatedAt = new Date();
    }
  }

  getDefaultDashboard(tenantId: string, role: string): DashboardDefinition | undefined {
    return Array.from(this.dashboards.values()).find(
      d => d.tenantId === tenantId && d.ownerType === 'role' && d.ownerId === role && d.isDefault
    );
  }

  cloneDashboard(id: string, newOwner: { ownerId: string; ownerType: 'user' | 'role' | 'org' }): DashboardDefinition {
    const source = this.dashboards.get(id);
    if (!source) throw new Error(`Dashboard ${id} not found`);

    return this.createDashboard({
      ...source,
      ...newOwner,
      name: `${source.name} (Copy)`,
      isDefault: false,
      widgets: source.widgets.map(w => ({ ...w, id: `wgt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` })),
    });
  }

  async resolveWidgetData(widget: DashboardWidget, context: { tenantId: string; userId: string; filters?: Record<string, unknown> }): Promise<unknown> {
    const ds = widget.config.dataSource;
    if (!ds) return null;

    switch (ds.type) {
      case 'static':
        return ds.staticData;
      case 'formula':
        return this.evaluateFormula(ds.formula || '0');
      case 'api':
        return { endpoint: ds.endpoint, context };
      case 'query':
        return { entity: ds.entity, aggregation: ds.aggregation, field: ds.field, filters: { ...ds.filters, ...context.filters, tenantId: context.tenantId } };
      default:
        return null;
    }
  }

  private findAvailablePosition(dashboard: DashboardDefinition, requested: WidgetPosition): WidgetPosition {
    if (this.isValidPosition(dashboard, requested)) return requested;

    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= dashboard.layout.columns - requested.w; x++) {
        const candidate = { x, y, w: requested.w, h: requested.h };
        if (this.isValidPosition(dashboard, candidate)) return candidate;
      }
    }

    return { x: 0, y: this.getMaxY(dashboard) + 1, w: requested.w, h: requested.h };
  }

  private isValidPosition(dashboard: DashboardDefinition, pos: WidgetPosition, excludeWidgetId?: string): boolean {
    if (pos.x < 0 || pos.x + pos.w > dashboard.layout.columns) return false;
    if (pos.y < 0) return false;

    for (const widget of dashboard.widgets) {
      if (widget.id === excludeWidgetId) continue;
      if (this.overlaps(pos, widget.position)) return false;
    }
    return true;
  }

  private overlaps(a: WidgetPosition, b: WidgetPosition): boolean {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  private getMaxY(dashboard: DashboardDefinition): number {
    if (dashboard.widgets.length === 0) return 0;
    return Math.max(...dashboard.widgets.map(w => w.position.y + w.position.h));
  }

  private evaluateFormula(formula: string): number {
    try {
      const fn = new Function(`return ${formula}`);
      return fn();
    } catch {
      return 0;
    }
  }

  private generateId(): string {
    return `dsh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const dashboardBuilder = new DashboardBuilder();
