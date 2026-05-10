import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateDealSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  actualCloseDate: z.string().datetime().optional(),
  source: z.enum(['WEB', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'PARTNER', 'INBOUND', 'OUTBOUND', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  nextStep: z.string().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'crm/deals',
  modelName: 'deal',
  validationSchema: {
    update: updateDealSchema,
  },
  allowedIncludes: ['contact', 'account', 'owner', 'activities'],
});

export { GET, PATCH, DELETE };
