import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'
import { normalizeCity } from '@/lib/geo'

// GET /api/weather?city=Houston
//
// used by topbar (client component) to display current weather after mount,
// without blocking the initial server render.
//
// why a separate api route instead of server props?
// topbar is 'use client' (needs useEffect for the live clock). passing weather
// as a server prop would require topbar's parent to await the fetch —
// which blocks the static shell. this way weather loads progressively after
// mount. a 200ms delay to show it is totally fine.
//
// caching: s-maxage=600 → vercel's CDN caches per city for 10 minutes.
// stale-while-revalidate → serves stale data while revalidating in the background.
export async function GET(req: NextRequest) {
  const cityParam = req.nextUrl.searchParams.get('city')
  const city = normalizeCity(cityParam)

  try {
    const weather = await fetchWeather(city)
    return NextResponse.json(weather, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Weather unavailable' },
      { status: 503 }
    )
  }
}
