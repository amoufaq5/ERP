import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  system: z.enum(['PURIFIED_WATER', 'WFI', 'CLEAN_STEAM']).optional(),
  point: z.string().optional(),
  parameter: z.enum(['TOC', 'CONDUCTIVITY', 'PH', 'ENDOTOXIN', 'MICROBIAL']).optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  limit: z.number().optional(),
  status: z.enum(['PASS', 'FAIL', 'ALERT']).optional(),
  readingDate: z.string().optional(),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'water-system',
  modelName: 'waterSystemReading',
  validationSchema: { update: updateSchema },
  searchFields: ['point', 'equipment'],
});
