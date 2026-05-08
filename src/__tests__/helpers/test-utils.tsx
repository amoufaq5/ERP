import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { UserProvider, type AppUser } from '@/lib/user-context'
import { I18nProvider } from '@/lib/i18n/i18n-context'

// ─── Mock data factories ────────────────────────────────────────────────────

export function createMockUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'u-test-1',
    name: 'Test User',
    email: 'test@pharma.com',
    role: 'ADMIN',
    department: 'Testing',
    ...overrides,
  }
}

export function createMockDoctor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd-test-1',
    name: 'Dr. Test Doctor',
    specialty: 'Cardiology',
    classification: 'A',
    hospital: 'Test Hospital',
    city: 'Cairo',
    phone: '+201234567890',
    email: 'doctor@test.com',
    notes: '',
    isKOL: false,
    visitFrequency: 4,
    ...overrides,
  }
}

export function createMockVisit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v-test-1',
    doctorId: 'd-test-1',
    dateTime: '2025-01-15T10:00:00Z',
    session: 'AM',
    type: 'SINGLE',
    notes: '',
    productIds: [],
    ...overrides,
  }
}

// ─── Provider wrapper ───────────────────────────────────────────────────────

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </I18nProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// ─── Re-export everything from testing library ──────────────────────────────

export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
