/**
 * Unit tests — ranking.ts
 *
 * Covers rankDeals and filterDeals in full.
 * The "ending-soon" boundary and category matching are the highest-risk
 * behaviours: a silent regression here directly breaks the core UX promise.
 */

import { describe, it, expect } from 'vitest'
import { rankDeals, filterDeals } from '../ranking'
import type { Deal } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDeal(
  id: string,
  expiresInHours: number,
  category: Deal['category'] = 'Food',
  city = 'Houston',
): Deal {
  return {
    id,
    title: `Deal ${id}`,
    business: 'Test Business',
    description: 'Test description',
    city,
    category,
    discount: '10% OFF',
    expiresInHours,
    emoji: '🍔',
  }
}

// ─── rankDeals ────────────────────────────────────────────────────────────────

describe('rankDeals', () => {
  it('sorts soonest-expiring deals first', () => {
    const input = [makeDeal('long', 24), makeDeal('crit', 0.5), makeDeal('mid', 3), makeDeal('urg', 1.5)]
    expect(rankDeals(input).map(d => d.id)).toEqual(['crit', 'urg', 'mid', 'long'])
  })

  it('does not mutate the original array', () => {
    const input = [makeDeal('b', 10), makeDeal('a', 1)]
    const snapshot = input.map(d => d.id)
    rankDeals(input)
    expect(input.map(d => d.id)).toEqual(snapshot)
  })

  it('handles an empty array', () => {
    expect(rankDeals([])).toEqual([])
  })

  it('handles a single-element array', () => {
    const deal = makeDeal('only', 5)
    expect(rankDeals([deal])).toEqual([deal])
  })

  it('preserves insertion order for ties (stable sort)', () => {
    const a = makeDeal('a', 2)
    const b = makeDeal('b', 2)
    const c = makeDeal('c', 2)
    const result = rankDeals([a, b, c])
    expect(result.map(d => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('handles fractional hours correctly', () => {
    const a = makeDeal('a', 0.25)  // 15 min
    const b = makeDeal('b', 0.5)   // 30 min
    const c = makeDeal('c', 0.75)  // 45 min
    expect(rankDeals([c, a, b]).map(d => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('handles very large expiry values without error', () => {
    const deals = [makeDeal('z', 99999), makeDeal('a', 1)]
    const result = rankDeals(deals)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('z')
  })

  it('handles zero expiresInHours (already expiring)', () => {
    const a = makeDeal('a', 0)
    const b = makeDeal('b', 1)
    expect(rankDeals([b, a])[0].id).toBe('a')
  })

  it('returns a new array, not the same reference', () => {
    const input = [makeDeal('x', 1)]
    expect(rankDeals(input)).not.toBe(input)
  })
})

// ─── filterDeals ──────────────────────────────────────────────────────────────

describe('filterDeals', () => {
  const food1     = makeDeal('f1', 0.5,  'Food')
  const food2     = makeDeal('f2', 1.5,  'Food')
  const drinks    = makeDeal('dr', 2,    'Drinks')
  const events    = makeDeal('ev', 3,    'Events')
  const fitness   = makeDeal('fi', 5,    'Fitness')
  const retail    = makeDeal('re', 48,   'Retail')
  const study     = makeDeal('st', 72,   'Study')

  const all = [food1, food2, drinks, events, fitness, retail, study]

  // ── "all" filter ────────────────────────────────────────────────────────────

  it('"all" returns every deal in the original order', () => {
    expect(filterDeals(all, 'all')).toEqual(all)
  })

  it('"all" does not mutate the original array', () => {
    const copy = [...all]
    filterDeals(all, 'all')
    expect(all).toEqual(copy)
  })

  it('"all" on empty array returns empty array', () => {
    expect(filterDeals([], 'all')).toEqual([])
  })

  // ── "ending-soon" filter ────────────────────────────────────────────────────

  it('"ending-soon" includes deals at exactly the 3h boundary', () => {
    // events deal is exactly 3h — must be included
    const result = filterDeals(all, 'ending-soon')
    expect(result.some(d => d.id === 'ev')).toBe(true)
  })

  it('"ending-soon" excludes deals just above 3h boundary', () => {
    const justOver = makeDeal('over', 3.001)
    const result = filterDeals([justOver], 'ending-soon')
    expect(result).toHaveLength(0)
  })

  it('"ending-soon" includes deals with expiresInHours = 0', () => {
    const expired = makeDeal('exp', 0)
    expect(filterDeals([expired], 'ending-soon')).toHaveLength(1)
  })

  it('"ending-soon" returns correct subset from mixed array', () => {
    // food1 (0.5h), food2 (1.5h), drinks (2h), events (3h) qualify; fitness+ do not
    const result = filterDeals(all, 'ending-soon')
    expect(result.map(d => d.id).sort()).toEqual(['dr', 'ev', 'f1', 'f2'])
  })

  it('"ending-soon" returns empty when no deals are urgent', () => {
    expect(filterDeals([retail, study], 'ending-soon')).toHaveLength(0)
  })

  // ── Category filters ────────────────────────────────────────────────────────

  it('filters by Food (lowercase)', () => {
    const result = filterDeals(all, 'food')
    expect(result.every(d => d.category === 'Food')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('filters by Drinks case-insensitively (all cases)', () => {
    expect(filterDeals(all, 'drinks')).toHaveLength(1)
    expect(filterDeals(all, 'Drinks')).toHaveLength(1)
    expect(filterDeals(all, 'DRINKS')).toHaveLength(1)
    expect(filterDeals(all, 'DrInKs')).toHaveLength(1)
  })

  it('filters by Events', () => {
    expect(filterDeals(all, 'events')).toEqual([events])
  })

  it('filters by Fitness', () => {
    expect(filterDeals(all, 'fitness')).toEqual([fitness])
  })

  it('filters by Retail', () => {
    expect(filterDeals(all, 'retail')).toEqual([retail])
  })

  it('filters by Study', () => {
    expect(filterDeals(all, 'study')).toEqual([study])
  })

  it('returns empty array for a filter with no matches', () => {
    expect(filterDeals([food1, food2], 'fitness')).toEqual([])
  })

  it('unknown filter string returns empty (no accidental "all" fallback)', () => {
    // A typo like "fod" should not return food deals
    const result = filterDeals(all, 'fod')
    expect(result).toHaveLength(0)
  })

  it('empty string filter returns empty (not treated as "all")', () => {
    expect(filterDeals(all, '')).toHaveLength(0)
  })

  it('does not mutate the original array during category filter', () => {
    const copy = [...all]
    filterDeals(all, 'food')
    expect(all).toEqual(copy)
  })

  // ── Composed usage (rank then filter) ───────────────────────────────────────

  it('ranking before filtering preserves sort order through filter', () => {
    const ranked = rankDeals(all)         // sorted by urgency ascending
    const result = filterDeals(ranked, 'food')
    expect(result[0].id).toBe('f1')      // 0.5h before 1.5h
    expect(result[1].id).toBe('f2')
  })
})
