import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  type: z.enum(['INBOUND', 'OUTBOUND']),
  status: z.enum(['PLANNED', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED']).default('PLANNED'),
  origin: z.string().optional(),
  destination: z.string().optional(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  mode: z.enum(['OCEAN', 'AIR', 'GROUND', 'RAIL']).optional(),
  estimatedArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  items: z.any().optional(),
  cost: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'shipments',
  modelName: 'shipment',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'origin', 'destination', 'carrier', 'trackingNumber'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
