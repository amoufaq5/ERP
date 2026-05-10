import { z } from 'zod';
import { createRouteHandlers } from '@/lib/api/route-factory';

const journalLineSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  debit: z.number().nonnegative('Debit must be non-negative').default(0),
  credit: z.number().nonnegative('Credit must be non-negative').default(0),
  description: z.string().optional(),
  costCenterId: z.string().optional(),
});

const createJournalEntrySchema = z.object({
  entryNumber: z.string().min(1, 'Entry number is required'),
  date: z.string().datetime({ message: 'Invalid date format' }),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  status: z.enum(['DRAFT', 'POSTED', 'VOID']).default('DRAFT'),
  lines: z.array(journalLineSchema).min(2, 'At least two journal lines are required'),
  createdById: z.string().optional(),
  reversalOf: z.string().optional(),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: 'Total debits must equal total credits', path: ['lines'] },
);

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

const { GET, POST } = createRouteHandlers({
  entity: 'finance/journal-entries',
  modelName: 'journalEntry',
  validationSchema: {
    create: createJournalEntrySchema,
    update: updateJournalEntrySchema,
  },
  searchFields: ['entryNumber', 'description', 'reference'],
  defaultSort: { field: 'date', direction: 'desc' },
  allowedIncludes: ['lines', 'createdBy'],
});

export { GET, POST };
