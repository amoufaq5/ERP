import { AuthorizationObjectDef, AuthorizationProfileDef } from './types';

export const standardAuthorizationObjects: AuthorizationObjectDef[] = [
  {
    id: 'AUTH_FINANCE_POST',
    name: 'Financial Posting Authorization',
    module: 'FI',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE', 'POST', 'REVERSE'], description: 'Activity type' },
      { name: 'companyCode', type: 'org_level', description: 'Company code scope' },
      { name: 'documentType', type: 'document_type', allowedValues: ['JE', 'AP', 'AR', 'SA', 'RE', 'AB'], description: 'Document type restriction' },
    ],
  },
  {
    id: 'AUTH_PURCHASE_ORDER',
    name: 'Purchase Order Authorization',
    module: 'MM',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE', 'APPROVE', 'RELEASE'], description: 'Activity type' },
      { name: 'plant', type: 'org_level', description: 'Plant scope' },
      { name: 'poType', type: 'document_type', allowedValues: ['STANDARD', 'FRAMEWORK', 'SERVICE', 'CONSIGNMENT'], description: 'PO type restriction' },
      { name: 'amountLimit', type: 'custom', description: 'Maximum amount for approval' },
    ],
  },
  {
    id: 'AUTH_SALES_ORDER',
    name: 'Sales Order Authorization',
    module: 'SD',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE', 'APPROVE'], description: 'Activity type' },
      { name: 'salesOrg', type: 'org_level', description: 'Sales organization scope' },
      { name: 'distributionChannel', type: 'org_level', description: 'Distribution channel scope' },
      { name: 'orderType', type: 'document_type', description: 'Order type restriction' },
    ],
  },
  {
    id: 'AUTH_INVENTORY',
    name: 'Inventory Management Authorization',
    module: 'MM',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['CREATE', 'CHANGE', 'DISPLAY', 'GOODS_RECEIPT', 'GOODS_ISSUE', 'TRANSFER', 'PHYSICAL_COUNT'], description: 'Activity type' },
      { name: 'plant', type: 'org_level', description: 'Plant scope' },
      { name: 'storageLocation', type: 'org_level', description: 'Storage location scope' },
      { name: 'movementType', type: 'custom', description: 'Movement type restriction' },
    ],
  },
  {
    id: 'AUTH_HR_MASTER',
    name: 'HR Master Data Authorization',
    module: 'HR',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE'], description: 'Activity type' },
      { name: 'department', type: 'org_level', description: 'Department scope' },
      { name: 'infoType', type: 'custom', allowedValues: ['PERSONAL', 'SALARY', 'BENEFITS', 'ATTENDANCE', 'PERFORMANCE'], description: 'HR info type' },
    ],
  },
  {
    id: 'AUTH_QUALITY',
    name: 'Quality Management Authorization',
    module: 'QM',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['CREATE', 'CHANGE', 'DISPLAY', 'APPROVE', 'RELEASE', 'SIGN'], description: 'Activity type' },
      { name: 'plant', type: 'org_level', description: 'Plant scope' },
      { name: 'qualityArea', type: 'custom', allowedValues: ['BATCH_RELEASE', 'CAPA', 'DEVIATION', 'AUDIT', 'CHANGE_CONTROL', 'DOCUMENT_CONTROL'], description: 'Quality area' },
    ],
  },
  {
    id: 'AUTH_SYSTEM_ADMIN',
    name: 'System Administration Authorization',
    module: 'CORE',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE', 'CONFIGURE'], description: 'Activity type' },
      { name: 'area', type: 'custom', allowedValues: ['USERS', 'ROLES', 'CONFIG', 'TENANTS', 'MODULES', 'INTEGRATIONS', 'AUDIT'], description: 'Administration area' },
    ],
  },
  {
    id: 'AUTH_REPORT',
    name: 'Report Authorization',
    module: 'CORE',
    fields: [
      { name: 'activity', type: 'activity', allowedValues: ['DISPLAY', 'EXPORT', 'SCHEDULE'], description: 'Report activity' },
      { name: 'reportModule', type: 'custom', description: 'Module of the report' },
      { name: 'companyCode', type: 'org_level', description: 'Company code scope for data' },
    ],
  },
];

export const standardProfiles: AuthorizationProfileDef[] = [
  {
    id: 'PROFILE_FINANCE_CLERK',
    name: 'Finance Clerk',
    description: 'Can create and post standard financial documents within assigned company code',
    authorizations: [
      { objectId: 'AUTH_FINANCE_POST', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY', 'POST'], documentType: ['JE', 'AP', 'AR'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY'], reportModule: ['FI'] } },
    ],
  },
  {
    id: 'PROFILE_FINANCE_MANAGER',
    name: 'Finance Manager',
    description: 'Full financial accounting access including reversals and all document types',
    authorizations: [
      { objectId: 'AUTH_FINANCE_POST', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE', 'POST', 'REVERSE'], documentType: ['JE', 'AP', 'AR', 'SA', 'RE', 'AB'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY', 'EXPORT', 'SCHEDULE'], reportModule: ['FI', 'CO'] } },
    ],
  },
  {
    id: 'PROFILE_BUYER',
    name: 'Buyer / Procurement Officer',
    description: 'Can create and manage purchase orders within plant and amount limits',
    authorizations: [
      { objectId: 'AUTH_PURCHASE_ORDER', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY'], poType: ['STANDARD', 'FRAMEWORK'] } },
      { objectId: 'AUTH_INVENTORY', fieldValues: { activity: ['DISPLAY', 'GOODS_RECEIPT'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY'], reportModule: ['MM'] } },
    ],
  },
  {
    id: 'PROFILE_PROCUREMENT_MANAGER',
    name: 'Procurement Manager',
    description: 'Full procurement access including approvals and all PO types',
    authorizations: [
      { objectId: 'AUTH_PURCHASE_ORDER', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE', 'APPROVE', 'RELEASE'], poType: ['STANDARD', 'FRAMEWORK', 'SERVICE', 'CONSIGNMENT'] } },
      { objectId: 'AUTH_INVENTORY', fieldValues: { activity: ['DISPLAY', 'GOODS_RECEIPT', 'GOODS_ISSUE'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY', 'EXPORT'], reportModule: ['MM'] } },
    ],
  },
  {
    id: 'PROFILE_SALES_REP',
    name: 'Sales Representative',
    description: 'Can create sales orders and view customer data within sales org',
    authorizations: [
      { objectId: 'AUTH_SALES_ORDER', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY'], reportModule: ['SD'] } },
    ],
  },
  {
    id: 'PROFILE_WAREHOUSE_WORKER',
    name: 'Warehouse Worker',
    description: 'Can perform goods movements within assigned storage locations',
    authorizations: [
      { objectId: 'AUTH_INVENTORY', fieldValues: { activity: ['DISPLAY', 'GOODS_RECEIPT', 'GOODS_ISSUE', 'TRANSFER', 'PHYSICAL_COUNT'] } },
    ],
  },
  {
    id: 'PROFILE_QA_ANALYST',
    name: 'QA Analyst',
    description: 'Can create and manage quality records, perform testing',
    authorizations: [
      { objectId: 'AUTH_QUALITY', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY'], qualityArea: ['CAPA', 'DEVIATION', 'AUDIT'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY'], reportModule: ['QM'] } },
    ],
  },
  {
    id: 'PROFILE_QA_MANAGER',
    name: 'QA Manager',
    description: 'Full quality management access including approvals and batch release',
    authorizations: [
      { objectId: 'AUTH_QUALITY', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY', 'APPROVE', 'RELEASE', 'SIGN'], qualityArea: ['BATCH_RELEASE', 'CAPA', 'DEVIATION', 'AUDIT', 'CHANGE_CONTROL', 'DOCUMENT_CONTROL'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY', 'EXPORT', 'SCHEDULE'], reportModule: ['QM'] } },
    ],
  },
  {
    id: 'PROFILE_HR_SPECIALIST',
    name: 'HR Specialist',
    description: 'Can manage employee records within assigned departments',
    authorizations: [
      { objectId: 'AUTH_HR_MASTER', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY'], infoType: ['PERSONAL', 'ATTENDANCE'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY'], reportModule: ['HR'] } },
    ],
  },
  {
    id: 'PROFILE_HR_MANAGER',
    name: 'HR Manager',
    description: 'Full HR access including salary, benefits, and performance data',
    authorizations: [
      { objectId: 'AUTH_HR_MASTER', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE'], infoType: ['PERSONAL', 'SALARY', 'BENEFITS', 'ATTENDANCE', 'PERFORMANCE'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY', 'EXPORT', 'SCHEDULE'], reportModule: ['HR'] } },
    ],
  },
  {
    id: 'PROFILE_SYSTEM_ADMIN',
    name: 'System Administrator',
    description: 'Full system administration access',
    authorizations: [
      { objectId: 'AUTH_SYSTEM_ADMIN', fieldValues: { activity: ['CREATE', 'CHANGE', 'DISPLAY', 'DELETE', 'CONFIGURE'], area: ['USERS', 'ROLES', 'CONFIG', 'TENANTS', 'MODULES', 'INTEGRATIONS', 'AUDIT'] } },
      { objectId: 'AUTH_REPORT', fieldValues: { activity: ['DISPLAY', 'EXPORT', 'SCHEDULE'], reportModule: ['FI', 'CO', 'MM', 'SD', 'HR', 'QM'] } },
    ],
  },
];

export class AuthorizationService {
  private objects: Map<string, AuthorizationObjectDef> = new Map();
  private profiles: Map<string, AuthorizationProfileDef> = new Map();
  private userProfiles: Map<string, string[]> = new Map(); // userId → profileIds

  constructor() {
    for (const obj of standardAuthorizationObjects) {
      this.objects.set(obj.id, obj);
    }
    for (const prof of standardProfiles) {
      this.profiles.set(prof.id, prof);
    }
  }

  registerObject(obj: AuthorizationObjectDef): void {
    this.objects.set(obj.id, obj);
  }

  registerProfile(profile: AuthorizationProfileDef): void {
    this.profiles.set(profile.id, profile);
  }

  assignProfilesToUser(userId: string, profileIds: string[]): void {
    this.userProfiles.set(userId, profileIds);
  }

  checkAuthorization(
    userId: string,
    objectId: string,
    requestedValues: Record<string, string>,
    orgContext?: { companyCode?: string; plant?: string; salesOrg?: string; department?: string; storageLocation?: string }
  ): { authorized: boolean; reason?: string } {
    const profileIds = this.userProfiles.get(userId);
    if (!profileIds || profileIds.length === 0) {
      return { authorized: false, reason: 'No authorization profiles assigned' };
    }

    for (const profileId of profileIds) {
      const profile = this.profiles.get(profileId);
      if (!profile) continue;

      for (const auth of profile.authorizations) {
        if (auth.objectId !== objectId) continue;

        let allFieldsMatch = true;
        for (const [field, requestedValue] of Object.entries(requestedValues)) {
          const allowedValues = auth.fieldValues[field];
          if (!allowedValues) continue; // field not restricted in this authorization
          if (!allowedValues.includes(requestedValue)) {
            allFieldsMatch = false;
            break;
          }
        }

        if (allFieldsMatch) {
          // Check org level if applicable
          if (orgContext) {
            // In production, verify user's org assignments match the context
            // For now, pass through
          }
          return { authorized: true };
        }
      }
    }

    return { authorized: false, reason: `No matching authorization for object ${objectId}` };
  }

  getUserPermissions(userId: string): { objectId: string; fieldValues: Record<string, string[]> }[] {
    const profileIds = this.userProfiles.get(userId) || [];
    const permissions: { objectId: string; fieldValues: Record<string, string[]> }[] = [];

    for (const profileId of profileIds) {
      const profile = this.profiles.get(profileId);
      if (!profile) continue;
      permissions.push(...profile.authorizations);
    }

    return permissions;
  }

  getObject(id: string): AuthorizationObjectDef | undefined {
    return this.objects.get(id);
  }

  getProfile(id: string): AuthorizationProfileDef | undefined {
    return this.profiles.get(id);
  }

  getAllObjects(): AuthorizationObjectDef[] {
    return Array.from(this.objects.values());
  }

  getAllProfiles(): AuthorizationProfileDef[] {
    return Array.from(this.profiles.values());
  }
}

export const authorizationService = new AuthorizationService();
