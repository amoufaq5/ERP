import { ReportColumnDef, ReportFilterDef } from './types';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count';
export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'pivot' | 'area' | 'scatter' | 'donut';

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  dataSource: DataSourceConfig;
  columns: ReportColumnDef[];
  filters: ReportFilterDef[];
  groupBy?: GroupByConfig[];
  sorting: SortConfig[];
  chartConfig?: ChartConfig;
  scheduling?: ScheduleConfig;
  sharing?: SharingConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface DataSourceConfig {
  entity: string;
  joins?: JoinConfig[];
  computedFields?: ComputedFieldConfig[];
  baseFilter?: FilterExpression;
}

export interface JoinConfig {
  entity: string;
  type: 'inner' | 'left' | 'right';
  localField: string;
  foreignField: string;
  alias: string;
}

export interface ComputedFieldConfig {
  name: string;
  label: string;
  expression: string;
  type: 'number' | 'string' | 'date' | 'boolean';
}

export interface GroupByConfig {
  field: string;
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ChartConfig {
  type: ChartType;
  xAxis?: string;
  yAxis?: string[];
  colorField?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  title?: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  cron: string;
  recipients: string[];
  format: 'csv' | 'xlsx' | 'pdf';
  timezone: string;
}

export interface SharingConfig {
  visibility: 'private' | 'team' | 'org';
  sharedWith?: string[];
  allowExport: boolean;
}

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'starts_with' | 'ends_with' | 'between' | 'is_null' | 'is_not_null';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface FilterExpression {
  logic: 'and' | 'or';
  conditions: (FilterCondition | FilterExpression)[];
}

interface QueryResult {
  data: Record<string, unknown>[];
  total: number;
  aggregations?: Record<string, number>;
  executionTimeMs: number;
}

export class ReportBuilder {
  private definitions: Map<string, ReportDefinition> = new Map();

  createReport(def: Omit<ReportDefinition, 'id' | 'createdAt' | 'updatedAt' | 'version'>): ReportDefinition {
    const report: ReportDefinition = {
      ...def,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
    this.definitions.set(report.id, report);
    return report;
  }

  updateReport(id: string, updates: Partial<Omit<ReportDefinition, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>): ReportDefinition {
    const existing = this.definitions.get(id);
    if (!existing) throw new Error(`Report ${id} not found`);
    const updated: ReportDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
      version: existing.version + 1,
    };
    this.definitions.set(id, updated);
    return updated;
  }

  deleteReport(id: string): void {
    this.definitions.delete(id);
  }

  getReport(id: string): ReportDefinition | undefined {
    return this.definitions.get(id);
  }

  listReports(tenantId: string, options?: { createdBy?: string; visibility?: string }): ReportDefinition[] {
    return Array.from(this.definitions.values()).filter(r => {
      if (r.tenantId !== tenantId) return false;
      if (options?.createdBy && r.createdBy !== options.createdBy) return false;
      return true;
    });
  }

  buildQuery(report: ReportDefinition, runtimeFilters?: FilterCondition[]): PrismaQuery {
    const where = this.buildWhereClause(report.dataSource.baseFilter, runtimeFilters);
    const orderBy = this.buildOrderBy(report.sorting);
    const select = this.buildSelect(report.columns, report.dataSource.computedFields);
    const include = this.buildIncludes(report.dataSource.joins);
    const groupBy = report.groupBy ? this.buildGroupBy(report.groupBy) : undefined;

    return { where, orderBy, select, include, groupBy };
  }

  async executeReport(report: ReportDefinition, options?: {
    page?: number;
    pageSize?: number;
    runtimeFilters?: FilterCondition[];
    prismaModel?: { findMany: Function; count: Function };
  }): Promise<QueryResult> {
    const startTime = Date.now();
    const query = this.buildQuery(report, options?.runtimeFilters);
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;

    if (!options?.prismaModel) {
      return { data: [], total: 0, executionTimeMs: Date.now() - startTime };
    }

    const [data, total] = await Promise.all([
      options.prismaModel.findMany({
        where: query.where,
        orderBy: query.orderBy,
        include: query.include,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      options.prismaModel.count({ where: query.where }),
    ]);

    const aggregations = report.groupBy
      ? this.computeAggregations(data, report.columns)
      : undefined;

    return {
      data,
      total,
      aggregations,
      executionTimeMs: Date.now() - startTime,
    };
  }

  exportToCSV(data: Record<string, unknown>[], columns: ReportColumnDef[]): string {
    const header = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const val = row[col.field];
        if (val === null || val === undefined) return '';
        if (col.type === 'date' && val instanceof Date) return val.toISOString();
        if (col.type === 'currency') return String(val);
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  }

  exportToJSON(data: Record<string, unknown>[], columns: ReportColumnDef[]): string {
    const filtered = data.map(row => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col.field] = row[col.field] ?? null;
      }
      return obj;
    });
    return JSON.stringify(filtered, null, 2);
  }

  private buildWhereClause(
    baseFilter?: FilterExpression,
    runtimeFilters?: FilterCondition[],
  ): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];

    if (baseFilter) {
      conditions.push(this.expressionToWhere(baseFilter));
    }

    if (runtimeFilters) {
      for (const filter of runtimeFilters) {
        conditions.push(this.conditionToWhere(filter));
      }
    }

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
  }

  private expressionToWhere(expr: FilterExpression): Record<string, unknown> {
    const parts = expr.conditions.map(c =>
      'logic' in c ? this.expressionToWhere(c as FilterExpression) : this.conditionToWhere(c as FilterCondition)
    );
    return expr.logic === 'and' ? { AND: parts } : { OR: parts };
  }

  private conditionToWhere(cond: FilterCondition): Record<string, unknown> {
    const { field, operator, value } = cond;
    switch (operator) {
      case 'eq': return { [field]: value };
      case 'neq': return { [field]: { not: value } };
      case 'gt': return { [field]: { gt: value } };
      case 'gte': return { [field]: { gte: value } };
      case 'lt': return { [field]: { lt: value } };
      case 'lte': return { [field]: { lte: value } };
      case 'in': return { [field]: { in: value } };
      case 'nin': return { [field]: { not: { in: value } } };
      case 'contains': return { [field]: { contains: value, mode: 'insensitive' } };
      case 'starts_with': return { [field]: { startsWith: value } };
      case 'ends_with': return { [field]: { endsWith: value } };
      case 'between': {
        const [min, max] = value as [unknown, unknown];
        return { [field]: { gte: min, lte: max } };
      }
      case 'is_null': return { [field]: null };
      case 'is_not_null': return { [field]: { not: null } };
      default: return {};
    }
  }

  private buildOrderBy(sorting: SortConfig[]): Record<string, string>[] {
    return sorting.map(s => ({ [s.field]: s.direction }));
  }

  private buildSelect(
    columns: ReportColumnDef[],
    _computedFields?: ComputedFieldConfig[],
  ): Record<string, boolean> | undefined {
    if (columns.length === 0) return undefined;
    const select: Record<string, boolean> = { id: true };
    for (const col of columns) {
      if (!col.field.includes('.')) {
        select[col.field] = true;
      }
    }
    return select;
  }

  private buildIncludes(joins?: JoinConfig[]): Record<string, boolean> | undefined {
    if (!joins || joins.length === 0) return undefined;
    const include: Record<string, boolean> = {};
    for (const join of joins) {
      include[join.alias || join.entity] = true;
    }
    return include;
  }

  private buildGroupBy(groups: GroupByConfig[]): string[] {
    return groups.map(g => g.field);
  }

  private computeAggregations(
    data: Record<string, unknown>[],
    columns: ReportColumnDef[],
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const col of columns) {
      if (!col.aggregation) continue;
      const values = data.map(r => Number(r[col.field]) || 0);
      switch (col.aggregation) {
        case 'sum': result[`${col.field}_sum`] = values.reduce((a, b) => a + b, 0); break;
        case 'avg': result[`${col.field}_avg`] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
        case 'count': result[`${col.field}_count`] = values.length; break;
        case 'min': result[`${col.field}_min`] = Math.min(...values); break;
        case 'max': result[`${col.field}_max`] = Math.max(...values); break;
      }
    }
    return result;
  }

  private generateId(): string {
    return `rpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

interface PrismaQuery {
  where: Record<string, unknown>;
  orderBy: Record<string, string>[];
  select: Record<string, boolean> | undefined;
  include: Record<string, boolean> | undefined;
  groupBy: string[] | undefined;
}

export const reportBuilder = new ReportBuilder();
