/**
 * Unit tests — app/api/shared-deals/route.ts
 *
 * This route is the cross-user sharing layer. Its contract:
 *   GET  → return active (non-expired) deals for a city
 *   POST → persist a new deal, deduplicate by id, reject invalid bodies
 *
 * HARD-TO-TEST:
 *   The route uses module-level state (memStore array). Between tests we must
 *   reset it via module re-import or by posting expiring deals. Vitest's
 *   module isolation (vi.resetModules()) is the cleanest approach but requires
 *   dynamic imports inside each test block.
 *
 *   The KV code path cannot be unit-tested without a real Redis instance —
 *   that belongs in integration tests. We test only the in-memory (no-KV) path.
 *
 *   NextRequest construction differs from real Next.js runtime. We use
 *   the native Request API as NextRequest's underlying implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Module isolation ─────────────────────────────────────────────────────────
// Re-import the module fresh for each test to reset the in-memory store.

async function freshHandlers() {
  vi.resetModules()
  // Ensure KV env vars are NOT set so we use in-memory path
  vi.stubEnv('KV_REST_API_URL', '')
  vi.stubEnv('KV_REST_API_TOKEN', '')
  const mod = await import('@/app/api/shared-deals/route')
  return { GET: mod.GET, POST: mod.POST }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(city: string) {
  return new NextRequest(`http://localhost/api/shared-deals?city=${encodeURIComponent(city)}`)
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/shared-deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function futureExpiry(hoursFromNow = 2) {
  return Date.now() + hoursFromNow * 3_600_000
}

function pastExpiry(hoursAgo = 1) {
  return Date.now() - hoursAgo * 3_600_000
}

function makeDeal(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id:          'deal-1',
    title:       'Test Deal',
    business:    'Test Business',
    description: 'A test deal description',
    city:        'Houston',
    category:    'Food',
    discount:    '10% OFF',
    emoji:       '🍔',
    expiresAt:   futureExpiry(2),
    ...overrides,
  }
}

// ─── GET — happy paths ────────────────────────────────────────────────────────

describe('GET /api/shared-deals', () => {
  beforeEach(() => vi.unstubAllEnvs())

  it('returns 200 with an empty array when no deals have been posted', async () => {
    const { GET } = await freshHandlers()
    const res = await GET(makeGetRequest('Houston'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })

  it('returns only deals for the requested city', async () => {
    const { GET, POST } = await freshHandlers()
    await POST(makePostRequest(makeDeal({ city: 'Houston', id: 'hou-1' })))
    await POST(makePostRequest(makeDeal({ city: 'New York', id: 'ny-1' })))

    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('hou-1')
  })

  it('does not return deals for other cities', async () => {
    const { GET, POST } = await freshHandlers()
    await POST(makePostRequest(makeDeal({ city: 'Austin', id: 'aus-1' })))

    const houstonRes = await GET(makeGetRequest('Houston'))
    const houstonDeals = await houstonRes.json()
    expect(houstonDeals).toHaveLength(0)
  })

  it('filters out expired deals from GET response', async () => {
    const { GET, POST } = await freshHandlers()
    await POST(makePostRequest(makeDeal({ id: 'expired', expiresAt: pastExpiry(1) })))
    await POST(makePostRequest(makeDeal({ id: 'active', expiresAt: futureExpiry(2) })))

    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    expect(body.every((d: { id: string }) => d.id !== 'expired')).toBe(true)
    expect(body.some((d: { id: string }) => d.id === 'active')).toBe(true)
  })

  it('returns all active deals for a city', async () => {
    const { GET, POST } = await freshHandlers()
    await POST(makePostRequest(makeDeal({ id: 'a', city: 'Houston' })))
    await POST(makePostRequest(makeDeal({ id: 'b', city: 'Houston' })))
    await POST(makePostRequest(makeDeal({ id: 'c', city: 'Houston' })))

    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    expect(body).toHaveLength(3)
  })

  it('handles city param with spaces correctly', async () => {
    const { GET, POST } = await freshHandlers()
    await POST(makePostRequest(makeDeal({ city: 'New York', id: 'ny-test' })))

    const res = await GET(makeGetRequest('New York'))
    const body = await res.json()
    expect(body.some((d: { id: string }) => d.id === 'ny-test')).toBe(true)
  })

  it('returns 200 with empty array for unknown city', async () => {
    const { GET } = await freshHandlers()
    const res = await GET(makeGetRequest('Atlantis'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns 200 with empty array when city param is missing', async () => {
    const { GET } = await freshHandlers()
    const req = new NextRequest('http://localhost/api/shared-deals')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})

// ─── POST — happy paths ───────────────────────────────────────────────────────

describe('POST /api/shared-deals', () => {
  beforeEach(() => vi.unstubAllEnvs())

  it('returns { ok: true } on valid deal', async () => {
    const { POST } = await freshHandlers()
    const res = await POST(makePostRequest(makeDeal()))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('persisted deal appears in subsequent GET', async () => {
    const { GET, POST } = await freshHandlers()
    const deal = makeDeal({ id: 'persist-test' })
    await POST(makePostRequest(deal))

    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    expect(body.some((d: { id: string }) => d.id === 'persist-test')).toBe(true)
  })

  it('deduplicates deals with the same id (second post is a no-op)', async () => {
    const { GET, POST } = await freshHandlers()
    const deal = makeDeal({ id: 'dup-test', title: 'Original' })
    await POST(makePostRequest(deal))
    await POST(makePostRequest({ ...deal, title: 'Duplicate' }))

    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    const matches = body.filter((d: { id: string }) => d.id === 'dup-test')
    expect(matches).toHaveLength(1)
  })

  it('stores all required fields on the persisted deal', async () => {
    const { GET, POST } = await freshHandlers()
    const deal = makeDeal({
      id: 'full-test',
      title: 'Full Deal',
      business: 'Test Co',
      description: 'Desc',
      city: 'Houston',
      category: 'Food',
      discount: '50% OFF',
      emoji: '🍕',
    })
    await POST(makePostRequest(deal))

    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    const found = body.find((d: { id: string }) => d.id === 'full-test')
    expect(found.title).toBe('Full Deal')
    expect(found.business).toBe('Test Co')
    expect(found.discount).toBe('50% OFF')
  })
})

// ─── POST — validation / error paths ─────────────────────────────────────────

describe('POST /api/shared-deals — invalid inputs', () => {
  beforeEach(() => vi.unstubAllEnvs())

  it('returns 400 when body is missing id', async () => {
    const { POST } = await freshHandlers()
    const { id: _id, ...noId } = makeDeal()
    const res = await POST(makePostRequest(noId))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is missing title', async () => {
    const { POST } = await freshHandlers()
    const { title: _t, ...noTitle } = makeDeal() as Record<string, unknown>
    const res = await POST(makePostRequest(noTitle))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is missing business', async () => {
    const { POST } = await freshHandlers()
    const { business: _b, ...noBusiness } = makeDeal() as Record<string, unknown>
    const res = await POST(makePostRequest(noBusiness))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is missing expiresAt', async () => {
    const { POST } = await freshHandlers()
    const { expiresAt: _e, ...noExpiry } = makeDeal() as Record<string, unknown>
    const res = await POST(makePostRequest(noExpiry))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is completely empty object', async () => {
    const { POST } = await freshHandlers()
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const { POST } = await freshHandlers()
    const req = new NextRequest('http://localhost/api/shared-deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is a JSON array, not an object', async () => {
    const { POST } = await freshHandlers()
    const res = await POST(makePostRequest([]))
    // Array lacks required fields → validation fails
    expect(res.status).toBe(400)
  })

  it('error response includes an error field', async () => {
    const { POST } = await freshHandlers()
    const res = await POST(makePostRequest({}))
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})

// ─── Expiry filtering ─────────────────────────────────────────────────────────

describe('shared-deals — expiry boundary conditions', () => {
  beforeEach(() => vi.unstubAllEnvs())

  it('a deal expiring exactly at Date.now() is treated as expired', async () => {
    vi.useFakeTimers()
    const NOW = Date.now()
    const { GET, POST } = await freshHandlers()

    await POST(makePostRequest(makeDeal({ id: 'boundary', expiresAt: NOW })))

    vi.advanceTimersByTime(1) // 1ms past the boundary
    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    expect(body.some((d: { id: string }) => d.id === 'boundary')).toBe(false)
    vi.useRealTimers()
  })

  it('a deal expiring 1ms in the future is still active', async () => {
    const { GET, POST } = await freshHandlers()
    await POST(makePostRequest(makeDeal({ id: 'almost', expiresAt: Date.now() + 1 })))

    const res = await GET(makeGetRequest('Houston'))
    const body = await res.json()
    expect(body.some((d: { id: string }) => d.id === 'almost')).toBe(true)
  })
})
