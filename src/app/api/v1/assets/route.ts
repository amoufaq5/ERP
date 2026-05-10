import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  category: z.enum(['IT', 'FURNITURE', 'VEHICLE', 'EQUIPMENT', 'BUILDING', 'SOFTWARE', 'OTHER']).default('EQUIPMENT'),
  status: z.enum(['ACTIVE', 'IN_MAINTENANCE', 'RETIRED', 'DISPOSED']).default('ACTIVE'),
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
});

export const { GET, POST } = createRouteHandlers({
  entity: 'assets',
  modelName: 'asset',
  validationSchema: { create: createSchema, update: createSchema.partial() },
  searchFields: ['name', 'code', 'serialNumber', 'manufacturer'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['maintenance'],
});
