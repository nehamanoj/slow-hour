// /discover — main dashboard page
//
// rendering strategy: edge SSR + react streaming
//
// runs on vercel's edge runtime (V8 isolates, not node.js).
// two key things this unlocks:
//   1. zero cold starts — isolates are always warm
//   2. access to x-vercel-ip-city for geo-detecting the user's city
//      without any client-side location prompt
//
// streaming (the suspense boundary below):
//   chunk 1 → topbar + hero (static shell, no data fetching, arrives instantly)
//   chunk 2 → dealsgrid (async, streams in ~1.2s with real deal data)
//
// LCP is the hero headline — painted before any data loads.
// the skeleton keeps layout stable while chunk 2 loads → zero CLS.
//
// why edge over node SSR?
//   node SSR: cold start up to 2s, runs in a single region
//   edge SSR: warm in <5ms, runs in the region closest to the user
//   for a geo-personalized app, edge is the only sensible choice.
//
// why streaming over partial prerendering (PPR)?
//   PPR would let us statically cache the shell at the CDN edge and stream
//   only the dynamic <Suspense> subtree. ideal for mostly-static pages with
//   a small dynamic island.
//
//   but this page is fully dynamic per request: the city header
//   (x-vercel-ip-city) varies every request, so even the "shell" — the hero
//   headline — is personalised (it renders the user's city name). there's no
//   meaningful static portion to pre-render and cache.
//
//   PPR would be right if the hero were generic and only the deals section
//   needed per-request data. for this design, edge SSR + suspense streaming
//   is the correct trade-off.
//
//   if we later decouple city detection into a cookie (set on first visit) we
//   could revisit PPR — the shell would then be cacheable across most requests.

import { headers } from 'next/headers'
import { Suspense } from 'react'
import { normalizeCity, isSupportedCity } from '@/lib/geo'
import type { SupportedCity } from '@/lib/types'
import TopBar from '@/components/TopBar'
import Hero from '@/components/Hero'
import DealsGrid from '@/components/DealsGrid'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import UnsupportedCity from '@/components/UnsupportedCity'

// declares this entire route as edge-rendered.
// applies to all server components in this subtree.
export const runtime = 'edge'

export const metadata = {
  title: 'Slow Hour — Discover Deals Near You',
  description:
    'Real-time, edge-personalized student deals ranked by urgency. ' +
    'See what\'s ending soon in your city — before it\'s gone.',
}

interface PageProps {
  // in next.js 15, searchParams is a Promise — must be awaited.
  // breaking change from next 14; forgetting the await is a common bug after upgrading.
  searchParams: Promise<{ city?: string }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  // await both simultaneously — no reason to wait for one before starting the other.
  // headers() reads the incoming HTTP request headers (available on edge/server only).
  const [params, headersList] = await Promise.all([searchParams, headers()])

  // x-vercel-ip-city is injected by vercel's edge network based on the
  // request's IP address. it's URL-encoded ("New%20York" → "New York").
  // only available on vercel deployments; returns null in local dev.
  const rawVercelCity = headersList.get('x-vercel-ip-city')
  const vercelCity = rawVercelCity ? decodeURIComponent(rawVercelCity) : null

  // detectedCity: the nearest supported city for data-fetching purposes.
  // falls back to houston when the geo city is unsupported or null.
  const detectedCity = normalizeCity(vercelCity)

  // user can override city via ?city= query param (city picker in topbar).
  // normalise through the same function to handle casing / fuzzy matches.
  const requestedCity = params.city ? normalizeCity(params.city) : null
  const isUserOverride = requestedCity !== null
  const city: SupportedCity = requestedCity ?? detectedCity

  // isUnsupportedGeo: true when the user's real city (e.g. "Fremont") is
  // detected by vercel's edge network but we don't have deals data for it yet,
  // AND the user hasn't manually selected a city via the picker.
  // shows the "quiet city" state instead of an empty feed.
  const isUnsupportedGeo =
    !isUserOverride && vercelCity !== null && !isSupportedCity(vercelCity)

  // displayCity: what we show in the UI. for unsupported geos we show the
  // real detected city ("Fremont") so the user sees their actual location —
  // not the silent houston fallback that would feel broken.
  const displayCity = isUnsupportedGeo ? (vercelCity ?? city) : city

  return (
    <main className="min-h-screen">
      {/*
        topbar: 'use client' — needs useEffect for live clock and city picker state.
        rawCity is the real detected city name for the pill label when it's an
        unsupported geo — prevents topbar from incorrectly showing "Houston".
        weather/clock are suppressed for unsupported cities (no coords/timezone).
      */}
      <TopBar
        city={city}
        detectedCity={detectedCity}
        isDetected={!isUserOverride}
        rawCity={isUnsupportedGeo ? displayCity : undefined}
      />

      {/*
        hero: pure server component — no async, no data.
        renders synchronously into the first HTML chunk.
        displayCity ensures cities appears in the headline for unsupported
        geos, not the silent "Houston" fallback.
      */}
      <Hero city={displayCity} />

      {/*
        deals section: two possible states.
        A) normal — stream in deals for a supported city.
        B) quiet city — user's geo is unsupported; show a friendly message
           and links to the cities we do cover instead of an empty grid.
      */}
      {isUnsupportedGeo ? (
        <UnsupportedCity city={displayCity} />
      ) : (
        <Suspense fallback={<LoadingSkeleton />}>
          <DealsGrid city={city} />
        </Suspense>
      )}
    </main>
  )
}
