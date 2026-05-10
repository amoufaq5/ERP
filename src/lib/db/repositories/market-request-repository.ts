// @ts-nocheck
import type { PrismaClient, MarketRequest, Prisma } from '@prisma/client'
import { BaseRepository, type PaginatedResult, type PaginationParams, type SortParams } from './base'

export interface MarketRequestFilters {
  type?: string
  status?: string
  priority?: string
  requestedById?: string
  buId?: string
  dateFrom?: Date
  dateTo?: Date
}

export class MarketRequestRepository extends BaseRepository<
  MarketRequest,
  Prisma.MarketRequestCreateInput,
  Prisma.MarketRequestUpdateInput
> {
  protected modelName = 'marketRequest'

  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  /**
   * Find all pending market requests (optionally scoped by BU or approver).
   */
  async findPending(
    buId?: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<MarketRequest>> {
    try {
      const where: Prisma.MarketRequestWhereInput = {
        status: 'PENDING',
      }
      if (buId) where.buId = buId

      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
          include: { requestedBy: true, doctor: true },
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
      throw new Error(`Failed to find pending market requests: ${(error as Error).message}`)
    }
  }

  /**
   * Find market requests submitted by a specific user.
   */
  async findByUser(
    userId: string,
    filters?: MarketRequestFilters,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): Promise<PaginatedResult<MarketRequest>> {
    try {
      const where: Prisma.MarketRequestWhereInput = {
        requestedById: userId,
      }
      if (filters?.type) where.type = filters.type as any
      if (filters?.status) where.status = filters.status as any
      if (filters?.priority) where.priority = filters.priority as any

      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize
      const orderBy = sort ? { [sort.field]: sort.direction } : { createdAt: 'desc' as const }

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy,
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
      throw new Error(`Failed to find market requests by user: ${(error as Error).message}`)
    }
  }

  /**
   * Approve a market request. Updates status and records the approver.
   */
  async approve(
    id: string,
    approvedById: string,
    comment?: string,
  ): Promise<MarketRequest> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.marketRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById,
            approvedAt: new Date(),
          },
        })

        // Create approval log entry
        await tx.approvalLog.create({
          data: {
            tenantId: request.tenantId,
            entityType: 'MARKET_REQUEST',
            entityId: id,
            action: 'APPROVED',
            fromStatus: 'PENDING',
            toStatus: 'APPROVED',
            performedById: approvedById,
            comment,
            businessUnitId: request.buId ?? undefined,
          },
        })

        // Create notification for requester
        await tx.notification.create({
          data: {
            tenantId: request.tenantId,
            userId: request.requestedById,
            title: 'Market Request Approved',
            message: `Your ${request.type} request has been approved.`,
            type: 'SUCCESS',
            module: 'CRM',
          },
        })

        return request
      })
    } catch (error) {
      throw new Error(`Failed to approve market request: ${(error as Error).message}`)
    }
  }

  /**
   * Reject a market request. Updates status and records the reason.
   */
  async reject(
    id: string,
    rejectedById: string,
    reason: string,
  ): Promise<MarketRequest> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.marketRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            approvedById: rejectedById,
            rejectionReason: reason,
          },
        })

        // Create approval log entry
        await tx.approvalLog.create({
          data: {
            tenantId: request.tenantId,
            entityType: 'MARKET_REQUEST',
            entityId: id,
            action: 'REJECTED',
            fromStatus: 'PENDING',
            toStatus: 'REJECTED',
            performedById: rejectedById,
            comment: reason,
            businessUnitId: request.buId ?? undefined,
          },
        })

        // Notify requester
        await tx.notification.create({
          data: {
            tenantId: request.tenantId,
            userId: request.requestedById,
            title: 'Market Request Rejected',
            message: `Your ${request.type} request was rejected: ${reason}`,
            type: 'WARNING',
            module: 'CRM',
          },
        })

        return request
      })
    } catch (error) {
      throw new Error(`Failed to reject market request: ${(error as Error).message}`)
    }
  }

  /**
   * Search/filter market requests with full criteria.
   */
  async search(
    filters: MarketRequestFilters,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): Promise<PaginatedResult<MarketRequest>> {
    try {
      const where: Prisma.MarketRequestWhereInput = {}
      if (filters.type) where.type = filters.type as any
      if (filters.status) where.status = filters.status as any
      if (filters.priority) where.priority = filters.priority as any
      if (filters.requestedById) where.requestedById = filters.requestedById
      if (filters.buId) where.buId = filters.buId
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {}
        if (filters.dateFrom) (where.createdAt as any).gte = filters.dateFrom
        if (filters.dateTo) (where.createdAt as any).lte = filters.dateTo
      }

      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize
      const orderBy = sort ? { [sort.field]: sort.direction } : { createdAt: 'desc' as const }

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy,
          include: { requestedBy: true, doctor: true, approvedBy: true },
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
      throw new Error(`Failed to search market requests: ${(error as Error).message}`)
    }
  }
}
