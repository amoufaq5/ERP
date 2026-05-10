import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  warehouseId: z.string().optional(),
  type: z.enum(['RECEIVING', 'STORAGE', 'PICKING', 'PACKING', 'SHIPPING', 'QUARANTINE', 'COLD_CHAIN']).optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  capacity: z.number().int().min(0).optional(),
  currentOccupancy: z.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'warehouse-zones',
  modelName: 'warehouseZone',
  validationSchema: { update: updateSchema },
  searchFields: ['name', 'code'],
});
