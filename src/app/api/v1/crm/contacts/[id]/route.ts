import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const updateContactSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  accountId: z.string().optional(),
  type: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'PARTNER', 'VENDOR', 'OTHER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  source: z.enum(['WEB', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'OTHER']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  website: z.string().url().optional(),
  linkedIn: z.string().url().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ownerId: z.string().optional(),
  doNotContact: z.boolean().optional(),
  lastContactedAt: z.string().datetime().optional(),
});

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'crm/contacts',
  modelName: 'contact',
  validationSchema: {
    update: updateContactSchema,
  },
  allowedIncludes: ['account', 'deals', 'activities', 'owner'],
});

export { GET, PATCH, DELETE };
