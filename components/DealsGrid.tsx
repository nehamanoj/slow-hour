// dealsgrid — async server component (the "dynamic" half of the stream)
//
// sits behind the suspense boundary in page.tsx.
// async, so react won't include it in the first HTML chunk.
// it resolves independently and streams in as a second chunk.
//
// execution flow:
//   1. page.tsx renders synchronously → sends topbar + hero + loadingskeleton
//   2. this component starts resolving in parallel on the server
//   3. ~1200ms later: deals + weather resolve via Promise.all
//   4. react sends a second HTML chunk with the real deals content
//   5. client replaces loadingskeleton with dealsclient
//
// why Promise.all and not sequential awaits?
//   sequential: getDeals (1200ms) → fetchWeather (200ms) = 1400ms total
//   parallel:   both resolve simultaneously = 1200ms total
//   never wait for one when both can start together.

import { getDeals } from '@/lib/deals'
import { fetchWeather } from '@/lib/weather'
import { rankDeals } from '@/lib/ranking'
import type { SupportedCity } from '@/lib/types'
import DealsClient from './DealsClient'

interface DealsGridProps {
  city: SupportedCity
}

export default async function DealsGrid({ city }: DealsGridProps) {
  // parallel data fetching — both start simultaneously.
  // fetchWeather is cached (next: { revalidate: 600 }), so the api route
  // and this server component share the same cached response within the window.
  const [deals, weather] = await Promise.all([
    getDeals(city),
    fetchWeather(city),
  ])

  // rank by urgency before passing to client — sorting happens server-side
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
