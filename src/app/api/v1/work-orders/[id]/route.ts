import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['PRODUCTION', 'MAINTENANCE', 'REWORK', 'QUALITY']),
  status: z.enum(['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  productId: z.string().optional(),
  quantity: z.number().min(0).optional(),
  completedQuantity: z.number().min(0),
  scrapQuantity: z.number().min(0),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  assignedTo: z.string().optional(),
  warehouseId: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'work-orders',
  modelName: 'workOrder',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['product'],
});
