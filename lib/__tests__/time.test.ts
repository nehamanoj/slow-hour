/**
 * Unit tests — time.ts
 *
 * formatCountdown drives the live countdown on every DealCard.
 * A wrong format doesn't crash the app — it silently shows bad copy to users,
 * which makes these tests high priority despite the code looking simple.
 *
 * computeExpiryTimestamp is the only place expiresInHours → absolute ms
 * conversion happens. A bug here makes all timers wrong by a factor.
 *
 * getUrgencyLevel controls visual styling (red/amber/normal). Wrong thresholds
 * mean urgency cues fire at the wrong time, reducing their effectiveness.
 *
 * HARD-TO-TEST NOTE:
 *   All three functions call Date.now() internally (either directly or via
 *   comparison). Tests use vi.setSystemTime() to freeze time, which requires
 *   the fakeTimers setup. Any test that doesn't freeze time is inherently
 *   flaky because wall-clock seconds can tick between assertion lines.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatCountdown, computeExpiryTimestamp, getUrgencyLevel } from '../time'

// ─── formatCountdown ──────────────────────────────────────────────────────────

describe('formatCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const NOW = new Date('2024-01-01T12:00:00.000Z').getTime()

  // Expired / boundary
  it('returns "Expired" when diff is exactly 0', () => {
    expect(formatCountdown(NOW)).toBe('Expired')
  })

  it('returns "Expired" when diff is negative (past expiry)', () => {
    expect(formatCountdown(NOW - 1000)).toBe('Expired')
    expect(formatCountdown(NOW - 999999)).toBe('Expired')
  })

  it('returns "Expired" for a timestamp far in the past', () => {
    expect(formatCountdown(0)).toBe('Expired')
  })

  // Seconds-only format (< 1 minute remaining)
  it('formats 30 seconds remaining as "30s"', () => {
    expect(formatCountdown(NOW + 30_000)).toBe('30s')
  })

  it('formats 1 second remaining as "1s"', () => {
    expect(formatCountdown(NOW + 1_000)).toBe('1s')
  })

  it('formats 59 seconds remaining as "59s"', () => {
    expect(formatCountdown(NOW + 59_000)).toBe('59s')
  })

  // Minutes + seconds format (1 min ≤ diff < 1 hour)
  it('formats 1 minute exactly as "1m 0s"', () => {
    expect(formatCountdown(NOW + 60_000)).toBe('1m 0s')
  })

  it('formats 90 seconds as "1m 30s"', () => {
    expect(formatCountdown(NOW + 90_000)).toBe('1m 30s')
  })

  it('formats 5 minutes 15 seconds as "5m 15s"', () => {
    expect(formatCountdown(NOW + (5 * 60 + 15) * 1000)).toBe('5m 15s')
  })

  it('formats 59 minutes 59 seconds as "59m 59s"', () => {
    expect(formatCountdown(NOW + (59 * 60 + 59) * 1000)).toBe('59m 59s')
  })

  // Hours + minutes format (≥ 1 hour)
  it('formats exactly 1 hour as "1h 0m"', () => {
    expect(formatCountdown(NOW + 3_600_000)).toBe('1h 0m')
  })

  it('formats 1 hour 30 minutes as "1h 30m"', () => {
    expect(formatCountdown(NOW + 90 * 60_000)).toBe('1h 30m')
  })

  it('formats 3 hours as "3h 0m"', () => {
    expect(formatCountdown(NOW + 3 * 3_600_000)).toBe('3h 0m')
  })

  it('formats 23 hours 59 minutes as "23h 59m"', () => {
    expect(formatCountdown(NOW + (23 * 60 + 59) * 60_000)).toBe('23h 59m')
  })

  it('does not show seconds in hours format (only h and m)', () => {
    // 1h 30m 45s should display as "1h 30m", not "1h 30m 45s"
    const result = formatCountdown(NOW + (90 * 60 + 45) * 1000)
    expect(result).toBe('1h 30m')
    expect(result).not.toContain('s')
  })

  // Format transition boundary — exactly at 1 hour
  it('switches from "Xm Xs" to "Xh Xm" format at exactly 3600 seconds', () => {
    const justUnder = formatCountdown(NOW + 3_599_000) // 59m 59s
    const exactlyAt = formatCountdown(NOW + 3_600_000) // 1h 0m
    expect(justUnder).toMatch(/^\d+m \d+s$/)
    expect(exactlyAt).toMatch(/^\d+h \d+m$/)
  })

  // Format string shape assertions (regression guards)
  it('hours format always contains "h" and "m"', () => {
    const result = formatCountdown(NOW + 2 * 3_600_000)
    expect(result).toContain('h')
    expect(result).toContain('m')
  })

  it('minutes format always contains "m" and "s"', () => {
    const result = formatCountdown(NOW + 300_000) // 5 minutes
    expect(result).toContain('m')
    expect(result).toContain('s')
  })

  it('seconds-only format ends with "s" and contains no "m" or "h"', () => {
    const result = formatCountdown(NOW + 45_000)
    expect(result).toMatch(/^\d+s$/)
  })
})

// ─── computeExpiryTimestamp ───────────────────────────────────────────────────

describe('computeExpiryTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const NOW = new Date('2024-01-01T12:00:00.000Z').getTime()

  it('converts 1 hour to correct ms offset from now', () => {
    expect(computeExpiryTimestamp(1)).toBe(NOW + 3_600_000)
  })

  it('converts 0.5 hours (30 minutes) correctly', () => {
    expect(computeExpiryTimestamp(0.5)).toBe(NOW + 1_800_000)
  })

  it('converts 24 hours correctly', () => {
    expect(computeExpiryTimestamp(24)).toBe(NOW + 86_400_000)
  })

  it('converts 0 hours to exactly now', () => {
    expect(computeExpiryTimestamp(0)).toBe(NOW)
  })

  it('result is always greater than Date.now() for positive input', () => {
    const result = computeExpiryTimestamp(1)
    expect(result).toBeGreaterThan(Date.now())
  })

  it('result equals Date.now() for 0 hours (deal expiring immediately)', () => {
    expect(computeExpiryTimestamp(0)).toBe(Date.now())
  })

  it('is invertible: timestamp minus now equals input hours in ms', () => {
    const hours = 2.5
    const result = computeExpiryTimestamp(hours)
    const diff = result - Date.now()
    expect(diff).toBeCloseTo(hours * 3_600_000, -1)
  })

  it('handles fractional hours (e.g. 0.75 = 45 minutes)', () => {
    expect(computeExpiryTimestamp(0.75)).toBe(NOW + 2_700_000)
  })
})

// ─── getUrgencyLevel ──────────────────────────────────────────────────────────

describe('getUrgencyLevel', () => {
  // Critical boundary: ≤ 1 hour
  it('returns "critical" for exactly 1 hour', () => {
    expect(getUrgencyLevel(1)).toBe('critical')
  })

  it('returns "critical" for 0 hours', () => {
    expect(getUrgencyLevel(0)).toBe('critical')
  })

  it('returns "critical" for 30 minutes (0.5h)', () => {
    expect(getUrgencyLevel(0.5)).toBe('critical')
  })

  it('returns "critical" for negative hours (already expired)', () => {
    // Expired deals should still receive the "critical" styling
    expect(getUrgencyLevel(-1)).toBe('critical')
  })

  // Urgent boundary: 1h < x ≤ 3h
  it('returns "urgent" for exactly 3 hours', () => {
    expect(getUrgencyLevel(3)).toBe('urgent')
  })

  it('returns "urgent" for 2 hours', () => {
    expect(getUrgencyLevel(2)).toBe('urgent')
  })

  it('returns "urgent" for 1.5 hours', () => {
    expect(getUrgencyLevel(1.5)).toBe('urgent')
  })

  it('returns "urgent" for just above 1 hour (1.001h)', () => {
    expect(getUrgencyLevel(1.001)).toBe('urgent')
  })

  // Normal: > 3 hours
  it('returns "normal" for just above 3 hours (3.001h)', () => {
    expect(getUrgencyLevel(3.001)).toBe('normal')
  })

  it('returns "normal" for 5 hours', () => {
    expect(getUrgencyLevel(5)).toBe('normal')
  })

  it('returns "normal" for 24 hours', () => {
    expect(getUrgencyLevel(24)).toBe('normal')
  })

  it('returns "normal" for 72 hours', () => {
    expect(getUrgencyLevel(72)).toBe('normal')
  })

  // Return value type
  it('always returns one of the three valid levels', () => {
    const valid = ['critical', 'urgent', 'normal']
    const inputs = [-1, 0, 0.5, 1, 1.5, 2, 3, 3.001, 5, 24, 100]
    inputs.forEach(h => {
      expect(valid).toContain(getUrgencyLevel(h))
    })
  })

  // Boundary precision: exactly at the thresholds
  it('1h is critical, not urgent (≤ 1 is critical)', () => {
    expect(getUrgencyLevel(1)).toBe('critical')
  })

  it('3h is urgent, not normal (≤ 3 is urgent)', () => {
    expect(getUrgencyLevel(3)).toBe('urgent')
  })
})
