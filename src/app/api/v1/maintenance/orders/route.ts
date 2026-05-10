import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE']),
  description: z.string().min(1),
  scheduledDate: z.string().min(1),
  completedDate: z.string().optional(),
  cost: z.number().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'maintenance-orders',
  modelName: 'assetMaintenance',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['description', 'type'],
  defaultSort: { field: 'scheduledDate', direction: 'desc' },
  allowedIncludes: ['asset'],
});
