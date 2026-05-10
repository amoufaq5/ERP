import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'RESPONSES_RECEIVED', 'EVALUATING', 'AWARDED', 'CANCELLED']).default('DRAFT'),
  type: z.enum(['STANDARD', 'BLANKET', 'COMPETITIVE', 'SOLE_SOURCE']).default('STANDARD'),
  requestedBy: z.string().optional(),
  departmentId: z.string().optional(),
  dueDate: z.string(),
  closingDate: z.string().optional(),
  currency: z.string().default('EGP'),
  estimatedValue: z.number().min(0).optional(),
  evaluationCriteria: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'rfq',
  modelName: 'rFQ',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['number', 'title', 'description'],
  defaultSort: { field: 'dueDate', direction: 'asc' },
});
