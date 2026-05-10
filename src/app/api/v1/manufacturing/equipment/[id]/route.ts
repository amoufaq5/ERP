import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  type: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'CALIBRATION', 'RETIRED']).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  calibrationDueDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'equipment',
  modelName: 'equipmentRecord',
  validationSchema: { update: updateSchema },
  searchFields: ['name', 'code', 'serialNumber'],
});
