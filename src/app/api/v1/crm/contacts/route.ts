import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  accountId: z.string().optional(),
  type: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'PARTNER', 'VENDOR', 'OTHER']).default('LEAD'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
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
  doNotContact: z.boolean().default(false),
  lastContactedAt: z.string().datetime().optional(),
});

const updateContactSchema = createContactSchema.partial();

const { GET, POST } = createRouteHandlers({
  entity: 'crm/contacts',
  modelName: 'contact',
  validationSchema: {
    create: createContactSchema,
    update: updateContactSchema,
  },
  searchFields: ['firstName', 'lastName', 'email', 'company', 'phone'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['account', 'deals', 'activities', 'owner'],
});

export { GET, POST };
