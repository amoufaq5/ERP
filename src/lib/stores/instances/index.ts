import { createApiStore } from '../api-store-factory';
import { createQualityApiStore } from '../quality-api-store-factory';

// Example: Product store backed by API
export const useProductStore = createApiStore<{
  id: string;
  name: string;
  sku: string;
  category: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}>({
  entityName: 'product',
  apiBasePath: '/api/v1/products',
  defaultPageSize: 25,
  enableLocalFallback: true,
  localStorageKey: 'erp-products',
});

// Example: CAPA store backed by API with quality actions
export const useCAPAStore = createQualityApiStore<{
  id: string;
  tenantId: string;
  number: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  source: string;
  description: string;
  rootCause: string;
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}>({
  entityName: 'capa',
  apiBasePath: '/api/v1/qaqc/capa',
  statusTransitions: {
    'OPEN': ['INVESTIGATION'],
    'INVESTIGATION': ['ACTION_PLAN', 'CLOSED'],
    'ACTION_PLAN': ['IMPLEMENTATION'],
    'IMPLEMENTATION': ['VERIFICATION'],
    'VERIFICATION': ['CLOSED', 'IMPLEMENTATION'],
    'CLOSED': [],
  },
  requiresSignature: ['CLOSED'],
});

// Example: Deviation store
export const useDeviationStore = createQualityApiStore<{
  id: string;
  tenantId: string;
  number: string;
  title: string;
  type: string;
  status: string;
  severity: string;
  department: string;
  description: string;
  rootCause: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}>({
  entityName: 'deviation',
  apiBasePath: '/api/v1/qaqc/deviations',
  statusTransitions: {
    'OPEN': ['UNDER_INVESTIGATION'],
    'UNDER_INVESTIGATION': ['CAPA_REQUIRED', 'CLOSED'],
    'CAPA_REQUIRED': ['CLOSED'],
    'CLOSED': [],
  },
  requiresSignature: ['CLOSED'],
});
