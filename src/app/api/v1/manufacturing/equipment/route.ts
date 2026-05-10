import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'CALIBRATION', 'RETIRED']).default('OPERATIONAL'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  calibrationDueDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'equipment',
  modelName: 'equipmentRecord',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['name', 'code', 'type', 'manufacturer', 'serialNumber', 'location'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
