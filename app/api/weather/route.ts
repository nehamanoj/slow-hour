import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'
import { normalizeCity } from '@/lib/geo'

/**
 * GET /api/weather?city=Houston
 *
 * Used by the TopBar client component to display current weather
 * without blocking the initial server render.
 *
 * Architecture decision: why a separate API route instead of server props?
 * → TopBar is a client component (needs live clock via useEffect).
 *   Passing weather as a server prop would require TopBar's parent to
 *   await the weather fetch — blocking the static shell render.
 *   Instead, we let weather load progressively after mount. It's
 *   non-critical context; a 200ms delay to show it is acceptable.
 *
 * Caching: s-maxage=600 means Vercel's CDN caches this response for
 * 10 minutes per city. The 600th request for "Houston weather" hits the
 * cache, not Open-Meteo. stale-while-revalidate lets stale data serve
 * while a fresh fetch happens in the background.
 */
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
