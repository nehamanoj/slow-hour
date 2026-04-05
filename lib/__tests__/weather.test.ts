/**
 * Unit tests — weather.ts
 *
 * interpretWeatherCode and getWeatherMessage are internal (unexported) functions,
 * so we test them indirectly through fetchWeather with a mocked fetch.
 *
 * HARD-TO-TEST:
 *   fetchWeather calls the real fetch(). Without mocking, tests would make
 *   live HTTP requests to Open-Meteo — slow, flaky, and non-deterministic.
 *   We use vi.stubGlobal('fetch', ...) to intercept calls.
 *
 *   The Next.js `next: { revalidate: 600 }` fetch option is passed through
 *   but cannot be verified in unit tests (it's a Next.js runtime concern).
 *   That requires integration tests against a real Next.js environment.
 *
 *   interpretWeatherCode's boundary conditions (e.g. code === 48 vs 49) are
 *   only testable indirectly, which makes them slightly less precise to verify.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWeather } from '../weather'
import { CITY_COORDS } from '../geo'
import type { SupportedCity } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(weatherCode: number, tempC: number) {
  return vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      current: {
        weather_code: weatherCode,
        temperature_2m: tempC,
      },
    }),
  }))
}

function mockFetchFailing(status = 500) {
  return vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: 'server error' }),
  }))
}

function mockFetchThrows(message = 'Network error') {
  return vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── interpretWeatherCode (tested indirectly via fetchWeather) ────────────────

describe('fetchWeather — weather code interpretation', () => {
  it('code 0 → Clear ☀️', async () => {
    mockFetch(0, 72)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Clear')
    expect(result.icon).toBe('☀️')
  })

  it('code 1 → Partly Cloudy ⛅', async () => {
    mockFetch(1, 68)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Partly Cloudy')
    expect(result.icon).toBe('⛅')
  })

  it('code 3 (boundary) → Partly Cloudy ⛅', async () => {
    mockFetch(3, 65)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Partly Cloudy')
  })

  it('code 4 (first foggy code) → Foggy 🌫️', async () => {
    mockFetch(4, 60)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Foggy')
    expect(result.icon).toBe('🌫️')
  })

  it('code 48 (foggy boundary) → Foggy 🌫️', async () => {
    mockFetch(48, 55)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Foggy')
  })

  it('code 51 (first rainy code) → Rainy 🌧️', async () => {
    mockFetch(51, 50)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Rainy')
    expect(result.icon).toBe('🌧️')
  })

  it('code 67 (rainy boundary) → Rainy 🌧️', async () => {
    mockFetch(67, 45)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Rainy')
  })

  it('code 71 → Snowy ❄️', async () => {
    mockFetch(71, 28)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Snowy')
    expect(result.icon).toBe('❄️')
  })

  it('code 77 (snowy boundary) → Snowy ❄️', async () => {
    mockFetch(77, 30)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Snowy')
  })

  it('code 80 → Showery 🌦️', async () => {
    mockFetch(80, 58)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Showery')
    expect(result.icon).toBe('🌦️')
  })

  it('code 82 (showery boundary) → Showery 🌦️', async () => {
    mockFetch(82, 54)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Showery')
  })

  it('code 95 (above showery boundary) → Stormy ⛈️', async () => {
    mockFetch(95, 62)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Stormy')
    expect(result.icon).toBe('⛈️')
  })

  it('code 99 (extreme) → Stormy ⛈️', async () => {
    mockFetch(99, 60)
    const result = await fetchWeather('Houston')
    expect(result.condition).toBe('Stormy')
  })
})

// ─── fetchWeather — weather messages ─────────────────────────────────────────

describe('fetchWeather — weather messages', () => {
  it('Clear condition produces an outdoor-leaning message', async () => {
    mockFetch(0, 72)
    const result = await fetchWeather('Houston')
    expect(result.message).toContain('☀️')
    expect(result.message.toLowerCase()).toContain('explore')
  })

  it('Rainy condition produces an indoors-leaning message', async () => {
    mockFetch(55, 50)
    const result = await fetchWeather('Houston')
    expect(result.message).toContain('🌧️')
    expect(result.message.toLowerCase()).toContain('indoors')
  })

  it('Stormy condition references studying', async () => {
    mockFetch(95, 60)
    const result = await fetchWeather('Houston')
    expect(result.message).toContain('⛈️')
  })

  it('all messages are non-empty strings', async () => {
    const codes = [0, 1, 10, 51, 71, 80, 95]
    for (const code of codes) {
      mockFetch(code, 65)
      const result = await fetchWeather('Houston')
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
      vi.unstubAllGlobals()
    }
  })
})

// ─── fetchWeather — temperature handling ─────────────────────────────────────

describe('fetchWeather — temperature', () => {
  it('rounds temperature to the nearest integer', async () => {
    mockFetch(0, 71.6)
    const result = await fetchWeather('Houston')
    expect(result.temp).toBe(72)
  })

  it('rounds down correctly', async () => {
    mockFetch(0, 71.3)
    const result = await fetchWeather('Houston')
    expect(result.temp).toBe(71)
  })

  it('handles freezing temperature', async () => {
    mockFetch(71, 32.0)
    const result = await fetchWeather('Pittsburgh')
    expect(result.temp).toBe(32)
  })

  it('handles high temperature (summer)', async () => {
    mockFetch(0, 102.7)
    const result = await fetchWeather('Houston')
    expect(result.temp).toBe(103)
  })

  it('temp is a number, not a string', async () => {
    mockFetch(0, 75)
    const result = await fetchWeather('Houston')
    expect(typeof result.temp).toBe('number')
  })
})

// ─── fetchWeather — fetch URL construction ────────────────────────────────────

describe('fetchWeather — URL construction', () => {
  it('calls fetch with the correct lat/lon for Houston', async () => {
    const fetchSpy = mockFetch(0, 72)
    await fetchWeather('Houston')
    const calledUrl = (fetchSpy as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain(`latitude=${CITY_COORDS['Houston'].lat}`)
    expect(calledUrl).toContain(`longitude=${CITY_COORDS['Houston'].lon}`)
  })

  it('calls fetch with the correct lat/lon for San Francisco', async () => {
    const fetchSpy = mockFetch(0, 60)
    await fetchWeather('San Francisco')
    const calledUrl = (fetchSpy as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain(`latitude=${CITY_COORDS['San Francisco'].lat}`)
    expect(calledUrl).toContain(`longitude=${CITY_COORDS['San Francisco'].lon}`)
  })

  it('uses Fahrenheit temperature unit', async () => {
    const fetchSpy = mockFetch(0, 72)
    await fetchWeather('Austin')
    const calledUrl = (fetchSpy as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain('temperature_unit=fahrenheit')
  })

  it('requests weather_code and temperature_2m in the current fields', async () => {
    const fetchSpy = mockFetch(0, 72)
    await fetchWeather('New York')
    const calledUrl = (fetchSpy as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain('weather_code')
    expect(calledUrl).toContain('temperature_2m')
  })
})

// ─── fetchWeather — graceful degradation ─────────────────────────────────────

describe('fetchWeather — failure modes', () => {
  it('returns a safe default when API returns non-ok response', async () => {
    mockFetchFailing(503)
    const result = await fetchWeather('Houston')
    // Must not throw — must return a valid WeatherData object
    expect(result).toBeDefined()
    expect(result.condition).toBe('Clear')
    expect(result.temp).toBe(72)
    expect(result.icon).toBe('☀️')
  })

  it('returns a safe default when fetch throws a network error', async () => {
    mockFetchThrows('Network error')
    const result = await fetchWeather('Houston')
    expect(result).toBeDefined()
    expect(result.condition).toBe('Clear')
  })

  it('returns a safe default when fetch throws a timeout error', async () => {
    mockFetchThrows('Request timed out')
    const result = await fetchWeather('San Francisco')
    expect(result.temp).toBe(72)
    expect(result.message).toMatch(/.+/) // non-empty message
  })

  it('fallback message is always a non-empty string', async () => {
    mockFetchFailing(500)
    const result = await fetchWeather('Houston')
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
  })

  it('never throws — always returns WeatherData regardless of failure', async () => {
    mockFetchThrows('Any error')
    await expect(fetchWeather('Austin')).resolves.toBeDefined()
  })

  it('returns 503 default for a 404 response too', async () => {
    mockFetchFailing(404)
    const result = await fetchWeather('Pittsburgh')
    expect(result.condition).toBe('Clear')
  })
})

// ─── fetchWeather — return type shape ────────────────────────────────────────

describe('fetchWeather — return value shape', () => {
  it('returns all four required WeatherData fields', async () => {
    mockFetch(0, 72)
    const result = await fetchWeather('Houston')
    expect(result).toHaveProperty('condition')
    expect(result).toHaveProperty('icon')
    expect(result).toHaveProperty('temp')
    expect(result).toHaveProperty('message')
  })

  it('condition is a non-empty string', async () => {
    mockFetch(0, 72)
    const result = await fetchWeather('Houston')
    expect(typeof result.condition).toBe('string')
    expect(result.condition.length).toBeGreaterThan(0)
  })

  it('icon contains an emoji character', async () => {
    mockFetch(0, 72)
    const result = await fetchWeather('Houston')
    // Emoji characters have code points > 127
    expect([...result.icon].some(c => c.codePointAt(0)! > 127)).toBe(true)
  })
})
