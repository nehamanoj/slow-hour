import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/shared-deals  — broadcast a new deal to all connected clients
 * GET  /api/shared-deals  — fetch all active shared deals for a city
 *
 * STORAGE STRATEGY — two-tier with automatic fallback:
 *
 * Tier 1 (production): Vercel KV (Redis)
 *   Deals are written to a KV key per city. Because KV is a shared,
 *   persistent store outside any single serverless instance, every
 *   Vercel function replica reads and writes the same data — so a deal
 *   added from Houston is immediately visible to a visitor in California.
 *
 *   To enable: Vercel dashboard → your project → Storage → Create KV →
 *   Connect to project. Vercel auto-injects KV_REST_API_URL and
 *   KV_REST_API_TOKEN as env vars. Redeploy and cross-user sync works.
 *
 * Tier 2 (local dev / KV not configured): in-process memory
 *   Falls back to a module-level array. Works within a single Node.js
 *   instance — fine for local development, not for cross-user sharing on
 *   a multi-instance deployment.
 *
 * This pattern — code-level abstraction with env-var detection — is how
 * you'd pitch this to a customer: "zero extra infrastructure for dev,
 * one dashboard click to go production-grade."
 */

export type SharedDeal = {
  id:          string
  title:       string
  business:    string
  description: string
  city:        string
  category:    string
  discount:    string
  emoji:       string
  /** Absolute UTC ms timestamp — all clients see the same countdown */
  expiresAt:   number
}

// ── Storage abstraction ───────────────────────────────────────────────────────

const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

// In-memory fallback — single instance only
const memStore: SharedDeal[] = []

function cityKey(city: string) {
  return `shared-deals:${city.toLowerCase().replace(/\s+/g, '-')}`
}

/*
 * kvImport: uses new Function() so Turbopack/webpack cannot statically
 * analyse the import specifier. This prevents "Module not found" warnings
 * when @vercel/kv isn't installed locally (the package is only needed in
 * production where Vercel installs it automatically). The try/catch below
 * handles the runtime fallback to in-memory when the package is absent.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const kvImport = new Function('m', 'return import(m)')

async function fetchCity(city: string): Promise<SharedDeal[]> {
  if (hasKV) {
    try {
      const { kv } = await kvImport('@vercel/kv')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const deals = ((await kv.get(cityKey(city))) as SharedDeal[] | null) ?? []
      return deals.filter((d: SharedDeal) => d.expiresAt > Date.now())
    } catch {
      // @vercel/kv not installed locally — fall through to in-memory store
    }
  }
  return memStore.filter(
    d => d.city.toLowerCase() === city.toLowerCase() && d.expiresAt > Date.now()
  )
}

async function persistDeal(deal: SharedDeal): Promise<void> {
  if (hasKV) {
    try {
      const { kv } = await kvImport('@vercel/kv')
      const key = cityKey(deal.city)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const existing = ((await kv.get(key)) as SharedDeal[] | null) ?? []

      // Deduplicate + evict expired in one pass
      const now = Date.now()
      const updated = existing.filter((d: SharedDeal) => d.expiresAt > now && d.id !== deal.id)
      updated.push(deal)

      // TTL on the KV key = 24h (deals themselves carry their own expiresAt)
      await kv.set(key, updated, { ex: 86400 })
      return
    } catch {
      // @vercel/kv not installed locally — fall through to in-memory store
    }
  }
  if (!memStore.find(d => d.id === deal.id)) {
    memStore.push(deal)
  }
}

function evictMemExpired() {
  const now = Date.now()
  let i = memStore.length
  while (i--) {
    if (memStore[i].expiresAt <= now) memStore.splice(i, 1)
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!hasKV) evictMemExpired()

  const city  = req.nextUrl.searchParams.get('city') ?? ''
  const deals = await fetchCity(city)

  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SharedDeal

    if (!body.id || !body.title || !body.business || !body.expiresAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await persistDeal(body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}
