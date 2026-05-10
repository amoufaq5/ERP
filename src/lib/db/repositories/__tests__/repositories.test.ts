import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoctorRepository } from '../doctor-repository';
import { VisitRepository } from '../visit-repository';
import { MarketRequestRepository } from '../market-request-repository';
import { UserRepository } from '../user-repository';

// ---------------------------------------------------------------------------
// Mock Prisma Client factory
// ---------------------------------------------------------------------------

function createMockModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ id: 'new-1' }),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({ id: '1' }),
    delete: vi.fn().mockResolvedValue({ id: '1' }),
    groupBy: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _avg: { durationMin: 30 }, _count: { _all: 5 } }),
  };
}

function createMockPrisma() {
  const doctorModel = createMockModel();
  const visitModel = createMockModel();
  const marketRequestModel = createMockModel();
  const userModel = createMockModel();
  const approvalLogModel = createMockModel();
  const notificationModel = createMockModel();

  const prisma: any = {
    doctor: doctorModel,
    visit: visitModel,
    marketRequest: marketRequestModel,
    user: userModel,
    approvalLog: approvalLogModel,
    notification: notificationModel,
    $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => {
      return fn(prisma);
    }),
  };

  return { prisma, doctorModel, visitModel, marketRequestModel, userModel, approvalLogModel, notificationModel };
}

// ===========================================================================
// DoctorRepository
// ===========================================================================

describe('DoctorRepository', () => {
  let prisma: any;
  let doctorModel: ReturnType<typeof createMockModel>;
  let repo: DoctorRepository;

  beforeEach(() => {
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    doctorModel = mocks.doctorModel;
    repo = new DoctorRepository(prisma);
  });

  // ── Base CRUD (inherited) ────────────────────────────────────────────

  describe('findById (inherited)', () => {
    it('finds a doctor by id and tenant', async () => {
      const doctor = { id: 'd1', name: 'Dr. Smith', tenantId: 't1' };
      doctorModel.findFirst.mockResolvedValue(doctor);

      const result = await repo.findById('t1', 'd1');
      expect(result).toEqual(doctor);
      expect(doctorModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'd1', tenantId: 't1' },
      });
    });

    it('returns null when not found', async () => {
      doctorModel.findFirst.mockResolvedValue(null);
      const result = await repo.findById('t1', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create (inherited)', () => {
    it('creates a doctor with tenant id', async () => {
      const input = { name: 'Dr. New' };
      const created = { id: 'new-1', ...input, tenantId: 't1' };
      doctorModel.create.mockResolvedValue(created);

      const result = await repo.create('t1', input as any);
      expect(result).toEqual(created);
      expect(doctorModel.create).toHaveBeenCalledWith({
        data: { ...input, tenantId: 't1' },
      });
    });
  });

  describe('update (inherited)', () => {
    it('updates a doctor after verifying tenant', async () => {
      const existing = { id: 'd1', name: 'Dr. Smith', tenantId: 't1' };
      doctorModel.findFirst.mockResolvedValue(existing);
      doctorModel.update.mockResolvedValue({ ...existing, name: 'Dr. Jones' });

      const result = await repo.update('t1', 'd1', { name: 'Dr. Jones' } as any);
      expect(result.name).toBe('Dr. Jones');
    });

    it('throws when record not found for tenant', async () => {
      doctorModel.findFirst.mockResolvedValue(null);
      await expect(repo.update('t1', 'd1', {} as any))
        .rejects.toThrow('Record not found or access denied');
    });
  });

  describe('delete (inherited)', () => {
    it('deletes a doctor after verifying tenant', async () => {
      doctorModel.findFirst.mockResolvedValue({ id: 'd1', tenantId: 't1' });
      doctorModel.delete.mockResolvedValue({ id: 'd1' });

      const result = await repo.delete('t1', 'd1');
      expect(result).toEqual({ id: 'd1' });
    });

    it('throws when record not found', async () => {
      doctorModel.findFirst.mockResolvedValue(null);
      await expect(repo.delete('t1', 'd1'))
        .rejects.toThrow('Record not found or access denied');
    });
  });

  // ── findAllScoped ──────────────────────────────────────────────────────

  describe('findAllScoped', () => {
    it('returns all doctors for ADMIN role (no scope)', async () => {
      const doctors = [{ id: 'd1', name: 'Dr. A' }, { id: 'd2', name: 'Dr. B' }];
      doctorModel.findMany.mockResolvedValue(doctors);
      doctorModel.count.mockResolvedValue(2);

      const result = await repo.findAllScoped('admin-1', 'ADMIN');
      expect(result.data).toEqual(doctors);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('scopes to assigned rep for MEDICAL_REP role', async () => {
      doctorModel.findMany.mockResolvedValue([]);
      doctorModel.count.mockResolvedValue(0);

      await repo.findAllScoped('rep-1', 'MEDICAL_REP');

      expect(doctorModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedRepId: 'rep-1' }),
        }),
      );
    });

    it('scopes by BU manager for BUM role', async () => {
      doctorModel.findMany.mockResolvedValue([]);
      doctorModel.count.mockResolvedValue(0);

      await repo.findAllScoped('bum-1', 'BUM');

      expect(doctorModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessUnit: { managerId: 'bum-1' },
          }),
        }),
      );
    });

    it('applies filters', async () => {
      doctorModel.findMany.mockResolvedValue([]);
      doctorModel.count.mockResolvedValue(0);

      await repo.findAllScoped('admin-1', 'ADMIN', {
        classification: 'A',
        isKOL: true,
        search: 'Smith',
      });

      expect(doctorModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classification: 'A',
            isKOL: true,
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'Smith', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });

    it('supports custom pagination', async () => {
      doctorModel.findMany.mockResolvedValue([]);
      doctorModel.count.mockResolvedValue(100);

      const result = await repo.findAllScoped('admin-1', 'ADMIN', undefined, { page: 3, pageSize: 10 });

      expect(doctorModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.totalPages).toBe(10);
    });

    it('throws with descriptive error on failure', async () => {
      doctorModel.findMany.mockRejectedValue(new Error('DB error'));

      await expect(repo.findAllScoped('admin-1', 'ADMIN'))
        .rejects.toThrow('Failed to find scoped doctors: DB error');
    });
  });

  // ── findByBU ───────────────────────────────────────────────────────────

  describe('findByBU', () => {
    it('finds doctors by business unit', async () => {
      const doctors = [{ id: 'd1' }];
      doctorModel.findMany.mockResolvedValue(doctors);
      doctorModel.count.mockResolvedValue(1);

      const result = await repo.findByBU('bu-1');
      expect(result.data).toEqual(doctors);
      expect(doctorModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buId: 'bu-1' },
        }),
      );
    });
  });

  // ── findByRep ──────────────────────────────────────────────────────────

  describe('findByRep', () => {
    it('finds doctors assigned to a rep', async () => {
      doctorModel.findMany.mockResolvedValue([{ id: 'd1' }]);
      doctorModel.count.mockResolvedValue(1);

      const result = await repo.findByRep('rep-1');
      expect(result.data).toHaveLength(1);
      expect(doctorModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedRepId: 'rep-1' },
        }),
      );
    });
  });

  // ── search ─────────────────────────────────────────────────────────────

  describe('search', () => {
    it('searches across name, hospital, city, specialty', async () => {
      doctorModel.findMany.mockResolvedValue([]);
      doctorModel.count.mockResolvedValue(0);

      await repo.search('cardio');

      expect(doctorModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { specialty: { contains: 'cardio', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  // ── findKOLs ───────────────────────────────────────────────────────────

  describe('findKOLs', () => {
    it('finds KOL doctors', async () => {
      doctorModel.findMany.mockResolvedValue([{ id: 'd1', isKOL: true }]);

      const result = await repo.findKOLs();
      expect(result).toHaveLength(1);
      expect(doctorModel.findMany).toHaveBeenCalledWith({
        where: { isKOL: true },
        orderBy: { classification: 'asc' },
      });
    });

    it('filters by BU when provided', async () => {
      doctorModel.findMany.mockResolvedValue([]);

      await repo.findKOLs('bu-1');
      expect(doctorModel.findMany).toHaveBeenCalledWith({
        where: { isKOL: true, buId: 'bu-1' },
        orderBy: { classification: 'asc' },
      });
    });
  });

  // ── findDueForVisit ────────────────────────────────────────────────────

  describe('findDueForVisit', () => {
    it('returns doctors never visited', async () => {
      doctorModel.findMany.mockResolvedValue([
        { id: 'd1', lastVisitAt: null, visitFrequency: 2 },
      ]);

      const result = await repo.findDueForVisit('rep-1');
      expect(result).toHaveLength(1);
    });

    it('returns doctors overdue for visit', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      doctorModel.findMany.mockResolvedValue([
        { id: 'd1', lastVisitAt: thirtyDaysAgo, visitFrequency: 2 },
      ]);

      const result = await repo.findDueForVisit('rep-1');
      // visitFrequency=2 means every 15 days; 30 days ago is overdue
      expect(result).toHaveLength(1);
    });

    it('excludes recently visited doctors', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      doctorModel.findMany.mockResolvedValue([
        { id: 'd1', lastVisitAt: yesterday, visitFrequency: 2 },
      ]);

      const result = await repo.findDueForVisit('rep-1');
      expect(result).toHaveLength(0);
    });
  });
});

// ===========================================================================
// VisitRepository
// ===========================================================================

describe('VisitRepository', () => {
  let prisma: any;
  let visitModel: ReturnType<typeof createMockModel>;
  let repo: VisitRepository;

  beforeEach(() => {
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    visitModel = mocks.visitModel;
    repo = new VisitRepository(prisma);
  });

  describe('findByRep', () => {
    it('finds visits by rep id', async () => {
      visitModel.findMany.mockResolvedValue([{ id: 'v1', repId: 'rep-1' }]);
      visitModel.count.mockResolvedValue(1);

      const result = await repo.findByRep('rep-1');
      expect(result.data).toHaveLength(1);
      expect(visitModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repId: 'rep-1' },
          orderBy: { dateTime: 'desc' },
        }),
      );
    });

    it('applies date range filters', async () => {
      visitModel.findMany.mockResolvedValue([]);
      visitModel.count.mockResolvedValue(0);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      await repo.findByRep('rep-1', from, to);

      expect(visitModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            repId: 'rep-1',
            dateTime: { gte: from, lte: to },
          }),
        }),
      );
    });

    it('throws on error', async () => {
      visitModel.findMany.mockRejectedValue(new Error('DB fail'));
      await expect(repo.findByRep('rep-1'))
        .rejects.toThrow('Failed to find visits by rep: DB fail');
    });
  });

  describe('findByDateRange', () => {
    it('queries visits within date range', async () => {
      visitModel.findMany.mockResolvedValue([]);
      visitModel.count.mockResolvedValue(0);

      const from = new Date('2024-01-01');
      const to = new Date('2024-06-30');
      await repo.findByDateRange(from, to);

      expect(visitModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateTime: { gte: from, lte: to },
          }),
        }),
      );
    });

    it('applies optional filters', async () => {
      visitModel.findMany.mockResolvedValue([]);
      visitModel.count.mockResolvedValue(0);

      const from = new Date('2024-01-01');
      const to = new Date('2024-06-30');
      await repo.findByDateRange(from, to, {
        repId: 'rep-1',
        status: 'COMPLETED',
        isUnplanned: true,
      });

      expect(visitModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            repId: 'rep-1',
            status: 'COMPLETED',
            isUnplanned: true,
          }),
        }),
      );
    });
  });

  describe('findByDoctor', () => {
    it('finds visits for a specific doctor', async () => {
      visitModel.findMany.mockResolvedValue([]);
      visitModel.count.mockResolvedValue(0);

      const result = await repo.findByDoctor('doc-1');
      expect(visitModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { doctorId: 'doc-1' },
        }),
      );
      expect(result.page).toBe(1);
    });
  });

  describe('getRepStats', () => {
    it('returns aggregated statistics', async () => {
      visitModel.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // planned
        .mockResolvedValueOnce(2); // unplanned
      visitModel.groupBy
        .mockResolvedValueOnce([
          { status: 'COMPLETED', _count: 7 },
          { status: 'SCHEDULED', _count: 3 },
        ])
        .mockResolvedValueOnce([
          { session: 'AM', _count: 6 },
          { session: 'PM', _count: 4 },
        ]);
      visitModel.aggregate.mockResolvedValue({
        _avg: { durationMin: 25 },
        _count: { _all: 10 },
      });

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      const stats = await repo.getRepStats('rep-1', from, to);

      expect(stats.total).toBe(10);
      expect(stats.byStatus).toEqual({ COMPLETED: 7, SCHEDULED: 3 });
      expect(stats.bySession).toEqual({ AM: 6, PM: 4 });
      expect(stats.planned).toBe(8);
      expect(stats.unplanned).toBe(2);
      expect(stats.avgDuration).toBe(25);
    });
  });

  describe('findByPlan', () => {
    it('finds visits linked to a plan', async () => {
      visitModel.findMany.mockResolvedValue([{ id: 'v1', planId: 'plan-1' }]);

      const result = await repo.findByPlan('plan-1');
      expect(result).toHaveLength(1);
      expect(visitModel.findMany).toHaveBeenCalledWith({
        where: { planId: 'plan-1' },
        orderBy: { dateTime: 'asc' },
        include: { doctor: true },
      });
    });
  });
});

// ===========================================================================
// MarketRequestRepository
// ===========================================================================

describe('MarketRequestRepository', () => {
  let prisma: any;
  let marketRequestModel: ReturnType<typeof createMockModel>;
  let repo: MarketRequestRepository;

  beforeEach(() => {
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    marketRequestModel = mocks.marketRequestModel;
    repo = new MarketRequestRepository(prisma);
  });

  describe('findPending', () => {
    it('finds pending market requests', async () => {
      marketRequestModel.findMany.mockResolvedValue([{ id: 'mr1', status: 'PENDING' }]);
      marketRequestModel.count.mockResolvedValue(1);

      const result = await repo.findPending();
      expect(result.data).toHaveLength(1);
      expect(marketRequestModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        }),
      );
    });

    it('filters by BU when provided', async () => {
      marketRequestModel.findMany.mockResolvedValue([]);
      marketRequestModel.count.mockResolvedValue(0);

      await repo.findPending('bu-1');
      expect(marketRequestModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING', buId: 'bu-1' },
        }),
      );
    });
  });

  describe('findByUser', () => {
    it('finds requests by user', async () => {
      marketRequestModel.findMany.mockResolvedValue([]);
      marketRequestModel.count.mockResolvedValue(0);

      await repo.findByUser('user-1');
      expect(marketRequestModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { requestedById: 'user-1' },
        }),
      );
    });

    it('applies filters and sorting', async () => {
      marketRequestModel.findMany.mockResolvedValue([]);
      marketRequestModel.count.mockResolvedValue(0);

      await repo.findByUser(
        'user-1',
        { type: 'SAMPLE', status: 'APPROVED' },
        { page: 2, pageSize: 20 },
        { field: 'createdAt', direction: 'asc' },
      );

      expect(marketRequestModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requestedById: 'user-1',
            type: 'SAMPLE',
            status: 'APPROVED',
          }),
          skip: 20,
          take: 20,
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('approve', () => {
    it('approves a request in a transaction', async () => {
      const request = {
        id: 'mr1',
        tenantId: 't1',
        type: 'SAMPLE',
        requestedById: 'user-1',
        buId: 'bu-1',
        status: 'APPROVED',
      };
      marketRequestModel.update.mockResolvedValue(request);
      prisma.approvalLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await repo.approve('mr1', 'approver-1', 'Looks good');

      expect(result).toEqual(request);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(marketRequestModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mr1' },
          data: expect.objectContaining({
            status: 'APPROVED',
            approvedById: 'approver-1',
          }),
        }),
      );
    });

    it('throws on failure', async () => {
      prisma.$transaction.mockRejectedValue(new Error('TX fail'));
      await expect(repo.approve('mr1', 'approver-1'))
        .rejects.toThrow('Failed to approve market request: TX fail');
    });
  });

  describe('reject', () => {
    it('rejects a request with reason', async () => {
      const request = {
        id: 'mr1',
        tenantId: 't1',
        type: 'SAMPLE',
        requestedById: 'user-1',
        buId: 'bu-1',
        status: 'REJECTED',
      };
      marketRequestModel.update.mockResolvedValue(request);
      prisma.approvalLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await repo.reject('mr1', 'approver-1', 'Budget exceeded');

      expect(result).toEqual(request);
      expect(marketRequestModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectionReason: 'Budget exceeded',
          }),
        }),
      );
    });
  });

  describe('search', () => {
    it('applies full filter criteria', async () => {
      marketRequestModel.findMany.mockResolvedValue([]);
      marketRequestModel.count.mockResolvedValue(0);

      const from = new Date('2024-01-01');
      const to = new Date('2024-06-30');
      await repo.search({
        type: 'SAMPLE',
        status: 'PENDING',
        priority: 'HIGH',
        requestedById: 'user-1',
        buId: 'bu-1',
        dateFrom: from,
        dateTo: to,
      });

      expect(marketRequestModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'SAMPLE',
            status: 'PENDING',
            priority: 'HIGH',
            requestedById: 'user-1',
            buId: 'bu-1',
            createdAt: { gte: from, lte: to },
          }),
        }),
      );
    });
  });
});

// ===========================================================================
// UserRepository
// ===========================================================================

describe('UserRepository', () => {
  let prisma: any;
  let userModel: ReturnType<typeof createMockModel>;
  let repo: UserRepository;

  beforeEach(() => {
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    userModel = mocks.userModel;
    repo = new UserRepository(prisma);
  });

  describe('findByEmail', () => {
    it('finds user by email', async () => {
      const user = { id: 'u1', email: 'test@example.com' };
      userModel.findUnique.mockResolvedValue(user);

      const result = await repo.findByEmail('test@example.com');
      expect(result).toEqual(user);
      expect(userModel.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('returns null when not found', async () => {
      userModel.findUnique.mockResolvedValue(null);
      const result = await repo.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findByRole', () => {
    it('finds users by role with pagination', async () => {
      userModel.findMany.mockResolvedValue([{ id: 'u1', role: 'ADMIN' }]);
      userModel.count.mockResolvedValue(1);

      const result = await repo.findByRole('ADMIN');
      expect(result.data).toHaveLength(1);
      expect(userModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'ADMIN' },
        }),
      );
    });

    it('supports custom pagination', async () => {
      userModel.findMany.mockResolvedValue([]);
      userModel.count.mockResolvedValue(50);

      const result = await repo.findByRole('ADMIN', { page: 2, pageSize: 10 });
      expect(result.totalPages).toBe(5);
      expect(userModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('getReportsOf', () => {
    it('finds users reporting to a manager', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1', name: 'Sub' }]);

      const result = await repo.getReportsOf('mgr-1');
      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          buMemberships: {
            some: { businessUnit: { managerId: 'mgr-1' } },
          },
        },
        include: { buMemberships: true },
      });
    });
  });

  describe('search', () => {
    it('applies search across name and email', async () => {
      userModel.findMany.mockResolvedValue([]);
      userModel.count.mockResolvedValue(0);

      await repo.search({ search: 'john' });

      expect(userModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('applies role and department filters', async () => {
      userModel.findMany.mockResolvedValue([]);
      userModel.count.mockResolvedValue(0);

      await repo.search({ role: 'ADMIN', department: 'Sales', isActive: true });

      expect(userModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'ADMIN',
            department: 'Sales',
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('findByDepartment', () => {
    it('finds active users in a department', async () => {
      userModel.findMany.mockResolvedValue([{ id: 'u1', department: 'IT' }]);

      const result = await repo.findByDepartment('IT');
      expect(result).toHaveLength(1);
      expect(userModel.findMany).toHaveBeenCalledWith({
        where: { department: 'IT', isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });
});
