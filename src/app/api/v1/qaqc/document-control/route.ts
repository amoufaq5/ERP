import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['SOP', 'PROTOCOL', 'FORM', 'REPORT', 'SPECIFICATION']),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EFFECTIVE', 'OBSOLETE']).default('DRAFT'),
  version: z.string().default('1.0'),
  department: z.string().optional(),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  approver: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'document-control',
  modelName: 'qDocument',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['number', 'title', 'department', 'author'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  allowedIncludes: ['versions'],
});
