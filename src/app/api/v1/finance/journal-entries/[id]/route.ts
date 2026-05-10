import { z } from 'zod';
import { createRouteHandlersWithId } from '@/lib/api/route-factory';

const journalLineSchema = z.object({
  id: z.string().optional(),
  accountId: z.string().min(1, 'Account ID is required'),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  description: z.string().optional(),
  costCenterId: z.string().optional(),
});

const updateJournalEntrySchema = z.object({
  date: z.string().datetime().optional(),
  description: z.string().min(1).optional(),
  reference: z.string().optional(),
  lines: z.array(journalLineSchema).min(2).optional(),
}).refine(
  (data) => {
    if (!data.lines) return true;
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: 'Total debits must equal total credits', path: ['lines'] },
);

const { GET, PATCH, DELETE } = createRouteHandlersWithId({
  entity: 'finance/journal-entries',
  modelName: 'journalEntry',
  validationSchema: {
    update: updateJournalEntrySchema,
  },
  allowedIncludes: ['lines', 'createdBy'],
});

export { GET, PATCH, DELETE };
