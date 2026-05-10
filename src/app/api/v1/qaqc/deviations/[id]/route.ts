import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['PLANNED', 'UNPLANNED']).optional(),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CAPA_REQUIRED', 'CLOSED']).optional(),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']).optional(),
  classification: z.enum(['critical', 'major', 'minor']).optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  rootCause: z.string().optional(),
  impactAssessment: z.string().optional(),
  immediateAction: z.string().optional(),
  capaId: z.string().optional(),
  reportedBy: z.string().optional(),
  reportedDate: z.string().optional(),
  closedDate: z.string().optional(),
  // Additional frontend fields
  detectedAt: z.string().optional(),
  detectedBy: z.string().optional(),
  area: z.string().optional(),
  batchesAffected: z.array(z.string()).optional(),
  productsAffected: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  rootCauseCategory: z.string().optional(),
  investigation: z.any().optional(),
  disposition: z.string().optional(),
  closedAt: z.string().optional(),
  impactOnProduct: z.string().optional(),
}).passthrough().partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'deviations',
  modelName: 'deviation',
  validationSchema: { update: updateSchema },
  searchFields: ['title', 'number', 'description'],
  hooks: {
    beforeUpdate: async (_id, data) => {
      // Map classification to severity
      if (data.classification) {
        data.severity = data.classification.toUpperCase();
      }
      // Map status from frontend format to Prisma enum
      const statusMap: Record<string, string> = {
        'open': 'OPEN',
        'investigation': 'UNDER_INVESTIGATION',
        'root-cause': 'UNDER_INVESTIGATION',
        'capa-required': 'CAPA_REQUIRED',
        'capa-implementation': 'CAPA_REQUIRED',
        'effectiveness-check': 'CAPA_REQUIRED',
        'closed': 'CLOSED',
      };
      if (data.status && statusMap[data.status]) {
        data.status = statusMap[data.status];
      }
      // Remove fields not in Prisma model
      const { classification, category, detectedAt, detectedBy, area,
        batchesAffected, productsAffected, dueDate, rootCauseCategory,
        investigation, disposition, closedAt, impactOnProduct, ...prismaData } = data;
      return prismaData;
    },
  },
});
