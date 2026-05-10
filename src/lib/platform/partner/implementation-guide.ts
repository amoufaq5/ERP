import { IMGNode } from '../types';

export const implementationGuide: IMGNode[] = [
  {
    id: 'enterprise-structure',
    label: 'Enterprise Structure',
    module: 'CORE',
    description: 'Define the organizational structure of your enterprise',
    type: 'folder',
    children: [
      {
        id: 'define-company',
        label: 'Define Company',
        module: 'CORE',
        description: 'Create the legal entity (company code) that represents your organization for financial reporting',
        type: 'activity',
        configKey: 'org.company',
        component: 'CompanyConfig',
        required: true,
      },
      {
        id: 'define-plants',
        label: 'Define Plants / Locations',
        module: 'CORE',
        description: 'Define manufacturing plants, offices, warehouses, or stores',
        type: 'activity',
        configKey: 'org.plants',
        component: 'PlantConfig',
        required: true,
      },
      {
        id: 'assign-plant-company',
        label: 'Assign Plants to Company',
        module: 'CORE',
        description: 'Link each plant/location to its parent company code',
        type: 'activity',
        configKey: 'org.plantAssignment',
        component: 'PlantAssignmentConfig',
        required: true,
      },
      {
        id: 'define-storage-locations',
        label: 'Define Storage Locations',
        module: 'MM',
        description: 'Define warehouses, zones, and storage areas within each plant',
        type: 'activity',
        configKey: 'org.storageLocations',
        component: 'StorageLocationConfig',
      },
      {
        id: 'define-sales-org',
        label: 'Define Sales Organization',
        module: 'SD',
        description: 'Define the sales organization responsible for selling products/services',
        type: 'activity',
        configKey: 'org.salesOrg',
        component: 'SalesOrgConfig',
      },
      {
        id: 'define-distribution-channels',
        label: 'Define Distribution Channels',
        module: 'SD',
        description: 'Define how products reach customers (direct, distributor, e-commerce, etc.)',
        type: 'activity',
        configKey: 'org.distributionChannels',
        component: 'DistributionChannelConfig',
      },
      {
        id: 'define-departments',
        label: 'Define Departments',
        module: 'HR',
        description: 'Define organizational departments and reporting hierarchies',
        type: 'activity',
        configKey: 'org.departments',
        component: 'DepartmentConfig',
      },
    ],
  },
  {
    id: 'financial-accounting',
    label: 'Financial Accounting',
    module: 'FI',
    description: 'Configure financial accounting settings',
    type: 'folder',
    children: [
      {
        id: 'chart-of-accounts',
        label: 'Chart of Accounts',
        module: 'FI',
        description: 'Define or import the chart of accounts structure',
        type: 'folder',
        children: [
          { id: 'define-coa', label: 'Define Chart of Accounts', module: 'FI', description: 'Create the chart of accounts with account groups', type: 'activity', configKey: 'fi.chartOfAccounts', component: 'ChartOfAccountsConfig', required: true },
          { id: 'define-account-groups', label: 'Define Account Groups', module: 'FI', description: 'Group GL accounts by type (asset, liability, revenue, expense)', type: 'activity', configKey: 'fi.accountGroups', component: 'AccountGroupsConfig', required: true },
          { id: 'define-retained-earnings', label: 'Define Retained Earnings Account', module: 'FI', description: 'Specify the retained earnings account for year-end close', type: 'activity', configKey: 'fi.retainedEarnings', component: 'RetainedEarningsConfig', required: true },
        ],
      },
      {
        id: 'fiscal-year',
        label: 'Fiscal Year Configuration',
        module: 'FI',
        description: 'Define fiscal year variant and periods',
        type: 'folder',
        children: [
          { id: 'define-fy-variant', label: 'Define Fiscal Year Variant', module: 'FI', description: 'Set fiscal year start/end and period structure', type: 'activity', configKey: 'fi.fiscalYearVariant', component: 'FiscalYearConfig', required: true },
          { id: 'define-posting-periods', label: 'Define Posting Periods', module: 'FI', description: 'Configure which periods are open for posting', type: 'activity', configKey: 'fi.postingPeriods', component: 'PostingPeriodsConfig' },
        ],
      },
      {
        id: 'document-types-fi',
        label: 'Document Types',
        module: 'FI',
        description: 'Define accounting document types and number ranges',
        type: 'folder',
        children: [
          { id: 'define-doc-types', label: 'Define Document Types', module: 'FI', description: 'Create document types (invoice, credit memo, journal entry, etc.)', type: 'activity', configKey: 'fi.documentTypes', component: 'DocumentTypesConfig', required: true },
          { id: 'define-number-ranges-fi', label: 'Define Number Ranges', module: 'FI', description: 'Assign number ranges to document types', type: 'activity', configKey: 'fi.numberRanges', component: 'NumberRangesConfig', required: true },
        ],
      },
      {
        id: 'tax-configuration',
        label: 'Tax Configuration',
        module: 'FI',
        description: 'Configure tax codes and rates',
        type: 'activity',
        configKey: 'fi.tax',
        component: 'TaxConfig',
      },
      {
        id: 'payment-terms',
        label: 'Payment Terms',
        module: 'FI',
        description: 'Define payment terms (Net 30, Net 60, etc.)',
        type: 'activity',
        configKey: 'fi.paymentTerms',
        component: 'PaymentTermsConfig',
      },
      {
        id: 'currency-settings',
        label: 'Currency Settings',
        module: 'FI',
        description: 'Define local and foreign currencies, exchange rate types',
        type: 'activity',
        configKey: 'fi.currencies',
        component: 'CurrencyConfig',
      },
    ],
  },
  {
    id: 'materials-management',
    label: 'Materials Management',
    module: 'MM',
    description: 'Configure procurement and inventory management',
    type: 'folder',
    children: [
      {
        id: 'purchasing-config',
        label: 'Purchasing',
        module: 'MM',
        description: 'Configure purchasing settings',
        type: 'folder',
        children: [
          { id: 'define-po-types', label: 'Define Purchase Order Types', module: 'MM', description: 'Create PO types (standard, framework, service)', type: 'activity', configKey: 'mm.poTypes', component: 'POTypesConfig' },
          { id: 'define-number-ranges-po', label: 'Define Number Ranges for PO', module: 'MM', description: 'Assign number ranges to purchase document types', type: 'activity', configKey: 'mm.numberRanges', component: 'PONumberRangesConfig' },
          { id: 'define-approval-limits', label: 'Define Approval Limits', module: 'MM', description: 'Set approval thresholds by role and amount', type: 'activity', configKey: 'mm.approvalLimits', component: 'ApprovalLimitsConfig' },
        ],
      },
      {
        id: 'inventory-config',
        label: 'Inventory Management',
        module: 'MM',
        description: 'Configure inventory settings',
        type: 'folder',
        children: [
          { id: 'define-movement-types', label: 'Define Movement Types', module: 'MM', description: 'Configure goods movement types (receipt, issue, transfer)', type: 'activity', configKey: 'mm.movementTypes', component: 'MovementTypesConfig' },
          { id: 'define-valuation', label: 'Define Valuation Method', module: 'MM', description: 'Choose inventory valuation (FIFO, weighted average, standard cost)', type: 'activity', configKey: 'mm.valuationMethod', component: 'ValuationMethodConfig' },
          { id: 'define-stock-types', label: 'Define Stock Types', module: 'MM', description: 'Configure stock categories (unrestricted, quality inspection, blocked)', type: 'activity', configKey: 'mm.stockTypes', component: 'StockTypesConfig' },
        ],
      },
    ],
  },
  {
    id: 'sales-distribution',
    label: 'Sales & Distribution',
    module: 'SD',
    description: 'Configure sales processing and billing',
    type: 'folder',
    children: [
      { id: 'define-order-types', label: 'Define Sales Order Types', module: 'SD', description: 'Create order types (standard, return, credit)', type: 'activity', configKey: 'sd.orderTypes', component: 'OrderTypesConfig' },
      { id: 'define-pricing', label: 'Define Pricing Procedures', module: 'SD', description: 'Configure pricing conditions, discounts, and surcharges', type: 'activity', configKey: 'sd.pricingProcedures', component: 'PricingConfig' },
      { id: 'define-shipping', label: 'Define Shipping Points', module: 'SD', description: 'Configure shipping points and delivery routes', type: 'activity', configKey: 'sd.shippingPoints', component: 'ShippingConfig' },
      { id: 'define-billing-types', label: 'Define Billing Types', module: 'SD', description: 'Configure billing document types', type: 'activity', configKey: 'sd.billingTypes', component: 'BillingTypesConfig' },
    ],
  },
  {
    id: 'human-resources',
    label: 'Human Resources',
    module: 'HR',
    description: 'Configure HR and payroll settings',
    type: 'folder',
    children: [
      { id: 'define-pay-structure', label: 'Define Pay Scale Structure', module: 'HR', description: 'Configure pay grades, bands, and salary ranges', type: 'activity', configKey: 'hr.payStructure', component: 'PayStructureConfig' },
      { id: 'define-leave-types', label: 'Define Leave Types', module: 'HR', description: 'Configure leave types and policies (annual, sick, maternity, etc.)', type: 'activity', configKey: 'hr.leaveTypes', component: 'LeaveTypesConfig' },
      { id: 'define-benefits', label: 'Define Benefits Plans', module: 'HR', description: 'Configure employee benefits packages', type: 'activity', configKey: 'hr.benefitsPlans', component: 'BenefitsConfig' },
      { id: 'define-attendance', label: 'Define Attendance Rules', module: 'HR', description: 'Configure work schedules, shift patterns, overtime rules', type: 'activity', configKey: 'hr.attendanceRules', component: 'AttendanceConfig' },
    ],
  },
  {
    id: 'quality-management',
    label: 'Quality Management',
    module: 'QM',
    description: 'Configure quality management and compliance settings',
    type: 'folder',
    children: [
      { id: 'define-inspection-types', label: 'Define Inspection Types', module: 'QM', description: 'Configure quality inspection types and catalogs', type: 'activity', configKey: 'qm.inspectionTypes', component: 'InspectionTypesConfig' },
      { id: 'define-spec-limits', label: 'Define Specification Limits', module: 'QM', description: 'Set quality specifications and acceptance criteria', type: 'activity', configKey: 'qm.specLimits', component: 'SpecLimitsConfig' },
      { id: 'define-sampling-plans', label: 'Define Sampling Plans', module: 'QM', description: 'Configure sampling procedures and plans', type: 'activity', configKey: 'qm.samplingPlans', component: 'SamplingPlansConfig' },
      { id: 'define-audit-schedule', label: 'Define Audit Schedule', module: 'QM', description: 'Configure internal/external audit calendar', type: 'activity', configKey: 'qm.auditSchedule', component: 'AuditScheduleConfig' },
    ],
  },
  {
    id: 'system-settings',
    label: 'System Settings',
    module: 'CORE',
    description: 'Configure system-wide settings',
    type: 'folder',
    children: [
      { id: 'user-roles', label: 'Define User Roles', module: 'CORE', description: 'Create roles and assign authorization profiles', type: 'activity', configKey: 'system.roles', component: 'RolesConfig', required: true },
      { id: 'email-templates', label: 'Configure Email Templates', module: 'CORE', description: 'Set up notification and communication templates', type: 'activity', configKey: 'system.emailTemplates', component: 'EmailTemplatesConfig' },
      { id: 'approval-workflows', label: 'Configure Approval Workflows', module: 'CORE', description: 'Define approval chains and escalation rules', type: 'activity', configKey: 'system.approvalWorkflows', component: 'ApprovalWorkflowsConfig' },
      { id: 'integrations', label: 'Configure Integrations', module: 'CORE', description: 'Set up connections to external systems', type: 'activity', configKey: 'system.integrations', component: 'IntegrationsConfig' },
      { id: 'branding', label: 'Configure Branding', module: 'CORE', description: 'Set up logo, colors, and application name', type: 'activity', configKey: 'system.branding', component: 'BrandingConfig' },
    ],
  },
];

export class ImplementationGuideService {
  private completionStatus: Map<string, Map<string, 'not_started' | 'in_progress' | 'completed'>> = new Map();

  getGuide(activeModules: string[]): IMGNode[] {
    return this.filterByModules(implementationGuide, activeModules);
  }

  private filterByModules(nodes: IMGNode[], activeModules: string[]): IMGNode[] {
    return nodes
      .filter(node => activeModules.includes(node.module) || node.module === 'CORE')
      .map(node => ({
        ...node,
        children: node.children ? this.filterByModules(node.children, activeModules) : undefined,
      }))
      .filter(node => node.type === 'activity' || (node.children && node.children.length > 0));
  }

  getStatus(tenantId: string, nodeId: string): 'not_started' | 'in_progress' | 'completed' {
    return this.completionStatus.get(tenantId)?.get(nodeId) || 'not_started';
  }

  setStatus(tenantId: string, nodeId: string, status: 'not_started' | 'in_progress' | 'completed'): void {
    if (!this.completionStatus.has(tenantId)) {
      this.completionStatus.set(tenantId, new Map());
    }
    this.completionStatus.get(tenantId)!.set(nodeId, status);
  }

  getProgress(tenantId: string, activeModules: string[]): { total: number; completed: number; required: number; requiredCompleted: number } {
    const guide = this.getGuide(activeModules);
    let total = 0;
    let completed = 0;
    let required = 0;
    let requiredCompleted = 0;

    const count = (nodes: IMGNode[]) => {
      for (const node of nodes) {
        if (node.type === 'activity') {
          total++;
          if (this.getStatus(tenantId, node.id) === 'completed') completed++;
          if (node.required) {
            required++;
            if (this.getStatus(tenantId, node.id) === 'completed') requiredCompleted++;
          }
        }
        if (node.children) count(node.children);
      }
    };

    count(guide);
    return { total, completed, required, requiredCompleted };
  }

  isReadyForGoLive(tenantId: string, activeModules: string[]): { ready: boolean; blockers: string[] } {
    const guide = this.getGuide(activeModules);
    const blockers: string[] = [];

    const check = (nodes: IMGNode[]) => {
      for (const node of nodes) {
        if (node.type === 'activity' && node.required && this.getStatus(tenantId, node.id) !== 'completed') {
          blockers.push(node.label);
        }
        if (node.children) check(node.children);
      }
    };

    check(guide);
    return { ready: blockers.length === 0, blockers };
  }
}

export const implementationGuideService = new ImplementationGuideService();
