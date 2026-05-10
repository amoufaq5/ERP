// @ts-nocheck
import type { PrismaClient, Visit, Prisma } from '@prisma/client'
import { BaseRepository, type PaginatedResult, type PaginationParams, type SortParams } from './base'

export interface VisitFilters {
  repId?: string
  doctorId?: string
  buId?: string
  status?: string
  session?: string
  type?: string
  dateFrom?: Date
  dateTo?: Date
  isUnplanned?: boolean
}

export class VisitRepository extends BaseRepository<Visit, Prisma.VisitCreateInput, Prisma.VisitUpdateInput> {
  protected modelName = 'visit'

  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  /**
   * Find visits by medical rep, optionally within a date range.
   */
  async findByRep(
    repId: string,
    dateFrom?: Date,
    dateTo?: Date,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Visit>> {
    try {
      const where: Prisma.VisitWhereInput = { repId }
      if (dateFrom || dateTo) {
        where.dateTime = {}
        if (dateFrom) (where.dateTime as any).gte = dateFrom
        if (dateTo) (where.dateTime as any).lte = dateTo
      }

      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy: { dateTime: 'desc' },
          include: { doctor: true },
        }),
        this.model.count({ where }),
      ])

      return {
        data,
        total,
        page: pag.page,
        pageSize: pag.pageSize,
        totalPages: Math.ceil(total / pag.pageSize),
      }
    } catch (error) {
      throw new Error(`Failed to find visits by rep: ${(error as Error).message}`)
    }
  }

  /**
   * Find visits within a date range, across all reps.
   */
  async findByDateRange(
    dateFrom: Date,
    dateTo: Date,
    filters?: VisitFilters,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): Promise<PaginatedResult<Visit>> {
    try {
      const where: Prisma.VisitWhereInput = {
        dateTime: { gte: dateFrom, lte: dateTo },
      }
      if (filters?.repId) where.repId = filters.repId
      if (filters?.doctorId) where.doctorId = filters.doctorId
      if (filters?.buId) where.buId = filters.buId
      if (filters?.status) where.status = filters.status as any
      if (filters?.session) where.session = filters.session as any
      if (filters?.type) where.type = filters.type as any
      if (filters?.isUnplanned !== undefined) where.isUnplanned = filters.isUnplanned

      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize
      const orderBy = sort ? { [sort.field]: sort.direction } : { dateTime: 'desc' as const }

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy,
          include: { doctor: true, rep: true },
        }),
        this.model.count({ where }),
      ])

      return {
        data,
        total,
        page: pag.page,
        pageSize: pag.pageSize,
        totalPages: Math.ceil(total / pag.pageSize),
      }
    } catch (error) {
      throw new Error(`Failed to find visits by date range: ${(error as Error).message}`)
    }
  }

  /**
   * Find all visits for a specific doctor.
   */
  async findByDoctor(
    doctorId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Visit>> {
    try {
      const where: Prisma.VisitWhereInput = { doctorId }
      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy: { dateTime: 'desc' },
          include: { rep: true },
        }),
        this.model.count({ where }),
      ])

      return {
        data,
        total,
        page: pag.page,
        pageSize: pag.pageSize,
        totalPages: Math.ceil(total / pag.pageSize),
      }
    } catch (error) {
      throw new Error(`Failed to find visits by doctor: ${(error as Error).message}`)
    }
  }

  /**
   * Get visit statistics for a rep in a given period.
   * Returns counts grouped by status, session, type, etc.
   */
  async getRepStats(
    repId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    total: number
    byStatus: Record<string, number>
    bySession: Record<string, number>
    planned: number
    unplanned: number
    avgDuration: number
  }> {
    try {
      const baseWhere: Prisma.VisitWhereInput = {
        repId,
        dateTime: { gte: dateFrom, lte: dateTo },
      }

      const [visits, byStatusGroup, bySessionGroup, avgResult] = await Promise.all([
        this.model.count({ where: baseWhere }),
        this.model.groupBy({
          by: ['status'],
          where: baseWhere,
          _count: true,
        }),
        this.model.groupBy({
          by: ['session'],
          where: baseWhere,
          _count: true,
        }),
        this.model.aggregate({
          where: baseWhere,
          _avg: { durationMin: true },
          _count: { _all: true },
        }),
      ])

      const byStatus: Record<string, number> = {}
      for (const row of byStatusGroup) {
        byStatus[row.status] = row._count
      }

      const bySession: Record<string, number> = {}
      for (const row of bySessionGroup) {
        bySession[row.session] = row._count
      }

      const [plannedCount, unplannedCount] = await Promise.all([
        this.model.count({ where: { ...baseWhere, isUnplanned: false } }),
        this.model.count({ where: { ...baseWhere, isUnplanned: true } }),
      ])

      return {
        total: visits,
        byStatus,
        bySession,
        planned: plannedCount,
        unplanned: unplannedCount,
        avgDuration: avgResult._avg.durationMin ?? 0,
      }
    } catch (error) {
      throw new Error(`Failed to get rep stats: ${(error as Error).message}`)
    }
  }

  /**
   * Find visits linked to a specific weekly plan.
   */
  async findByPlan(planId: string): Promise<Visit[]> {
    try {
      return this.model.findMany({
        where: { planId },
        orderBy: { dateTime: 'asc' },
        include: { doctor: true },
      })
    } catch (error) {
      throw new Error(`Failed to find visits by plan: ${(error as Error).message}`)
    }
  }
}
