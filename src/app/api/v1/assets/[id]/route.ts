import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  category: z.enum(['IT', 'FURNITURE', 'VEHICLE', 'EQUIPMENT', 'BUILDING', 'SOFTWARE', 'OTHER']),
  status: z.enum(['ACTIVE', 'IN_MAINTENANCE', 'RETIRED', 'DISPOSED']),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  depreciationMethod: z.enum(['STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION']).optional(),
  usefulLifeYears: z.number().min(0).optional(),
  salvageValue: z.number().min(0).optional(),
  location: z.string().optional(),
  assignedTo: z.string().optional(),
  departmentId: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'assets',
  modelName: 'asset',
  validationSchema: { update: updateSchema },
  allowedIncludes: ['maintenance'],
});
