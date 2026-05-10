import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  protocol: z.string().min(1),
  equipment: z.string().min(1),
  area: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED']).default('PENDING'),
  method: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  results: z.string().optional(),
  validatedBy: z.string().optional(),
  validationDate: z.string().optional(),
  nextValidationDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'cleaning',
  modelName: 'cleaningValidation',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['protocol', 'equipment', 'area', 'method'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
