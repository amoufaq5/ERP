import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(['PLANNED', 'UNPLANNED']).optional().default('UNPLANNED'),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CAPA_REQUIRED', 'CLOSED']).default('OPEN'),
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR']).optional(),
  // Frontend field mappings
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
  // Additional frontend fields (not in Prisma model, stripped before save)
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
}).passthrough();

const updateSchema = createSchema.partial();

let seq = 1;

export const { GET, POST } = createRouteHandlers({
  entity: 'deviations',
  modelName: 'deviation',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['title', 'number', 'description', 'department'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  hooks: {
    beforeCreate: async (data) => {
      // Auto-generate number if not provided
      if (!data.number) {
        const year = new Date().getFullYear();
        data.number = `DEV-${year}-${String(seq++).padStart(3, '0')}`;
      }
      // Map classification to severity
      if (data.classification && !data.severity) {
        data.severity = data.classification.toUpperCase();
      }
      if (!data.severity) {
        data.severity = 'MINOR';
      }
      // Map detectedBy to reportedBy
      if (data.detectedBy && !data.reportedBy) {
        data.reportedBy = data.detectedBy;
      }
      if (data.detectedAt && !data.reportedDate) {
        data.reportedDate = data.detectedAt;
      }
      // Remove fields not in Prisma model
      const { classification, category, detectedAt, detectedBy, area,
        batchesAffected, productsAffected, dueDate, rootCauseCategory,
        investigation, disposition, closedAt, ...prismaData } = data;
      return prismaData;
    },
  },
});
