import { NextRequest, NextResponse } from 'next/server'

// POST /api/shared-deals  — broadcast a new deal to all connected clients
// GET  /api/shared-deals  — fetch all active shared deals for a city
//
// storage strategy — two-tier with automatic fallback:
//
// tier 1 (production): Vercel KV aka now (Redis)
//   deals are written to a KV key per city. because KV is a shared,
//   persistent store outside any single serverless instance, every
//   vercel function replica reads and writes the same data — so a deal
//   added from houston is immediately visible to a visitor in california.
//
//   to enable: vercel dashboard → your project → Storage → Create KV →
//   Connect to project. vercel auto-injects KV_REST_API_URL and
//   KV_REST_API_TOKEN as env vars. redeploy and cross-user sync works.
//
// tier 2 (local dev / KV not configured): in-process memory
//   falls back to a module-level array. works within a single Node.js
//   instance — fine for local dev, not for cross-user sharing on
//   a multi-instance deployment.
//
// pitch to a customer: "zero extra infrastructure for dev,
// one dashboard click to go production-grade."

export type SharedDeal = {
  id:          string
  title:       string
  business:    string
  description: string
  city:        string
  category:    string
  discount:    string
  emoji:       string
  /** absolute UTC ms timestamp — all clients see the same countdown */
  expiresAt:   number
}

// ── storage abstraction ───────────────────────────────────────────────────────

const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

// in-memory fallback — single instance only
const memStore: SharedDeal[] = []

function cityKey(city: string) {
  return `shared-deals:${city.toLowerCase().replace(/\s+/g, '-')}`
}

// kvImport: uses new Function() so turbopack/webpack can't statically
// analyse the import specifier. prevents "module not found" warnings
// when @vercel/kv isn't installed locally. try/catch handles the runtime
// fallback to in-memory when the package is absent.
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

      // deduplicate + evict expired in one pass
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

// ── route handlers ────────────────────────────────────────────────────────────

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
