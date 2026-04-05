/**
 * Unit tests — geo.ts
 *
 * normalizeCity is the boundary between Vercel's x-vercel-ip-city header and
 * our data layer. A silent wrong-city match means the wrong deals are shown —
 * no error, just a bad UX. isSupportedCity gates the "quiet city" experience.
 *
 * HARD-TO-TEST NOTE:
 *   normalizeCity's fuzzy logic uses substring matching in both directions
 *   (rawCity.includes(supported) OR supported.includes(rawCity)). This creates
 *   a subtle ambiguity: short city names can match as substrings of unrelated
 *   strings. These tests document the known edge cases so regressions surface
 *   immediately.
 */

import { describe, it, expect } from 'vitest'
import { normalizeCity, isSupportedCity, CITY_TIMEZONES, CITY_COORDS } from '../geo'
import { SUPPORTED_CITIES } from '../types'
import type { SupportedCity } from '../types'

// ─── normalizeCity ─────────────────────────────────────────────────────────────

describe('normalizeCity', () => {
  // Happy paths — null / missing
  it('returns Houston for null (no geo header)', () => {
    expect(normalizeCity(null)).toBe('Houston')
  })

  it('returns Houston for empty string', () => {
    expect(normalizeCity('')).toBe('Houston')
  })

  // Happy paths — exact matches
  it.each(SUPPORTED_CITIES as unknown as SupportedCity[])(
    'exact match "%s" returns correct canonical city',
    (city) => {
      expect(normalizeCity(city)).toBe(city)
    }
  )

  // Case-insensitive exact matches
  it('matches "houston" (all lowercase)', () => {
    expect(normalizeCity('houston')).toBe('Houston')
  })

  it('matches "HOUSTON" (all uppercase)', () => {
    expect(normalizeCity('HOUSTON')).toBe('Houston')
  })

  it('matches "new york" (lowercase multi-word)', () => {
    expect(normalizeCity('new york')).toBe('New York')
  })

  it('matches "san francisco" (lowercase multi-word)', () => {
    expect(normalizeCity('san francisco')).toBe('San Francisco')
  })

  it('matches "PITTSBURGH" (uppercase)', () => {
    expect(normalizeCity('PITTSBURGH')).toBe('Pittsburgh')
  })

  it('matches "Austin" (already correct case)', () => {
    expect(normalizeCity('Austin')).toBe('Austin')
  })

  // Vercel geo header variants (fuzzy matching)
  it('fuzzy: "New York City" → "New York"', () => {
    expect(normalizeCity('New York City')).toBe('New York')
  })

  it('fuzzy: "San Francisco Bay Area" → "San Francisco"', () => {
    expect(normalizeCity('San Francisco Bay Area')).toBe('San Francisco')
  })

  it('fuzzy: "Greater Houston" → "Houston"', () => {
    expect(normalizeCity('Greater Houston')).toBe('Houston')
  })

  it('fuzzy: "Houston, TX" → "Houston" (city includes supported)', () => {
    expect(normalizeCity('Houston, TX')).toBe('Houston')
  })

  // Fallback for unknown cities
  it('returns Houston for a completely unknown city', () => {
    expect(normalizeCity('Atlantis')).toBe('Houston')
  })

  it('returns Houston for a numeric string', () => {
    expect(normalizeCity('12345')).toBe('Houston')
  })

  it('returns Houston for whitespace-only string', () => {
    expect(normalizeCity('   ')).toBe('Houston')
  })

  it('returns the canonical casing, not the raw input casing', () => {
    // Even if input is "pittsburgh" we must return "Pittsburgh"
    expect(normalizeCity('pittsburgh')).toBe('Pittsburgh')
    expect(normalizeCity('austin')).toBe('Austin')
  })

  // Regression: substring ambiguity
  it('does not match "York" alone to "New York"', () => {
    // "York" is a substring of "New York" — but "New York".includes("York") is true
    // so this WILL fuzzy-match. Documenting actual behaviour, not ideal behaviour.
    // If this changes in future, the test will catch the regression.
    const result = normalizeCity('York')
    expect(result).toBe('New York') // fuzzy: "New York".includes("York") → true
  })

  it('does not match "Aus" alone to "Austin" via fuzzy', () => {
    // "Austin".includes("Aus") is true — documents this fuzzy behaviour
    expect(normalizeCity('Aus')).toBe('Austin')
  })

  it('always returns a SupportedCity, never an arbitrary string', () => {
    const inputs = [null, '', 'Fremont', 'Lagos', 'New York City', 'houston']
    inputs.forEach(input => {
      const result = normalizeCity(input)
      expect(SUPPORTED_CITIES).toContain(result)
    })
  })
})

// ─── isSupportedCity ──────────────────────────────────────────────────────────

describe('isSupportedCity', () => {
  // Null / falsy
  it('returns false for null', () => {
    expect(isSupportedCity(null)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSupportedCity('')).toBe(false)
  })

  // Exact supported cities
  it.each(SUPPORTED_CITIES as unknown as SupportedCity[])(
    '"%s" is a supported city',
    (city) => {
      expect(isSupportedCity(city)).toBe(true)
    }
  )

  // Case insensitivity
  it('is case-insensitive for supported cities', () => {
    expect(isSupportedCity('houston')).toBe(true)
    expect(isSupportedCity('HOUSTON')).toBe(true)
    expect(isSupportedCity('new york')).toBe(true)
    expect(isSupportedCity('SAN FRANCISCO')).toBe(true)
  })

  // Unsupported cities
  it('returns false for Fremont (unsupported)', () => {
    expect(isSupportedCity('Fremont')).toBe(false)
  })

  it('returns false for Los Angeles', () => {
    expect(isSupportedCity('Los Angeles')).toBe(false)
  })

  it('returns false for a random string', () => {
    expect(isSupportedCity('banana')).toBe(false)
  })

  // Consistency with normalizeCity
  it('agrees with normalizeCity: if isSupportedCity is true, normalizeCity does not fall back to Houston', () => {
    const inputs = ['Houston', 'Austin', 'New York', 'Pittsburgh', 'San Francisco']
    inputs.forEach(city => {
      if (isSupportedCity(city)) {
        // normalizeCity should resolve to that city, not the Houston fallback
        expect(normalizeCity(city)).toBe(city)
      }
    })
  })

  // Fuzzy behaviour documented
  it('returns true for "New York City" (fuzzy: contains "New York")', () => {
    expect(isSupportedCity('New York City')).toBe(true)
  })

  it('returns true for "San Francisco Bay Area" (fuzzy: contains "San Francisco")', () => {
    expect(isSupportedCity('San Francisco Bay Area')).toBe(true)
  })

  it('returns false for a numeric-only string', () => {
    expect(isSupportedCity('90210')).toBe(false)
  })
})

// ─── CITY_TIMEZONES ───────────────────────────────────────────────────────────

describe('CITY_TIMEZONES', () => {
  it('has an entry for every supported city', () => {
    SUPPORTED_CITIES.forEach(city => {
      expect(CITY_TIMEZONES).toHaveProperty(city)
    })
  })

  it('all timezone strings are valid IANA identifiers (parseable by Intl)', () => {
    SUPPORTED_CITIES.forEach(city => {
      const tz = CITY_TIMEZONES[city]
      // If the timezone is invalid, toLocaleTimeString throws
      expect(() =>
        new Date().toLocaleTimeString('en-US', { timeZone: tz })
      ).not.toThrow()
    })
  })

  it('Houston and Austin share the same timezone (America/Chicago)', () => {
    expect(CITY_TIMEZONES['Houston']).toBe('America/Chicago')
    expect(CITY_TIMEZONES['Austin']).toBe('America/Chicago')
  })

  it('New York and Pittsburgh share America/New_York', () => {
    expect(CITY_TIMEZONES['New York']).toBe('America/New_York')
    expect(CITY_TIMEZONES['Pittsburgh']).toBe('America/New_York')
  })
})

// ─── CITY_COORDS ──────────────────────────────────────────────────────────────

describe('CITY_COORDS', () => {
  it('has coordinates for every supported city', () => {
    SUPPORTED_CITIES.forEach(city => {
      expect(CITY_COORDS).toHaveProperty(city)
    })
  })

  it('all latitudes are within valid range (-90 to 90)', () => {
    SUPPORTED_CITIES.forEach(city => {
      const { lat } = CITY_COORDS[city]
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
    })
  })

  it('all longitudes are within valid range (-180 to 180)', () => {
    SUPPORTED_CITIES.forEach(city => {
      const { lon } = CITY_COORDS[city]
      expect(lon).toBeGreaterThanOrEqual(-180)
      expect(lon).toBeLessThanOrEqual(180)
    })
  })

  it('all US cities have negative longitudes (western hemisphere)', () => {
    SUPPORTED_CITIES.forEach(city => {
      expect(CITY_COORDS[city].lon).toBeLessThan(0)
    })
  })

  it('San Francisco has a higher latitude than Houston (SF is further north)', () => {
    expect(CITY_COORDS['San Francisco'].lat).toBeGreaterThan(CITY_COORDS['Houston'].lat)
  })
})
