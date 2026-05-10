import { createRouteHandlers } from '@/lib/api/route-factory';
import { z } from 'zod';

const createSchema = z.object({
  area: z.string().min(1),
  parameter: z.string().optional(),
  value: z.number(),
  unit: z.string().min(1),
  minLimit: z.number().optional(),
  maxLimit: z.number().optional(),
  status: z.string().default('WITHIN_SPEC'),
  readingDate: z.string().optional(),
  recordedBy: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const updateSchema = createSchema.partial();

export const { GET, POST } = createRouteHandlers({
  entity: 'env-monitoring',
  modelName: 'environmentalMonitoring',
  validationSchema: { create: createSchema, update: updateSchema },
  searchFields: ['area', 'equipment', 'recordedBy'],
  defaultSort: { field: 'readingDate', direction: 'desc' },
  hooks: {
    beforeCreate: async (data) => {
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
      if (!data.parameter) data.parameter = 'TEMPERATURE';

      // Map status
      const statusMap: Record<string, string> = {
        pass: 'WITHIN_SPEC', within_spec: 'WITHIN_SPEC',
        alert: 'ALERT', action: 'OUT_OF_SPEC',
        fail: 'OUT_OF_SPEC', out_of_spec: 'OUT_OF_SPEC',
      };
      if (data.status && statusMap[data.status.toLowerCase()]) {
        data.status = statusMap[data.status.toLowerCase()];
      }

      // Handle readingDate
      if (data.readingDate) {
        data.readingDate = new Date(data.readingDate).toISOString();
      } else if (data.timestamp) {
        data.readingDate = new Date(data.timestamp).toISOString();
      } else {
        data.readingDate = new Date().toISOString();
      }

      // Remove non-Prisma fields
      const { pointId, locationId, timestamp, result, ...prismaData } = data;
      return prismaData;
    },
  },
});
