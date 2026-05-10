import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'SUPPLIER']),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).default('PLANNED'),
  auditor: z.string().min(1),
  auditee: z.string().min(1),
  department: z.string().optional(),
  scheduledDate: z.string().min(1),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'audits',
  modelName: 'qAudit',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'auditor', 'auditee', 'department'],
  defaultSort: { field: 'scheduledDate', direction: 'desc' },
  allowedIncludes: ['findings'],
});
