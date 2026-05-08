import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  doctorSchema,
  expenseSchema,
  marketRequestSchema,
  visitSchema,
} from '@/lib/validation/schemas'

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 6 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a password with exactly 6 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('lowercases the email via transform', () => {
    const result = loginSchema.parse({
      email: 'User@EXAMPLE.com',
      password: 'password123',
    })
    expect(result.email).toBe('user@example.com')
  })
})

describe('doctorSchema', () => {
  const validDoctor = {
    name: 'Dr. Ahmed',
    specialty: 'Cardiology' as const,
    classification: 'A' as const,
  }

  it('accepts a valid doctor with required fields only', () => {
    const result = doctorSchema.safeParse(validDoctor)
    expect(result.success).toBe(true)
  })

  it('rejects a doctor with missing name', () => {
    const result = doctorSchema.safeParse({
      specialty: 'Cardiology',
      classification: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a doctor with a name shorter than 2 characters', () => {
    const result = doctorSchema.safeParse({
      ...validDoctor,
      name: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid classification', () => {
    const result = doctorSchema.safeParse({
      ...validDoctor,
      classification: 'Z',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid classification values A, B, C, D', () => {
    for (const c of ['A', 'B', 'C', 'D']) {
      const result = doctorSchema.safeParse({ ...validDoctor, classification: c })
      expect(result.success).toBe(true)
    }
  })

  it('accepts optional fields', () => {
    const result = doctorSchema.safeParse({
      ...validDoctor,
      hospital: 'Cairo Hospital',
      city: 'Cairo',
      isKOL: true,
      visitFrequency: 8,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid specialty', () => {
    const result = doctorSchema.safeParse({
      ...validDoctor,
      specialty: 'InvalidSpecialty',
    })
    expect(result.success).toBe(false)
  })

  it('rejects visitFrequency above 31', () => {
    const result = doctorSchema.safeParse({
      ...validDoctor,
      visitFrequency: 32,
    })
    expect(result.success).toBe(false)
  })
})

describe('expenseSchema', () => {
  const validExpense = {
    type: 'Transport' as const,
    amount: 150,
    date: '2025-03-15T00:00:00Z',
    description: 'Taxi to hospital visit',
  }

  it('accepts a valid expense', () => {
    const result = expenseSchema.safeParse(validExpense)
    expect(result.success).toBe(true)
  })

  it('rejects a negative amount', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      amount: -10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects amount above 100,000', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      amount: 100001,
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid date string', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      date: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid expense type', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      type: 'InvalidType',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid expense types', () => {
    const types = ['Transport', 'Meals', 'Accommodation', 'Hotel', 'Office Supplies', 'Other', 'Kilometrage']
    for (const type of types) {
      const result = expenseSchema.safeParse({ ...validExpense, type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects description shorter than 5 characters', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      description: 'hi',
    })
    expect(result.success).toBe(false)
  })
})

describe('marketRequestSchema', () => {
  const validRequest = {
    type: 'SAMPLE' as const,
    title: 'Sample Request',
    description: 'Need more samples for the team distribution',
    priority: 'MEDIUM' as const,
  }

  it('accepts a valid market request', () => {
    const result = marketRequestSchema.safeParse(validRequest)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid request type', () => {
    const result = marketRequestSchema.safeParse({
      ...validRequest,
      type: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid request types', () => {
    const types = ['SAMPLE', 'LITERATURE', 'EVENT', 'DISCOUNT', 'DOCTOR_EDIT', 'OTHER']
    for (const type of types) {
      const result = marketRequestSchema.safeParse({ ...validRequest, type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects a description shorter than 10 characters', () => {
    const result = marketRequestSchema.safeParse({
      ...validRequest,
      description: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a title shorter than 3 characters', () => {
    const result = marketRequestSchema.safeParse({
      ...validRequest,
      title: 'ab',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional amount when positive', () => {
    const result = marketRequestSchema.safeParse({
      ...validRequest,
      amount: 500,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-positive amount', () => {
    const result = marketRequestSchema.safeParse({
      ...validRequest,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })
})
