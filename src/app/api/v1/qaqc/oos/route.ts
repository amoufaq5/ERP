import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['INITIATED', 'PHASE1_LAB', 'PHASE2_FULL', 'CONCLUDED', 'CLOSED']).default('INITIATED'),
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
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'oos',
  modelName: 'oOSInvestigation',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'title', 'product', 'batchNumber', 'testName'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
