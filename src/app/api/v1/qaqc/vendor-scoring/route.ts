import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  vendorId: z.string().optional(),
  vendorName: z.string().min(1),
  period: z.string().optional(),
  qualityScore: z.number().optional().default(0),
  deliveryScore: z.number().optional().default(0),
  priceScore: z.number().optional().default(0),
  serviceScore: z.number().optional().default(0),
  overallScore: z.number().optional().default(0),
  evaluatedBy: z.string().optional(),
  evaluationDate: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'vendor-scoring',
  modelName: 'vendorScore',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['vendorName', 'vendorId', 'period'],
  defaultSort: { field: 'createdAt', direction: 'desc' },
  hooks: {
    beforeCreate: async (data) => {
      // Map vendorCode to vendorId
      if (!data.vendorId) {
        data.vendorId = data.vendorCode ?? `V-${Date.now()}`;
      }
      // Default period
      if (!data.period) {
        const now = new Date();
        data.period = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
      }
      // Calculate overallScore if not set
      if (!data.overallScore || data.overallScore === 0) {
        const q = data.qualityScore ?? 0;
        const d = data.deliveryScore ?? 0;
        const p = data.priceScore ?? 0;
        const s = data.serviceScore ?? 0;
        data.overallScore = Math.round((q + d + p + s) / 4);
      }

      // Remove non-Prisma fields
      const { vendorCode, contactPerson, contactEmail, category, country,
        qualificationStatus, nextReviewDate, quality, delivery, compliance,
        commercial, responsiveness, audits, certifications, incidents,
        complianceScore, commercialScore, status, ...prismaData } = data;
      return prismaData;
    },
  },
});
