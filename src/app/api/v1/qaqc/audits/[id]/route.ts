import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['INTERNAL', 'EXTERNAL', 'SUPPLIER']).optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']).optional(),
  auditor: z.string().optional(),
  auditee: z.string().optional(),
  department: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  score: z.number().optional(),
  notes: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'audits',
  modelName: 'qAudit',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'auditor', 'auditee'],
  allowedIncludes: ['findings'],
});
