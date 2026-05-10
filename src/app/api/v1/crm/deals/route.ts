import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createDealSchema = z.object({
  title: z.string().min(1, 'Deal title is required').max(300),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  stage: z.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).default('LEAD'),
  amount: z.number().nonnegative('Deal amount must be non-negative').optional(),
  currency: z.string().length(3).default('USD'),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  actualCloseDate: z.string().datetime().optional(),
  source: z.enum(['WEB', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'PARTNER', 'INBOUND', 'OUTBOUND', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  description: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  nextStep: z.string().optional(),
});

const updateDealSchema = createDealSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'crm/deals',
  modelName: 'deal',
  validationSchema: {
    create: createDealSchema,
    update: updateDealSchema,
  },
  searchFields: ['title', 'description', 'notes', 'nextStep'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['contact', 'account', 'owner', 'activities'],
});

export { GET, POST };
