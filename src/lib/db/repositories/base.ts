// @ts-nocheck
import { PrismaClient } from '@prisma/client'

// ─── Pagination types ────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ─── Filter & Sort types ─────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc'

export interface SortParams {
  field: string
  direction: SortDirection
}

export interface FilterParams {
  [key: string]: string | number | boolean | string[] | undefined
}

// ─── Base Repository ─────────────────────────────────────────────────────────

/**
 * Generic base repository providing standard CRUD operations.
 * Concrete repositories extend this class and add domain-specific queries.
 *
 * Type parameter `T` represents the Prisma model type.
 * Type parameter `CreateInput` represents the create input type.
 * Type parameter `UpdateInput` represents the update input type.
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * The Prisma delegate for this model (e.g., prisma.user, prisma.doctor).
   * Must be implemented by concrete repositories.
   */
  protected abstract get model(): any

  /**
   * Find a single record by its ID.
   */
  async findById(id: string): Promise<T | null> {
    // TODO: implement when DB is available
    // return this.model.findUnique({ where: { id } })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find all records with optional pagination.
   */
  async findAll(pagination?: PaginationParams): Promise<PaginatedResult<T>> {
    // TODO: implement when DB is available
    // const total = await this.model.count()
    // const data = await this.model.findMany({
    //   skip: pagination ? (pagination.page - 1) * pagination.pageSize : undefined,
    //   take: pagination?.pageSize,
    // })
    // return {
    //   data,
    //   page: pagination?.page ?? 1,
    //   pageSize: pagination?.pageSize ?? total,
    //   total,
    //   totalPages: pagination ? Math.ceil(total / pagination.pageSize) : 1,
    // }
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Create a new record.
   */
  async create(data: CreateInput): Promise<T> {
    // TODO: implement when DB is available
    // return this.model.create({ data })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Update an existing record by ID.
   */
  async update(id: string, data: UpdateInput): Promise<T> {
    // TODO: implement when DB is available
    // return this.model.update({ where: { id }, data })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Delete a record by ID.
   */
  async delete(id: string): Promise<T> {
    // TODO: implement when DB is available
    // return this.model.delete({ where: { id } })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Count records matching optional filter criteria.
   */
  async count(where?: Record<string, unknown>): Promise<number> {
    // TODO: implement when DB is available
    // return this.model.count({ where })
    throw new Error('Not implemented: database not yet provisioned')
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Build a pagination skip/take object from PaginationParams.
   */
  protected buildPagination(params: PaginationParams): { skip: number; take: number } {
    return {
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }
  }

  /**
   * Build an orderBy clause from SortParams.
   */
  protected buildSort(sort?: SortParams): Record<string, SortDirection> | undefined {
    if (!sort) return undefined
    return { [sort.field]: sort.direction }
  }

  /**
   * Construct a PaginatedResult from raw query results.
   */
  protected toPaginatedResult<R>(
    data: R[],
    total: number,
    pagination: PaginationParams,
  ): PaginatedResult<R> {
    return {
      data,
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    }
  }
}
