// Module Registry Types
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'core' | 'industry' | 'extension';
  dependencies: string[];
  icon: string;
  orgLevels: OrgLevelType[];
  extensionPoints: ExtensionPointDef[];
  masterDataTypes: string[];
  documentTypes: DocumentTypeDef[];
  configSchema: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
  navItems: NavContribution[];
  widgets: WidgetDef[];
  reports: ReportDef[];
  workflowTemplates: WorkflowTemplateDef[];
}

export type OrgLevelType = 'COMPANY' | 'PLANT' | 'STORAGE_LOCATION' | 'SALES_ORG' | 'DISTRIBUTION_CHANNEL' | 'DIVISION' | 'COST_CENTER' | 'PROFIT_CENTER' | 'DEPARTMENT' | 'REGION' | 'STORE' | 'PROPERTY' | 'TEAM';

export interface ExtensionPointDef {
  id: string;
  module: string;
  entity: string;
  phase: 'before_create' | 'after_create' | 'before_update' | 'after_update' | 'before_delete' | 'after_delete' | 'validate' | 'transform' | 'authorize';
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface DocumentTypeDef {
  code: string;
  name: string;
  numberRangeId?: string;
  requiresApproval: boolean;
  approvalWorkflowId?: string;
  postingBehavior?: Record<string, unknown>;
}

export interface NavContribution {
  id: string;
  label: string;
  icon: string;
  path: string;
  parent?: string;
  order: number;
  requiredPermission?: string;
  badge?: { type: 'count' | 'dot'; source: string };
}

export interface WidgetDef {
  id: string;
  name: string;
  description: string;
  component: string;
  defaultSize: { w: number; h: number };
  dataSource?: string;
  refreshInterval?: number;
}

export interface ReportDef {
  id: string;
  name: string;
  description: string;
  entityType: string;
  columns: ReportColumnDef[];
  filters: ReportFilterDef[];
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  chartTypes?: ('bar' | 'line' | 'pie' | 'table' | 'pivot')[];
}

export interface ReportColumnDef {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface ReportFilterDef {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date-range' | 'number-range' | 'multi-select';
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
}

export interface WorkflowTemplateDef {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStepDef[];
}

export interface WorkflowTrigger {
  type: 'entity_create' | 'entity_update' | 'status_change' | 'schedule' | 'manual' | 'webhook';
  entity?: string;
  condition?: Record<string, unknown>;
  schedule?: string; // cron expression
}

export interface WorkflowStepDef {
  id: string;
  type: 'approval' | 'notification' | 'condition' | 'action' | 'delay' | 'webhook' | 'parallel' | 'loop';
  name: string;
  config: Record<string, unknown>;
  nextSteps?: string[];
  onReject?: string;
}

// Number Range Types
export interface NumberRangeConfig {
  id: string;
  objectType: string;
  subType?: string;
  prefix: string;
  currentNumber: number;
  numberLength: number;
  fiscalYearDependent: boolean;
  orgUnitId?: string;
  tenantId: string;
}

// Org Structure Types
export interface OrgUnitNode {
  id: string;
  type: OrgLevelType;
  code: string;
  name: string;
  parentId?: string;
  children?: OrgUnitNode[];
  level: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

// Industry Template Types
export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  modules: string[]; // module IDs to activate
  orgTemplate: OrgUnitNode[];
  customFields: IndustryCustomField[];
  workflowTemplates: WorkflowTemplateDef[];
  terminology: Record<string, string>; // key -> display name override
  compliance: ComplianceRequirement[];
  seedData?: Record<string, unknown>;
}

export interface IndustryCustomField {
  entityType: string;
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multi-select' | 'json';
  options?: { label: string; value: string }[];
  required?: boolean;
  defaultValue?: unknown;
}

export interface ComplianceRequirement {
  id: string;
  standard: string; // e.g., "21 CFR Part 11", "ISO 9001", "PCI DSS"
  requirement: string;
  description: string;
  controls: string[];
  evidenceTypes: string[];
}

// Authorization Types
export interface AuthorizationObjectDef {
  id: string;
  name: string;
  module: string;
  fields: AuthFieldDef[];
}

export interface AuthFieldDef {
  name: string;
  type: 'activity' | 'org_level' | 'document_type' | 'custom';
  allowedValues?: string[];
  description: string;
}

export interface AuthorizationProfileDef {
  id: string;
  name: string;
  description: string;
  authorizations: { objectId: string; fieldValues: Record<string, string[]> }[];
}

// Extension Handler Types
export interface ExtensionHandler {
  id: string;
  extensionPointId: string;
  priority: number;
  tenantId?: string;
  name: string;
  description: string;
  handler: (context: ExtensionContext) => Promise<ExtensionResult>;
}

export interface ExtensionContext {
  tenantId: string;
  userId: string;
  entity: string;
  action: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ExtensionResult {
  success: boolean;
  abort?: boolean;
  reason?: string;
  transformedData?: Record<string, unknown>;
  sideEffects?: { type: string; payload: unknown }[];
}

// Implementation Guide Types
export interface IMGNode {
  id: string;
  label: string;
  module: string;
  description: string;
  type: 'folder' | 'activity';
  children?: IMGNode[];
  configKey?: string;
  component?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  required?: boolean;
}

// Tenant Configuration Types
export interface TenantConfig {
  tenantId: string;
  activeModules: string[];
  industryTemplate: string;
  orgStructure: OrgUnitNode[];
  numberRanges: NumberRangeConfig[];
  branding: TenantBranding;
  features: Record<string, boolean>;
  settings: Record<string, unknown>;
}

export interface TenantBranding {
  appName: string;
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emailDomain?: string;
}
