import { describe, it, expect } from 'vitest'
import { ROLE_ROUTES, type UserRole } from '@/lib/auth/role-routes'

describe('ROLE_ROUTES', () => {
  it('ADMIN has wildcard access', () => {
    expect(ROLE_ROUTES.ADMIN).toContain('*')
  })

  it('every role has /dashboard', () => {
    const roles = Object.keys(ROLE_ROUTES) as UserRole[]
    for (const role of roles) {
      if (role === 'ADMIN') {
        // Admin has wildcard, which covers /dashboard
        expect(ROLE_ROUTES[role]).toContain('*')
      } else {
        expect(ROLE_ROUTES[role]).toContain('/dashboard')
      }
    }
  })

  it('MEDICAL_REP does not have admin routes', () => {
    const repRoutes = ROLE_ROUTES.MEDICAL_REP
    expect(repRoutes).not.toContain('/admin/audit-log')
    expect(repRoutes).not.toContain('/admin/users')
    expect(repRoutes).not.toContain('*')
  })

  it('ACCOUNTANT has finance routes', () => {
    const accountantRoutes = ROLE_ROUTES.ACCOUNTANT
    expect(accountantRoutes).toContain('/erp/finance')
    expect(accountantRoutes).toContain('/erp/accounting')
    expect(accountantRoutes).toContain('/hubs/finance')
  })

  it('HR has ATS routes', () => {
    const hrRoutes = ROLE_ROUTES.HR
    expect(hrRoutes).toContain('/ats/jobs')
    expect(hrRoutes).toContain('/ats/candidates')
    expect(hrRoutes).toContain('/ats/interviews')
    expect(hrRoutes).toContain('/ats/onboarding')
    expect(hrRoutes).toContain('/ats/training')
  })

  it('all roles have /settings/profile', () => {
    const roles = Object.keys(ROLE_ROUTES) as UserRole[]
    for (const role of roles) {
      if (role === 'ADMIN') {
        expect(ROLE_ROUTES[role]).toContain('*')
      } else {
        expect(ROLE_ROUTES[role]).toContain('/settings/profile')
      }
    }
  })

  it('WAREHOUSE has supply chain and inventory routes', () => {
    const warehouseRoutes = ROLE_ROUTES.WAREHOUSE
    expect(warehouseRoutes).toContain('/erp/inventory')
    expect(warehouseRoutes).toContain('/hubs/supply-chain')
    expect(warehouseRoutes).toContain('/erp/products')
  })

  it('MEDICAL_REP has CRM medical-rep route', () => {
    const repRoutes = ROLE_ROUTES.MEDICAL_REP
    expect(repRoutes).toContain('/crm/medical-rep')
    expect(repRoutes).toContain('/crm/doctors')
    expect(repRoutes).toContain('/crm/weekly-plan')
  })

  it('NSM has broad CRM access and audit log', () => {
    const nsmRoutes = ROLE_ROUTES.NSM
    expect(nsmRoutes).toContain('/crm/reports')
    expect(nsmRoutes).toContain('/crm/kpis')
    expect(nsmRoutes).toContain('/admin/audit-log')
    expect(nsmRoutes).toContain('/crm/business-units')
  })

  it('MEDICAL_REP does not have /crm/reports', () => {
    const repRoutes = ROLE_ROUTES.MEDICAL_REP
    expect(repRoutes).not.toContain('/crm/reports')
  })
})
