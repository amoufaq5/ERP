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
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  protected get model() {
    return this.prisma.marketRequest
  }

  /**
   * Find all pending market requests (optionally scoped by BU or approver).
   */
  async findPending(
    buId?: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<MarketRequest>> {
    // TODO: implement when DB is available
    // const where: Prisma.MarketRequestWhereInput = {
    //   status: 'PENDING',
    // }
    // if (buId) where.buId = buId
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    //   include: { requestedBy: true, doctor: true },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
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
    // TODO: implement when DB is available
    // const where: Prisma.MarketRequestWhereInput = {
    //   requestedById: userId,
    // }
    // if (filters?.type) where.type = filters.type as any
    // if (filters?.status) where.status = filters.status as any
    // if (filters?.priority) where.priority = filters.priority as any
    //
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: this.buildSort(sort) ?? { createdAt: 'desc' },
    //   include: { doctor: true },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Approve a market request. Updates status and records the approver.
   */
  async approve(
    id: string,
    approvedById: string,
    comment?: string,
  ): Promise<MarketRequest> {
    // TODO: implement when DB is available
    // return this.prisma.$transaction(async (tx) => {
    //   const request = await tx.marketRequest.update({
    //     where: { id },
    //     data: {
    //       status: 'APPROVED',
    //       approvedById,
    //       approvedAt: new Date(),
    //     },
    //   })
    //
    //   // Create approval log entry
    //   await tx.approvalLog.create({
    //     data: {
    //       entityType: 'MARKET_REQUEST',
    //       entityId: id,
    //       action: 'APPROVED',
    //       fromStatus: 'PENDING',
    //       toStatus: 'APPROVED',
    //       performedById: approvedById,
    //       comment,
    //       businessUnitId: request.buId ?? undefined,
    //     },
    //   })
    //
    //   // Create notification for requester
    //   await tx.notification.create({
    //     data: {
    //       userId: request.requestedById,
    //       title: 'Market Request Approved',
    //       message: `Your ${request.type} request has been approved.`,
    //       type: 'SUCCESS',
    //       module: 'CRM',
    //     },
    //   })
    //
    //   return request
    // })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Reject a market request. Updates status and records the reason.
   */
  async reject(
    id: string,
    rejectedById: string,
    reason: string,
  ): Promise<MarketRequest> {
    // TODO: implement when DB is available
    // return this.prisma.$transaction(async (tx) => {
    //   const request = await tx.marketRequest.update({
    //     where: { id },
    //     data: {
    //       status: 'REJECTED',
    //       approvedById: rejectedById,
    //       rejectionReason: reason,
    //     },
    //   })
    //
    //   // Create approval log entry
    //   await tx.approvalLog.create({
    //     data: {
    //       entityType: 'MARKET_REQUEST',
    //       entityId: id,
    //       action: 'REJECTED',
    //       fromStatus: 'PENDING',
    //       toStatus: 'REJECTED',
    //       performedById: rejectedById,
    //       comment: reason,
    //       businessUnitId: request.buId ?? undefined,
    //     },
    //   })
    //
    //   // Notify requester
    //   await tx.notification.create({
    //     data: {
    //       userId: request.requestedById,
    //       title: 'Market Request Rejected',
    //       message: `Your ${request.type} request was rejected: ${reason}`,
    //       type: 'WARNING',
    //       module: 'CRM',
    //     },
    //   })
    //
    //   return request
    // })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Search/filter market requests with full criteria.
   */
  async search(
    filters: MarketRequestFilters,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): Promise<PaginatedResult<MarketRequest>> {
    // TODO: implement when DB is available
    // const where: Prisma.MarketRequestWhereInput = {}
    // if (filters.type) where.type = filters.type as any
    // if (filters.status) where.status = filters.status as any
    // if (filters.priority) where.priority = filters.priority as any
    // if (filters.requestedById) where.requestedById = filters.requestedById
    // if (filters.buId) where.buId = filters.buId
    // if (filters.dateFrom || filters.dateTo) {
    //   where.createdAt = {}
    //   if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
    //   if (filters.dateTo) where.createdAt.lte = filters.dateTo
    // }
    //
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: this.buildSort(sort) ?? { createdAt: 'desc' },
    //   include: { requestedBy: true, doctor: true, approvedBy: true },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }
}
