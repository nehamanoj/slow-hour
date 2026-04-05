/**
 * DealsGrid — Async Server Component (the "dynamic" half of our stream)
 *
 * This component sits behind the Suspense boundary in page.tsx.
 * It's async, which means React will not send it in the initial HTML chunk.
 * Instead, it resolves independently and streams in as a second chunk.
 *
 * EXECUTION FLOW:
 * 1. page.tsx renders synchronously → sends TopBar + Hero + LoadingSkeleton
 * 2. This component starts resolving in parallel on the server
 * 3. ~1200ms later: deals + weather resolve via Promise.all
 * 4. React sends a second HTML chunk with the real deals content
 * 5. Client replaces LoadingSkeleton with DealsClient
 *
 * WHY Promise.all (not sequential awaits)?
 * Sequential: getDeals (1200ms) → fetchWeather (200ms) = 1400ms total
 * Parallel:   both resolve simultaneously = 1200ms total
 * We never wait for one when both can start together.
 */

import { getDeals } from '@/lib/deals'
import { fetchWeather } from '@/lib/weather'
import { rankDeals } from '@/lib/ranking'
import type { SupportedCity } from '@/lib/types'
import DealsClient from './DealsClient'

interface DealsGridProps {
  city: SupportedCity
}

export default async function DealsGrid({ city }: DealsGridProps) {
  // Parallel data fetching — both start simultaneously
  // fetchWeather is cached (next: { revalidate: 600 }), so the API route
  // and this server component share the same cached response within the window
  const [deals, weather] = await Promise.all([
    getDeals(city),
    fetchWeather(city),
  ])

  // Rank by urgency before passing to client — sorting happens server-side
  // so the client receives pre-ranked data (no JS sort on the main thread)
  const ranked = rankDeals(deals)

  return (
    <DealsClient
      initialDeals={ranked}
      city={city}
      weather={weather}
    />
  )
}
