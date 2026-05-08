export type WebhookEvent =
  | 'doctor.created'
  | 'doctor.updated'
  | 'visit.created'
  | 'visit.completed'
  | 'plan.submitted'
  | 'plan.approved'
  | 'plan.rejected'
  | 'request.created'
  | 'request.approved'
  | 'request.rejected'
  | 'expense.submitted'
  | 'expense.approved'
  | 'lead.created'
  | 'lead.converted'
  | 'account.created'
  | 'user.created';

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  description?: string;
  headers?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: unknown;
  statusCode?: number;
  response?: string;
  error?: string;
  attempts: number;
  nextRetryAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface WebhookPayload<T = unknown> {
  event: WebhookEvent;
  timestamp: string;
  tenantId?: string;
  data: T;
  metadata?: Record<string, unknown>;
}

export type DeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface EventDescription {
  description: string;
  category: 'CRM' | 'Sales' | 'Operations';
}

export const EVENT_DESCRIPTIONS: Record<WebhookEvent, EventDescription> = {
  'doctor.created': {
    description: 'A new doctor record has been created',
    category: 'CRM',
  },
  'doctor.updated': {
    description: 'A doctor record has been updated',
    category: 'CRM',
  },
  'visit.created': {
    description: 'A new visit has been scheduled',
    category: 'CRM',
  },
  'visit.completed': {
    description: 'A visit has been marked as completed',
    category: 'CRM',
  },
  'plan.submitted': {
    description: 'A sales plan has been submitted for approval',
    category: 'Sales',
  },
  'plan.approved': {
    description: 'A sales plan has been approved',
    category: 'Sales',
  },
  'plan.rejected': {
    description: 'A sales plan has been rejected',
    category: 'Sales',
  },
  'request.created': {
    description: 'A new request has been created',
    category: 'Operations',
  },
  'request.approved': {
    description: 'A request has been approved',
    category: 'Operations',
  },
  'request.rejected': {
    description: 'A request has been rejected',
    category: 'Operations',
  },
  'expense.submitted': {
    description: 'An expense report has been submitted',
    category: 'Operations',
  },
  'expense.approved': {
    description: 'An expense report has been approved',
    category: 'Operations',
  },
  'lead.created': {
    description: 'A new lead has been created',
    category: 'CRM',
  },
  'lead.converted': {
    description: 'A lead has been converted to a customer',
    category: 'CRM',
  },
  'account.created': {
    description: 'A new account has been created',
    category: 'CRM',
  },
  'user.created': {
    description: 'A new user has been created',
    category: 'Operations',
  },
};
