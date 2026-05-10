import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  assetId: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE']).optional(),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  cost: z.number().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'maintenance-orders',
  modelName: 'assetMaintenance',
  validationSchema: { update: updateSchema },
  searchFields: ['description', 'type'],
  allowedIncludes: ['asset'],
});
