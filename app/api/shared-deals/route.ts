import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/shared-deals  — broadcast a new custom deal to all connected clients
 * GET  /api/shared-deals  — fetch all active shared deals for a given city
 *
 * ARCHITECTURE NOTE — in-process store:
 * This uses a module-level array, which persists across requests within the
 * same Node.js instance. In a multi-instance production deployment (Vercel
 * auto-scaling) deals posted to one instance won't appear on others.
 *
 * For production: swap this for Vercel KV or Upstash Redis — same API shape,
 * just replace the array operations with kv.lpush / kv.lrange.
 * For a single-region demo this is zero-config and completely sufficient.
 *
 * This route intentionally does NOT set `export const runtime = 'edge'`
 * because Edge isolates are stateless — module-level data would not persist.
 */

export type SharedDeal = {
  id: string
  title: string
  business: string
  description: string
  city: string
  category: string
  discount: string
  emoji: string
  /** Absolute UTC timestamp in ms — consistent across all clients */
  expiresAt: number
}

// Module-level store. Lives as long as the serverless function instance is warm.
const store: SharedDeal[] = []

function evictExpired() {
  const now = Date.now()
  let i = store.length
  while (i--) {
    if (store[i].expiresAt <= now) store.splice(i, 1)
  }
}

export async function GET(req: NextRequest) {
  evictExpired()
  const city = req.nextUrl.searchParams.get('city') ?? ''
  const deals = city
    ? store.filter(d => d.city.toLowerCase() === city.toLowerCase())
    : store
  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SharedDeal

    if (!body.id || !body.title || !body.business || !body.expiresAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    evictExpired()

    // Idempotent — ignore duplicates (same user might POST on reconnect)
    if (!store.find(d => d.id === body.id)) {
      store.push(body)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}
