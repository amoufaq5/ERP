import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  number: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(['SOP', 'PROTOCOL', 'FORM', 'REPORT', 'SPECIFICATION']).optional(),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'EFFECTIVE', 'OBSOLETE']).optional(),
  version: z.string().optional(),
  department: z.string().optional(),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  approver: z.string().optional(),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
}).partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'document-control',
  modelName: 'qDocument',
  validationSchema: { update: updateSchema },
  searchFields: ['number', 'title', 'department'],
  allowedIncludes: ['versions'],
});
