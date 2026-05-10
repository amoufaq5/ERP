import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  warehouseId: z.string().min(1),
  type: z.enum(['RECEIVING', 'STORAGE', 'PICKING', 'PACKING', 'SHIPPING', 'QUARANTINE', 'COLD_CHAIN']),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  capacity: z.number().int().min(0),
  currentOccupancy: z.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).default('ACTIVE'),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'warehouse-zones',
  modelName: 'warehouseZone',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['name', 'code'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
