import { SUPPORTED_CITIES } from './types'
import type { SupportedCity } from './types'

// iana timezone per city — topbar uses this to show city-local time.
// when someone switches to sf they should see sf time (4pm), not their own (7pm).
export const CITY_TIMEZONES: Record<SupportedCity, string> = {
  Houston:         'America/Chicago',
  'San Francisco': 'America/Los_Angeles',
  'New York':      'America/New_York',
  Pittsburgh:      'America/New_York',
  Austin:          'America/Chicago',
}

// lat/lon for each city — passed to open-meteo for weather calls
export const CITY_COORDS: Record<SupportedCity, { lat: number; lon: number }> = {
  Houston:         { lat: 29.7604, lon: -95.3698 },
  'San Francisco': { lat: 37.7749, lon: -122.4194 },
  'New York':      { lat: 40.7128, lon: -74.006 },
  Pittsburgh:      { lat: 40.4406, lon: -79.9959 },
  Austin:          { lat: 30.2672, lon: -97.7431 },
}

// returns true if a raw city string resolves to one of our supported cities.
// uses the same matching logic as normalizeCity so they never disagree.
// called in page.tsx to decide whether to show the unsupported city state.
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

// normalize a raw city string to one of our supported cities, falls back to houston.
//
// needed because x-vercel-ip-city comes from an ip geolocation db that can
// return "new york city" instead of "new york", "san francisco bay area", etc.
// fuzzy match handles those variations.
export function normalizeCity(rawCity: string | null): SupportedCity {
  if (!rawCity) return 'Houston'

  // exact match first (case-insensitive)
  const exact = SUPPORTED_CITIES.find(
    (c) => c.toLowerCase() === rawCity.toLowerCase()
  )
  if (exact) return exact

  // fuzzy match: handle "New York City", "San Francisco Bay Area", etc.
  const fuzzy = SUPPORTED_CITIES.find(
    (c) =>
      rawCity.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(rawCity.toLowerCase())
  )

  return fuzzy ?? 'Houston'
}
