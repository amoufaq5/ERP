import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['XBAR_R', 'XBAR_S', 'P_CHART', 'C_CHART', 'U_CHART', 'INDIVIDUAL_MR']).optional(),
  parameter: z.string().optional(),
  product: z.string().optional(),
  specification: z.string().optional(),
  ucl: z.number().optional(),
  lcl: z.number().optional(),
  centerLine: z.number().optional(),
  status: z.enum(['ACTIVE', 'IN_CONTROL', 'OUT_OF_CONTROL']).optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'spc',
  modelName: 'sPCChart',
  validationSchema: { update: updateSchema },
  searchFields: ['name', 'parameter', 'product'],
  allowedIncludes: ['dataPoints'],
});
