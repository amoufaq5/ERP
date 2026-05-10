import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['DOCUMENT', 'PROCESS', 'EQUIPMENT', 'SYSTEM']),
  status: z.enum(['INITIATED', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED', 'CLOSED', 'REJECTED']).default('INITIATED'),
  priority: z.string().optional(),
  requestedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  impactAssessment: z.string().optional(),
  implementationPlan: z.string().optional(),
  effectiveDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'change-control',
  modelName: 'changeControl',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'title', 'description', 'requestedBy'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
});
