/**
 * Unit tests — deals.ts
 *
 * getDeals is the data access layer. In its current form it's a mock —
 * but the filtering contract it enforces is real product behaviour.
 * If city filtering breaks, users in Houston see San Francisco deals.
 *
 * The intentional 1.2s delay is also tested to ensure it's present
 * (it's load-bearing for the Suspense streaming demo).
 *
 * HARD-TO-TEST:
 *   The delay uses a real setTimeout. We use vi.useFakeTimers() to advance
 *   time without waiting. Without fake timers these tests would take 6+ seconds.
 *
 *   getDeals is not a pure function — it depends on mockDeals, a module-level
 *   constant. To test "no deals for unknown city" we rely on the known fixture
 *   dataset not containing that city name. If deals are added for new cities,
 *   those tests remain valid as long as the city names don't collide.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDeals, mockDeals } from '../deals'
import { SUPPORTED_CITIES } from '../types'
import type { SupportedCity } from '../types'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── getDeals — city filtering ────────────────────────────────────────────────

describe('getDeals — city filtering', () => {
  async function resolveDeals(city: string) {
    const promise = getDeals(city)
    await vi.runAllTimersAsync()
    return promise
  }

  it('returns only Houston deals for "Houston"', async () => {
    const deals = await resolveDeals('Houston')
    expect(deals.every(d => d.city === 'Houston')).toBe(true)
    expect(deals.length).toBeGreaterThan(0)
  })

  it('returns only San Francisco deals for "San Francisco"', async () => {
    const deals = await resolveDeals('San Francisco')
    expect(deals.every(d => d.city === 'San Francisco')).toBe(true)
    expect(deals.length).toBeGreaterThan(0)
  })

  it.each(SUPPORTED_CITIES as unknown as SupportedCity[])(
    'returns only %s deals when queried for %s',
    async (city) => {
      const deals = await resolveDeals(city)
      expect(deals.every(d => d.city === city)).toBe(true)
    }
  )

  it('returns empty array for an unsupported city', async () => {
    const deals = await resolveDeals('Atlantis')
    expect(deals).toEqual([])
  })

  it('returns empty array for empty string', async () => {
    const deals = await resolveDeals('')
    expect(deals).toEqual([])
  })

  it('is case-sensitive (city names are exact-matched)', async () => {
    // "houston" lowercase should NOT match Houston deals — the filter is ===
    const deals = await resolveDeals('houston')
    expect(deals).toHaveLength(0)
  })

  it('does not return deals from other cities when querying Houston', async () => {
    const deals = await resolveDeals('Houston')
    expect(deals.some(d => d.city === 'New York')).toBe(false)
    expect(deals.some(d => d.city === 'Austin')).toBe(false)
  })
})

// ─── getDeals — delay contract ────────────────────────────────────────────────

describe('getDeals — intentional 1.2 s delay', () => {
  it('does not resolve before 1200ms', async () => {
    let resolved = false
    const promise = getDeals('Houston').then(() => { resolved = true })

    vi.advanceTimersByTime(1199)
    await Promise.resolve() // flush microtasks
    expect(resolved).toBe(false)

    vi.advanceTimersByTime(1)
    await promise
    expect(resolved).toBe(true)
  })

  it('resolves after exactly 1200ms', async () => {
    const promise = getDeals('Houston')
    vi.advanceTimersByTime(1200)
    const deals = await promise
    expect(Array.isArray(deals)).toBe(true)
  })
})

// ─── mockDeals — data integrity ───────────────────────────────────────────────

describe('mockDeals — fixture integrity', () => {
  it('every deal has a unique id', () => {
    const ids = mockDeals.map(d => d.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every deal has a non-empty title', () => {
    mockDeals.forEach(d => {
      expect(d.title.trim().length).toBeGreaterThan(0)
    })
  })

  it('every deal has a non-empty business name', () => {
    mockDeals.forEach(d => {
      expect(d.business.trim().length).toBeGreaterThan(0)
    })
  })

  it('every deal has a positive expiresInHours', () => {
    mockDeals.forEach(d => {
      expect(d.expiresInHours).toBeGreaterThan(0)
    })
  })

  it('every deal belongs to a supported city', () => {
    const citySet = new Set<string>(SUPPORTED_CITIES)
    mockDeals.forEach(d => {
      expect(citySet.has(d.city)).toBe(true)
    })
  })

  it('every deal has a valid category', () => {
    const validCategories = ['Food', 'Drinks', 'Events', 'Fitness', 'Retail', 'Study']
    mockDeals.forEach(d => {
      expect(validCategories).toContain(d.category)
    })
  })

  it('every deal has a non-empty discount string', () => {
    mockDeals.forEach(d => {
      expect(d.discount.trim().length).toBeGreaterThan(0)
    })
  })

  it('every deal has a non-empty emoji', () => {
    mockDeals.forEach(d => {
      expect(d.emoji.trim().length).toBeGreaterThan(0)
    })
  })

  it('every supported city has at least one deal', () => {
    SUPPORTED_CITIES.forEach(city => {
      const cityDeals = mockDeals.filter(d => d.city === city)
      expect(cityDeals.length).toBeGreaterThan(0)
    })
  })

  it('each city has deals across at least 2 different categories', () => {
    SUPPORTED_CITIES.forEach(city => {
      const categories = new Set(mockDeals.filter(d => d.city === city).map(d => d.category))
      expect(categories.size).toBeGreaterThanOrEqual(2)
    })
  })

  it('each city has at least one "ending-soon" deal (expiresInHours ≤ 3)', () => {
    // This is critical — if a city has no urgent deals, the "Ending Soon" tab is empty
    SUPPORTED_CITIES.forEach(city => {
      const urgent = mockDeals.filter(d => d.city === city && d.expiresInHours <= 3)
      expect(urgent.length).toBeGreaterThan(0)
    })
  })
})
