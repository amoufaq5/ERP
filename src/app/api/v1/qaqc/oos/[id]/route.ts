import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['INITIATED', 'PHASE1_LAB', 'PHASE2_FULL', 'CONCLUDED', 'CLOSED']).optional(),
  batchNumber: z.string().optional(),
  product: z.string().optional(),
  testName: z.string().optional(),
  specification: z.string().optional(),
  result: z.string().optional(),
  assignedTo: z.string().optional(),
  phase1Findings: z.string().optional(),
  phase2Findings: z.string().optional(),
  conclusion: z.string().optional(),
  capaId: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'oos',
  modelName: 'oOSInvestigation',
  validationSchema: { update: updateSchema },
  searchFields: ['number', 'title', 'product', 'batchNumber'],
});
