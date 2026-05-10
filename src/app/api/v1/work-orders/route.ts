import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['PRODUCTION', 'MAINTENANCE', 'REWORK', 'QUALITY']).default('PRODUCTION'),
  status: z.enum(['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  productId: z.string().optional(),
  quantity: z.number().min(0).optional(),
  completedQuantity: z.number().min(0).default(0),
  scrapQuantity: z.number().min(0).default(0),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  assignedTo: z.string().optional(),
  warehouseId: z.string().optional(),
  bomId: z.string().optional(),
  notes: z.string().optional(),
});

export const { GET, POST } = createRouteHandlers({
  entity: 'work-orders',
  modelName: 'workOrder',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['number', 'title', 'description'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['product'],
});
