import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  system: z.enum(['PURIFIED_WATER', 'WFI', 'CLEAN_STEAM']),
  point: z.string().min(1),
  parameter: z.enum(['TOC', 'CONDUCTIVITY', 'PH', 'ENDOTOXIN', 'MICROBIAL']),
  value: z.number(),
  unit: z.string().min(1),
  limit: z.number(),
  status: z.enum(['PASS', 'FAIL', 'ALERT']).default('PASS'),
  readingDate: z.string().min(1),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'water-system',
  modelName: 'waterSystemReading',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['point', 'equipment', 'recordedBy'],
  defaultSort: { field: 'readingDate', direction: 'desc' },
});
