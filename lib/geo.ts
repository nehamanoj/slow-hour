import { SUPPORTED_CITIES } from './types'
import type { SupportedCity } from './types'

/**
 * IANA timezone identifiers for each supported city.
 * Used by TopBar to display the correct local time per city via Intl.
 *
 * Why not just use the user's local timezone?
 * Because when a user in New York switches to "San Francisco" they expect
 * to see SF time (4pm) not NY time (7pm). The time chip is a city context
 * indicator, not a "what time is it for me" indicator.
 */
export const CITY_TIMEZONES: Record<SupportedCity, string> = {
  Houston:         'America/Chicago',
  'San Francisco': 'America/Los_Angeles',
  'New York':      'America/New_York',
  Pittsburgh:      'America/New_York',
  Austin:          'America/Chicago',
}

/**
 * Latitude/longitude for each supported city.
 * Used by the Open-Meteo weather API (no API key required).
 */
export const CITY_COORDS: Record<SupportedCity, { lat: number; lon: number }> = {
  Houston:         { lat: 29.7604, lon: -95.3698 },
  'San Francisco': { lat: 37.7749, lon: -122.4194 },
  'New York':      { lat: 40.7128, lon: -74.006 },
  Pittsburgh:      { lat: 40.4406, lon: -79.9959 },
  Austin:          { lat: 30.2672, lon: -97.7431 },
}

/**
 * Returns true if a raw city string resolves to one of our supported cities.
 * Uses the same matching logic as normalizeCity so the two never disagree.
 * Use this in page.tsx to decide whether to show the "quiet city" state.
 */
export function isSupportedCity(city: string | null): boolean {
  if (!city) return false
  const lower = city.toLowerCase()
  return SUPPORTED_CITIES.some(
    (c) =>
      c.toLowerCase() === lower ||
      lower.includes(c.toLowerCase()) ||
      c.toLowerCase().includes(lower)
  )
}

/**
 * Normalize a raw city string (from Vercel's geo header) to one of our
 * supported cities. Falls back to Houston if no match is found.
 *
 * Why fuzzy matching?
 * Vercel's x-vercel-ip-city header returns the city as reported by the
 * IP geolocation database — this can include suffixes like "City" or
 * abbreviations that don't exactly match our city names.
 *
 * Example: "New York City" → "New York"
 */
export function normalizeCity(rawCity: string | null): SupportedCity {
  if (!rawCity) return 'Houston'

  // Exact match first (case-insensitive)
  const exact = SUPPORTED_CITIES.find(
    (c) => c.toLowerCase() === rawCity.toLowerCase()
  )
  if (exact) return exact

  // Fuzzy match: handle "New York City", "San Francisco Bay Area", etc.
  const fuzzy = SUPPORTED_CITIES.find(
    (c) =>
      rawCity.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(rawCity.toLowerCase())
  )

  return fuzzy ?? 'Houston'
}
