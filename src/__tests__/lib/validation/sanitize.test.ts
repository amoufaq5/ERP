import { describe, it, expect } from 'vitest'
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  escapeForRegex,
  sanitizeHTML,
} from '@/lib/validation/sanitize'

describe('sanitizeString', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
  })

  it('removes null bytes', () => {
    expect(sanitizeString('he\0llo')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('')
  })

  it('handles whitespace-only string', () => {
    expect(sanitizeString('   ')).toBe('')
  })

  it('enforces maximum length', () => {
    const long = 'a'.repeat(2000)
    expect(sanitizeString(long, 10)).toBe('a'.repeat(10))
  })

  it('does not truncate short strings', () => {
    expect(sanitizeString('short', 100)).toBe('short')
  })
})

describe('sanitizeEmail', () => {
  it('lowercases the email', () => {
    expect(sanitizeEmail('User@EXAMPLE.COM')).toBe('user@example.com')
  })

  it('trims whitespace', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com')
  })

  it('handles already lowercase emails', () => {
    expect(sanitizeEmail('user@example.com')).toBe('user@example.com')
  })
})

describe('sanitizePhone', () => {
  it('keeps digits, +, -, spaces, and parentheses', () => {
    expect(sanitizePhone('+20 (123) 456-7890')).toBe('+20 (123) 456-7890')
  })

  it('removes letters and special characters', () => {
    expect(sanitizePhone('abc+123xyz!@#')).toBe('+123')
  })

  it('trims whitespace from result', () => {
    expect(sanitizePhone('  123  ')).toBe('123')
  })
})

describe('sanitizeNumber', () => {
  it('parses a valid number string', () => {
    expect(sanitizeNumber('42')).toBe(42)
  })

  it('passes through a number value', () => {
    expect(sanitizeNumber(42)).toBe(42)
  })

  it('returns 0 for NaN input', () => {
    expect(sanitizeNumber('not-a-number')).toBe(0)
  })

  it('returns 0 for Infinity', () => {
    expect(sanitizeNumber(Infinity)).toBe(0)
  })

  it('clamps to minimum', () => {
    expect(sanitizeNumber(5, 10)).toBe(10)
  })

  it('clamps to maximum', () => {
    expect(sanitizeNumber(100, 0, 50)).toBe(50)
  })

  it('returns value within range unchanged', () => {
    expect(sanitizeNumber(25, 0, 50)).toBe(25)
  })

  it('handles negative numbers', () => {
    expect(sanitizeNumber(-5, -10, 10)).toBe(-5)
  })
})

describe('escapeForRegex', () => {
  it('escapes dots', () => {
    expect(escapeForRegex('file.txt')).toBe('file\\.txt')
  })

  it('escapes all special regex characters', () => {
    const input = '.*+?^${}()|[]\\'
    const escaped = escapeForRegex(input)
    // Should not throw when used in a RegExp
    expect(() => new RegExp(escaped)).not.toThrow()
  })

  it('leaves normal characters unchanged', () => {
    expect(escapeForRegex('hello world')).toBe('hello world')
  })
})

describe('sanitizeHTML', () => {
  it('strips HTML tags', () => {
    expect(sanitizeHTML('<b>bold</b>')).toBe('bold')
  })

  it('strips nested HTML tags', () => {
    expect(sanitizeHTML('<div><p>hello</p></div>')).toBe('hello')
  })

  it('leaves plain text unchanged', () => {
    expect(sanitizeHTML('plain text')).toBe('plain text')
  })
})
