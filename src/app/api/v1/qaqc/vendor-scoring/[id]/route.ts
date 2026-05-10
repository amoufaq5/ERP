import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  period: z.string().optional(),
  qualityScore: z.number().optional(),
  deliveryScore: z.number().optional(),
  priceScore: z.number().optional(),
  serviceScore: z.number().optional(),
  overallScore: z.number().optional(),
  evaluatedBy: z.string().optional(),
  evaluationDate: z.string().optional(),
  notes: z.string().optional(),
}).passthrough().partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'vendor-scoring',
  modelName: 'vendorScore',
  validationSchema: { update: updateSchema },
  searchFields: ['vendorName', 'vendorId'],
  hooks: {
    beforeUpdate: async (_id, data) => {
      // Remove non-Prisma fields
      const { vendorCode, contactPerson, contactEmail, category, country,
        qualificationStatus, nextReviewDate, quality, delivery, compliance,
        commercial, responsiveness, audits, certifications, incidents,
        complianceScore, commercialScore, status, ...prismaData } = data;
      return prismaData;
    },
  },
});
