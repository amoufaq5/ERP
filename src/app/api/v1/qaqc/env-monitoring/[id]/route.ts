import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  area: z.string().optional(),
  parameter: z.enum(['TEMPERATURE', 'HUMIDITY', 'PARTICLE_COUNT', 'MICROBIAL', 'DIFFERENTIAL_PRESSURE']).optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  minLimit: z.number().optional(),
  maxLimit: z.number().optional(),
  status: z.enum(['WITHIN_SPEC', 'OUT_OF_SPEC', 'ALERT']).optional(),
  readingDate: z.string().optional(),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'env-monitoring',
  modelName: 'environmentalMonitoring',
  validationSchema: { update: updateSchema },
  searchFields: ['area', 'equipment'],
});
