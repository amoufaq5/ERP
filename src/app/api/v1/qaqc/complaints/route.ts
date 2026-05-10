import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  source: z.enum(['CUSTOMER', 'INTERNAL', 'REGULATORY']),
  status: z.enum(['RECEIVED', 'UNDER_INVESTIGATION', 'ROOT_CAUSE_IDENTIFIED', 'CAPA_INITIATED', 'CLOSED']).default('RECEIVED'),
  priority: z.string().optional(),
  product: z.string().optional(),
  batchNumber: z.string().optional(),
  description: z.string().optional(),
  investigation: z.string().optional(),
  rootCause: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'complaints',
  modelName: 'qComplaint',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'product', 'batchNumber'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
