import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  area: z.string().min(1),
  parameter: z.enum(['TEMPERATURE', 'HUMIDITY', 'PARTICLE_COUNT', 'MICROBIAL', 'DIFFERENTIAL_PRESSURE']),
  value: z.number(),
  unit: z.string().min(1),
  minLimit: z.number().optional(),
  maxLimit: z.number().optional(),
  status: z.enum(['WITHIN_SPEC', 'OUT_OF_SPEC', 'ALERT']).default('WITHIN_SPEC'),
  readingDate: z.string().min(1),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'env-monitoring',
  modelName: 'environmentalMonitoring',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['area', 'equipment', 'recordedBy'],
  defaultSort: { field: 'readingDate', direction: 'desc' },
});
