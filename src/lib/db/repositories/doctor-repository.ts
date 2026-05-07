// @ts-nocheck
import type { PrismaClient, Doctor, Prisma } from '@prisma/client'
import { BaseRepository, type PaginatedResult, type PaginationParams, type SortParams } from './base'

export interface DoctorFilters {
  buId?: string
  assignedRepId?: string
  classification?: string
  specialty?: string
  isKOL?: boolean
  buyingLadderStage?: string
  brickId?: string
  search?: string // name, hospital, city
}

export class DoctorRepository extends BaseRepository<Doctor, Prisma.DoctorCreateInput, Prisma.DoctorUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  protected get model() {
    return this.prisma.doctor
  }

  /**
   * Find all doctors with data-scoping based on user role.
   * - ADMIN/NSM: all doctors
   * - BUM: doctors in their business units
   * - MARKETEER/DM: doctors in their assigned territories
   * - MEDICAL_REP: only their assigned doctors
   */
  async findAllScoped(
    userId: string,
    userRole: string,
    filters?: DoctorFilters,
    pagination?: PaginationParams,
    sort?: SortParams,
  ): Promise<PaginatedResult<Doctor>> {
    // TODO: implement when DB is available
    // const where: Prisma.DoctorWhereInput = {}
    //
    // // Role-based scoping
    // switch (userRole) {
    //   case 'MEDICAL_REP':
    //     where.assignedRepId = userId
    //     break
    //   case 'DISTRICT_MANAGER':
    //     // Doctors assigned to reps under this DM
    //     where.assignedRep = {
    //       buMemberships: { some: { businessUnit: { /* DM's scope */ } } }
    //     }
    //     break
    //   case 'BUM':
    //     // All doctors in BUM's business units
    //     where.businessUnit = { managerId: userId }
    //     break
    //   // ADMIN, NSM: no scope restriction
    // }
    //
    // // Apply filters
    // if (filters?.buId) where.buId = filters.buId
    // if (filters?.assignedRepId) where.assignedRepId = filters.assignedRepId
    // if (filters?.classification) where.classification = filters.classification as any
    // if (filters?.specialty) where.specialty = filters.specialty
    // if (filters?.isKOL !== undefined) where.isKOL = filters.isKOL
    // if (filters?.brickId) where.brickId = filters.brickId
    // if (filters?.search) {
    //   where.OR = [
    //     { name: { contains: filters.search, mode: 'insensitive' } },
    //     { hospital: { contains: filters.search, mode: 'insensitive' } },
    //     { city: { contains: filters.search, mode: 'insensitive' } },
    //   ]
    // }
    //
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: this.buildSort(sort) ?? { name: 'asc' },
    //   include: { assignedRep: true, businessUnit: true },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find doctors belonging to a specific business unit.
   */
  async findByBU(
    buId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Doctor>> {
    // TODO: implement when DB is available
    // const where = { buId }
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: { name: 'asc' },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find doctors assigned to a specific medical rep.
   */
  async findByRep(
    repId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Doctor>> {
    // TODO: implement when DB is available
    // const where = { assignedRepId: repId }
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: { classification: 'asc' },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Search doctors by name, hospital, city, or specialty.
   */
  async search(
    query: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Doctor>> {
    // TODO: implement when DB is available
    // const where: Prisma.DoctorWhereInput = {
    //   OR: [
    //     { name: { contains: query, mode: 'insensitive' } },
    //     { hospital: { contains: query, mode: 'insensitive' } },
    //     { city: { contains: query, mode: 'insensitive' } },
    //     { specialty: { contains: query, mode: 'insensitive' } },
    //   ],
    // }
    // const total = await this.model.count({ where })
    // const pag = pagination ?? { page: 1, pageSize: 50 }
    // const data = await this.model.findMany({
    //   where,
    //   ...this.buildPagination(pag),
    //   orderBy: { name: 'asc' },
    // })
    // return this.toPaginatedResult(data, total, pag)
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Find Key Opinion Leaders (KOLs) optionally filtered by BU.
   */
  async findKOLs(buId?: string): Promise<Doctor[]> {
    // TODO: implement when DB is available
    // const where: Prisma.DoctorWhereInput = { isKOL: true }
    // if (buId) where.buId = buId
    // return this.model.findMany({ where, orderBy: { classification: 'asc' } })
    throw new Error('Not implemented: database not yet provisioned')
  }

  /**
   * Get doctors due for a visit (based on visitFrequency and lastVisitAt).
   */
  async findDueForVisit(repId: string): Promise<Doctor[]> {
    // TODO: implement when DB is available
    // Calculate based on visitFrequency and lastVisitAt
    // const now = new Date()
    // return this.model.findMany({
    //   where: {
    //     assignedRepId: repId,
    //     OR: [
    //       { lastVisitAt: null },
    //       // More complex date math needed here
    //     ],
    //   },
    //   orderBy: { classification: 'asc' },
    // })
    throw new Error('Not implemented: database not yet provisioned')
  }
}
