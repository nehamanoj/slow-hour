/**
 * Unit tests for the core ranking and filtering logic.
 *
 * Why test these specifically?
 *   rankDeals and filterDeals are the heart of the product's value proposition:
 *   "deals ranked by how fast they're disappearing." If urgency sorting breaks
 *   or the "Ending Soon" filter is wrong, users miss deals — the core UX fails.
 *
 *   normalizeCity is the edge between Vercel's geo header and our app's data.
 *   A bad normalization silently shows the wrong city's deals with no error.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest'
import { rankDeals, filterDeals } from '../ranking'
import { normalizeCity } from '../geo'
import type { Deal } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDeal(id: string, expiresInHours: number, category = 'Food'): Deal {
  return {
    id,
    title: `Deal ${id}`,
    business: 'Test Business',
    description: 'Test description',
    city: 'Houston',
    category: category as Deal['category'],
    discount: '10% OFF',
    expiresInHours,
    emoji: '🍔',
  }
}

const longRunning  = makeDeal('long',   24)   // expires in 24h
const midday       = makeDeal('mid',    3)    // expires in 3h
const urgent       = makeDeal('urgent', 1.5)  // expires in 90m
const critical     = makeDeal('crit',   0.5)  // expires in 30m
const drinksDeal   = makeDeal('drink',  2, 'Drinks')
const eventsDeal   = makeDeal('event',  5, 'Events')

// ─── rankDeals ────────────────────────────────────────────────────────────────

describe('rankDeals', () => {
  it('sorts deals by expiry ascending — soonest first', () => {
    const input = [longRunning, critical, midday, urgent]
    const result = rankDeals(input)
    expect(result.map(d => d.id)).toEqual(['crit', 'urgent', 'mid', 'long'])
  })

  it('does not mutate the original array', () => {
    const input = [longRunning, critical]
    const original = [...input]
    rankDeals(input)
    expect(input).toEqual(original)
  })

  it('handles an empty array without throwing', () => {
    expect(rankDeals([])).toEqual([])
  })

  it('handles a single-item array', () => {
    expect(rankDeals([urgent])).toEqual([urgent])
  })

  it('keeps equal-expiry deals stable (order preserved)', () => {
    const a = makeDeal('a', 2)
    const b = makeDeal('b', 2)
    const result = rankDeals([a, b])
    // Both have expiresInHours === 2; original order should be preserved
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })
})

// ─── filterDeals ──────────────────────────────────────────────────────────────

describe('filterDeals', () => {
  const all = [critical, urgent, midday, drinksDeal, eventsDeal, longRunning]

  it('"all" returns every deal unchanged', () => {
    expect(filterDeals(all, 'all')).toEqual(all)
  })

  it('"ending-soon" returns only deals expiring within 3 hours', () => {
    const result = filterDeals(all, 'ending-soon')
    expect(result.every(d => d.expiresInHours <= 3)).toBe(true)
    // critical (0.5h), urgent (1.5h), drinksDeal (2h), midday (3h) qualify
    expect(result).toHaveLength(4)
  })

  it('category filter matches case-insensitively', () => {
    expect(filterDeals(all, 'drinks')).toEqual([drinksDeal])
    expect(filterDeals(all, 'Drinks')).toEqual([drinksDeal])
    expect(filterDeals(all, 'DRINKS')).toEqual([drinksDeal])
  })

  it('category filter returns empty array when no deals match', () => {
    expect(filterDeals(all, 'fitness')).toEqual([])
  })

  it('"ending-soon" returns empty array when all deals are long-running', () => {
    expect(filterDeals([longRunning], 'ending-soon')).toEqual([])
  })
})

// ─── normalizeCity ────────────────────────────────────────────────────────────

describe('normalizeCity', () => {
  it('returns Houston as the default fallback for null input', () => {
    expect(normalizeCity(null)).toBe('Houston')
  })

  it('returns Houston as the default fallback for an unrecognised city', () => {
    expect(normalizeCity('Atlantis')).toBe('Houston')
  })

  it('exact match is case-insensitive', () => {
    expect(normalizeCity('houston')).toBe('Houston')
    expect(normalizeCity('HOUSTON')).toBe('Houston')
    expect(normalizeCity('new york')).toBe('New York')
  })

  it('fuzzy-matches "New York City" → "New York"', () => {
    // Vercel's geo header can return "New York City"
    expect(normalizeCity('New York City')).toBe('New York')
  })

  it('fuzzy-matches "San Francisco Bay Area" → "San Francisco"', () => {
    expect(normalizeCity('San Francisco Bay Area')).toBe('San Francisco')
  })

  it('returns the exact supported city name with correct casing', () => {
    // Ensures we return the canonical form, not the raw input
    expect(normalizeCity('pittsburgh')).toBe('Pittsburgh')
    expect(normalizeCity('austin')).toBe('Austin')
  })
})
