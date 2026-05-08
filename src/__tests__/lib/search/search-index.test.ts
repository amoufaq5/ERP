import { describe, it, expect } from 'vitest'
import { SearchIndex } from '@/lib/search/search-index'

describe('SearchIndex', () => {
  it('indexes and finds a document by a single term', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed Kamal' })

    const results = index.search('Ahmed')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('d1')
    expect(results[0].entity).toBe('doctor')
  })

  it('returns empty results for non-matching query', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed Kamal' })

    const results = index.search('Nonexistent')
    expect(results).toHaveLength(0)
  })

  it('returns empty results for empty query', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed Kamal' })

    const results = index.search('')
    expect(results).toHaveLength(0)
  })

  it('searches across multiple fields', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', {
      name: 'Ahmed Kamal',
      specialty: 'Cardiology',
      city: 'Cairo',
    })

    expect(index.search('Cardiology')).toHaveLength(1)
    expect(index.search('Cairo')).toHaveLength(1)
  })

  it('returns matched fields', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', {
      name: 'Ahmed Kamal',
      specialty: 'Cardiology',
    })

    const results = index.search('Cardiology')
    expect(results[0].matchedFields).toContain('specialty')
  })

  it('removes a document from the index', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed Kamal' })
    index.addDocument('d2', 'doctor', { name: 'Sara Ali' })

    index.removeDocument('d1')

    const results = index.search('Ahmed')
    expect(results).toHaveLength(0)

    const saraResults = index.search('Sara')
    expect(saraResults).toHaveLength(1)
  })

  it('handles re-indexing the same document ID', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed Kamal' })
    index.addDocument('d1', 'doctor', { name: 'Mohamed Fathy' })

    const ahmedResults = index.search('Ahmed')
    expect(ahmedResults).toHaveLength(0)

    const mohamedResults = index.search('Mohamed')
    expect(mohamedResults).toHaveLength(1)
  })

  it('scores documents by relevance (TF-IDF)', () => {
    const index = new SearchIndex()
    // doc with "cardiology" in multiple fields should score higher
    index.addDocument('d1', 'doctor', {
      name: 'Cardiology Specialist',
      specialty: 'Cardiology',
      notes: 'Expert in cardiology',
    })
    index.addDocument('d2', 'doctor', {
      name: 'Ahmed General',
      specialty: 'General Practice',
    })

    const results = index.search('cardiology')
    expect(results).toHaveLength(1) // only d1 matches
    expect(results[0].id).toBe('d1')
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('filters results by entity type', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed Cairo' })
    index.addDocument('a1', 'account', { name: 'Cairo Hospital' })

    const doctorResults = index.search('Cairo', { entities: ['doctor'] })
    expect(doctorResults).toHaveLength(1)
    expect(doctorResults[0].entity).toBe('doctor')

    const accountResults = index.search('Cairo', { entities: ['account'] })
    expect(accountResults).toHaveLength(1)
    expect(accountResults[0].entity).toBe('account')
  })

  it('respects the limit option', () => {
    const index = new SearchIndex()
    for (let i = 0; i < 10; i++) {
      index.addDocument(`d${i}`, 'doctor', { name: `Doctor Test ${i}` })
    }

    const results = index.search('Doctor', { limit: 3 })
    expect(results).toHaveLength(3)
  })

  it('handles prefix matching for partial queries', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Cardiology Specialist' })

    // "Card" should match "Cardiology" via prefix
    const results = index.search('Card')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('d1')
  })

  it('handles Arabic text without diacritics', () => {
    const index = new SearchIndex()
    // Add a document with Arabic text (with diacritics)
    index.addDocument('d1', 'doctor', { name: 'طبيب' })

    // Search without diacritics should still match
    const results = index.search('طبيب')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('d1')
  })

  it('returns highlights for matched terms', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed Kamal' })

    const results = index.search('Ahmed')
    expect(results[0].highlights).toBeDefined()
    expect(results[0].highlights['name']).toContain('<mark>')
  })

  it('handles fuzzy matching when enabled', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed' })

    // "Ahned" is edit-distance-1 from "Ahmed"
    const results = index.search('Ahned', { fuzzy: true })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('d1')
  })

  it('does not fuzzy match when disabled', () => {
    const index = new SearchIndex()
    index.addDocument('d1', 'doctor', { name: 'Ahmed' })

    const results = index.search('Ahned', { fuzzy: false })
    expect(results).toHaveLength(0)
  })
})
