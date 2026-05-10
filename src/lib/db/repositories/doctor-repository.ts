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
  protected modelName = 'doctor'

  constructor(prisma: PrismaClient) {
    super(prisma)
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
    try {
      const where: Prisma.DoctorWhereInput = {}

      // Role-based scoping
      switch (userRole) {
        case 'MEDICAL_REP':
          where.assignedRepId = userId
          break
        case 'DISTRICT_MANAGER':
        case 'MARKETEER':
          // Doctors assigned to reps under this manager's BUs
          where.assignedRep = {
            buMemberships: { some: { businessUnit: { managerId: userId } } },
          }
          break
        case 'BUM':
          // All doctors in BUM's business units
          where.businessUnit = { managerId: userId }
          break
        // ADMIN, NSM: no scope restriction
      }

      // Apply filters
      if (filters?.buId) where.buId = filters.buId
      if (filters?.assignedRepId) where.assignedRepId = filters.assignedRepId
      if (filters?.classification) where.classification = filters.classification as any
      if (filters?.specialty) where.specialty = filters.specialty
      if (filters?.isKOL !== undefined) where.isKOL = filters.isKOL
      if (filters?.buyingLadderStage) where.buyingLadderStage = filters.buyingLadderStage as any
      if (filters?.brickId) where.brickId = filters.brickId
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { hospital: { contains: filters.search, mode: 'insensitive' } },
          { city: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize
      const orderBy = sort ? { [sort.field]: sort.direction } : { name: 'asc' as const }

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy,
          include: { assignedRep: true, businessUnit: true },
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
      throw new Error(`Failed to find scoped doctors: ${(error as Error).message}`)
    }
  }

  /**
   * Find doctors belonging to a specific business unit.
   */
  async findByBU(
    buId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Doctor>> {
    try {
      const where: Prisma.DoctorWhereInput = { buId }
      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy: { name: 'asc' },
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
      throw new Error(`Failed to find doctors by BU: ${(error as Error).message}`)
    }
  }

  /**
   * Find doctors assigned to a specific medical rep.
   */
  async findByRep(
    repId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Doctor>> {
    try {
      const where: Prisma.DoctorWhereInput = { assignedRepId: repId }
      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy: { classification: 'asc' },
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
      throw new Error(`Failed to find doctors by rep: ${(error as Error).message}`)
    }
  }

  /**
   * Search doctors by name, hospital, city, or specialty.
   */
  async search(
    query: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Doctor>> {
    try {
      const where: Prisma.DoctorWhereInput = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { hospital: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { specialty: { contains: query, mode: 'insensitive' } },
        ],
      }
      const pag = pagination ?? { page: 1, pageSize: 50 }
      const skip = (pag.page - 1) * pag.pageSize

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: pag.pageSize,
          orderBy: { name: 'asc' },
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
      throw new Error(`Failed to search doctors: ${(error as Error).message}`)
    }
  }

  /**
   * Find Key Opinion Leaders (KOLs) optionally filtered by BU.
   */
  async findKOLs(buId?: string): Promise<Doctor[]> {
    try {
      const where: Prisma.DoctorWhereInput = { isKOL: true }
      if (buId) where.buId = buId
      return this.model.findMany({ where, orderBy: { classification: 'asc' } })
    } catch (error) {
      throw new Error(`Failed to find KOLs: ${(error as Error).message}`)
    }
  }

  /**
   * Get doctors due for a visit (based on visitFrequency and lastVisitAt).
   */
  async findDueForVisit(repId: string): Promise<Doctor[]> {
    try {
      // Fetch all doctors assigned to this rep, then filter in-memory
      // based on visitFrequency and lastVisitAt
      const doctors = await this.model.findMany({
        where: { assignedRepId: repId },
        orderBy: { classification: 'asc' },
      })

      const now = new Date()
      return doctors.filter((doctor: Doctor) => {
        if (!doctor.lastVisitAt) return true // never visited
        const daysSinceLastVisit = Math.floor(
          (now.getTime() - new Date(doctor.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24),
        )
        // visitFrequency is visits per month; convert to days between visits
        const requiredIntervalDays = Math.floor(30 / (doctor.visitFrequency || 2))
        return daysSinceLastVisit >= requiredIntervalDays
      })
    } catch (error) {
      throw new Error(`Failed to find doctors due for visit: ${(error as Error).message}`)
    }
  }
}
