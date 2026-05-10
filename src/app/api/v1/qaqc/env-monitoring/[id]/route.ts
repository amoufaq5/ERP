import { createRouteHandlersWithId } from '@/lib/api/route-factory';
import { z } from 'zod';

const updateSchema = z.object({
  area: z.string().optional(),
  parameter: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  minLimit: z.number().optional(),
  maxLimit: z.number().optional(),
  status: z.string().optional(),
  readingDate: z.string().optional(),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
}).passthrough().partial();

export const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'env-monitoring',
  modelName: 'environmentalMonitoring',
  validationSchema: { update: updateSchema },
  searchFields: ['area', 'equipment'],
  hooks: {
    beforeUpdate: async (_id, data) => {
      // Map parameter to Prisma enum
      const paramMap: Record<string, string> = {
        temperature: 'TEMPERATURE', humidity: 'HUMIDITY',
        'particle-count': 'PARTICLE_COUNT', particle_count: 'PARTICLE_COUNT',
        microbial: 'MICROBIAL',
        'differential-pressure': 'DIFFERENTIAL_PRESSURE', differential_pressure: 'DIFFERENTIAL_PRESSURE',
      };
      if (data.parameter && paramMap[data.parameter.toLowerCase()]) {
        data.parameter = paramMap[data.parameter.toLowerCase()];
      }

      // Map status
      const statusMap: Record<string, string> = {
        pass: 'WITHIN_SPEC', within_spec: 'WITHIN_SPEC',
        alert: 'ALERT', action: 'OUT_OF_SPEC',
        fail: 'OUT_OF_SPEC', out_of_spec: 'OUT_OF_SPEC',
      };
      if (data.status && statusMap[data.status.toLowerCase()]) {
        data.status = statusMap[data.status.toLowerCase()];
      }

      // Remove non-Prisma fields
      const { pointId, locationId, timestamp, result, ...prismaData } = data;
      return prismaData;
    },
  },
});
