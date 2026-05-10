import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  protocol: z.string().optional(),
  equipment: z.string().optional(),
  area: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED']).optional(),
  method: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  results: z.string().optional(),
  validatedBy: z.string().optional(),
  validationDate: z.string().optional(),
  nextValidationDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'cleaning',
  modelName: 'cleaningValidation',
  validationSchema: { update: updateSchema },
  searchFields: ['protocol', 'equipment', 'area'],
});
