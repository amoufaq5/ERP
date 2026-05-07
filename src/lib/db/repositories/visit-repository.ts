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
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  protected get model() {
    return this.prisma.visit
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
    // TODO: implement when DB is available
    // const where: Prisma.VisitWhereInput = { repId }
    // if (dateFrom || dateTo) {
    //   where.dateTime = {}
    //   if (dateFrom) where.dateTime.gte = dateFrom
    //   if (dateTo) where.dateTime.lte = dateTo
    // }
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: { dateTime: 'desc' },
    //   include: { doctor: true },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
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
    // TODO: implement when DB is available
    // const where: Prisma.VisitWhereInput = {
    //   dateTime: { gte: dateFrom, lte: dateTo },
    // }
    // if (filters?.repId) where.repId = filters.repId
    // if (filters?.doctorId) where.doctorId = filters.doctorId
    // if (filters?.buId) where.buId = filters.buId
    // if (filters?.status) where.status = filters.status as any
    // if (filters?.session) where.session = filters.session as any
    // if (filters?.isUnplanned !== undefined) where.isUnplanned = filters.isUnplanned
    //
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: this.buildSort(sort) ?? { dateTime: 'desc' },
    //   include: { doctor: true, rep: true },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find all visits for a specific doctor.
   */
  async findByDoctor(
    doctorId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Visit>> {
    // TODO: implement when DB is available
    // const where = { doctorId }
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: { dateTime: 'desc' },
    //   include: { rep: true },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
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
    // TODO: implement when DB is available
    // const visits = await this.model.findMany({
    //   where: {
    //     repId,
    //     dateTime: { gte: dateFrom, lte: dateTo },
    //   },
    // })
    // // Aggregate in memory or use groupBy
    // const byStatus = await this.model.groupBy({
    //   by: ['status'],
    //   where: { repId, dateTime: { gte: dateFrom, lte: dateTo } },
    //   _count: true,
    // })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find visits linked to a specific weekly plan.
   */
  async findByPlan(planId: string): Promise<Visit[]> {
    // TODO: implement when DB is available
    // return this.model.findMany({
    //   where: { planId },
    //   orderBy: { dateTime: 'asc' },
    //   include: { doctor: true },
    // })
    throw new Error('Not implemented: database not yet provisioned')
  }
}
