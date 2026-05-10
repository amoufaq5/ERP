import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'RESPONSES_RECEIVED', 'EVALUATING', 'AWARDED', 'CANCELLED']),
  type: z.enum(['STANDARD', 'BLANKET', 'COMPETITIVE', 'SOLE_SOURCE']),
  requestedBy: z.string().optional(),
  departmentId: z.string().optional(),
  dueDate: z.string(),
  closingDate: z.string().optional(),
  currency: z.string(),
  estimatedValue: z.number().min(0).optional(),
  evaluationCriteria: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'rfq',
  modelName: 'rFQ',
  validationSchema: { update: updateSchema },
});
