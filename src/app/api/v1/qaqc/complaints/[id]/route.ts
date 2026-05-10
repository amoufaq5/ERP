import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  source: z.enum(['CUSTOMER', 'INTERNAL', 'REGULATORY']).optional(),
  status: z.enum(['RECEIVED', 'UNDER_INVESTIGATION', 'ROOT_CAUSE_IDENTIFIED', 'CAPA_INITIATED', 'CLOSED']).optional(),
  priority: z.string().optional(),
  product: z.string().optional(),
  batchNumber: z.string().optional(),
  description: z.string().optional(),
  investigation: z.string().optional(),
  rootCause: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
  closedDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'complaints',
  modelName: 'qComplaint',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number', 'description', 'product'],
});
