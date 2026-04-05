/**
 * /discover — Main dashboard page
 *
 * RENDERING STRATEGY: Edge SSR + React Streaming
 *
 * This page runs on Vercel's Edge Runtime (V8 isolates, not Node.js).
 * Two key consequences:
 *   1. Zero cold starts — isolates are always warm
 *   2. We can read `x-vercel-ip-city` to geo-detect the user's city
 *      without any client-side location prompt
 *
 * STREAMING (the Suspense boundary below):
 *   Chunk 1 → TopBar + Hero (static shell, no data fetching, arrives instantly)
 *   Chunk 2 → DealsGrid (async, streams in ~1.2s later with real deal data)
 *
 * This means LCP is the hero headline — painted before any data loads.
 * The skeleton keeps layout stable while chunk 2 loads → zero CLS.
 *
 * WHY EDGE OVER NODE SSR?
 * Node SSR: cold start up to 2s, runs in a single region
 * Edge SSR: warm in <5ms, runs in the region closest to the user
 * For a geo-personalized app, edge is the only sensible choice.
 *
 * WHY STREAMING OVER PARTIAL PRERENDERING (PPR)?
 * PPR (Next.js experimental) would let us statically cache the shell at the
 * CDN edge and stream only the dynamic <Suspense> subtree. That would be the
 * ideal architecture for a mostly-static page with a small dynamic island.
 *
 * However, this page is *fully dynamic* per request: the city header
 * (x-vercel-ip-city) varies every request, so even the "shell" — the Hero
 * headline — is personalised (it renders the user's city name). There is no
 * meaningful static portion to pre-render and cache.
 *
 * PPR would be the right call if the hero were generic and only the deals
 * section needed per-request data. For this design, Edge SSR + Suspense
 * streaming is the correct trade-off.
 *
 * If we later decouple city detection into a cookie (set on first visit) we
 * could revisit PPR — the shell would then be cacheable across most requests.
 */

import { headers } from 'next/headers'
import { Suspense } from 'react'
import { normalizeCity, isSupportedCity } from '@/lib/geo'
import type { SupportedCity } from '@/lib/types'
import TopBar from '@/components/TopBar'
import Hero from '@/components/Hero'
import DealsGrid from '@/components/DealsGrid'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import UnsupportedCity from '@/components/UnsupportedCity'

// Declares this entire route as edge-rendered.
// Applies to all server components in this subtree.
export const runtime = 'edge'

export const metadata = {
  title: 'Slow Hour — Discover Deals Near You',
  description:
    'Real-time, edge-personalized student deals ranked by urgency. ' +
    'See what\'s ending soon in your city — before it\'s gone.',
}

interface PageProps {
  // In Next.js 15, searchParams is a Promise — must be awaited.
  // This is a breaking change from Next 14; forgetting the await is
  // a common source of subtle bugs after upgrading.
  searchParams: Promise<{ city?: string }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  // Await both simultaneously — no reason to wait for one before starting the other.
  // headers() reads the incoming HTTP request headers (available on edge/server only).
  const [params, headersList] = await Promise.all([searchParams, headers()])

  // x-vercel-ip-city is injected by Vercel's edge network based on the
  // request's IP address. It's URL-encoded ("New%20York" → "New York").
  // Only available on Vercel deployments; returns null in local dev.
  const rawVercelCity = headersList.get('x-vercel-ip-city')
  const vercelCity = rawVercelCity ? decodeURIComponent(rawVercelCity) : null

  // detectedCity: the nearest *supported* city for data-fetching purposes.
  // Falls back to Houston when the geo city is unsupported or null.
  const detectedCity = normalizeCity(vercelCity)

  // User can override city via ?city= query param (city picker in TopBar).
  // We normalise it through the same function to handle casing / fuzzy matches.
  const requestedCity = params.city ? normalizeCity(params.city) : null
  const isUserOverride = requestedCity !== null
  const city: SupportedCity = requestedCity ?? detectedCity

  // isUnsupportedGeo: true when the user's real city (e.g. "Fremont") is
  // detected by Vercel's edge network but we don't have deals data for it yet,
  // AND the user hasn't manually selected a city via the picker.
  // In this case we show the "quiet city" state instead of an empty feed.
  const isUnsupportedGeo =
    !isUserOverride && vercelCity !== null && !isSupportedCity(vercelCity)

  // displayCity: what we show in the UI. For unsupported geos we show the
  // real detected city ("Fremont") so the user sees their actual location —
  // not the silent Houston fallback that would feel broken.
  const displayCity = isUnsupportedGeo ? (vercelCity ?? city) : city

  return (
    <main className="min-h-screen">
      {/*
        TopBar: 'use client' — needs useEffect for live clock and city picker state.
        rawCity is the real detected city name for the pill label when it's an
        unsupported geo — prevents the TopBar from incorrectly showing "Houston".
        Weather/clock are suppressed for unsupported cities (no coords/timezone).
      */}
      <TopBar
        city={city}
        detectedCity={detectedCity}
        isDetected={!isUserOverride}
        rawCity={isUnsupportedGeo ? displayCity : undefined}
      />

      {/*
        Hero: pure server component — no async, no data.
        Renders synchronously into the first HTML chunk.
        displayCity ensures "Fremont" appears in the headline for unsupported
        geos, not the silent "Houston" fallback.
      */}
      <Hero city={displayCity} />

      {/*
        Deals section: two possible states.
        A) Normal — stream in deals for a supported city.
        B) Quiet city — user's geo is unsupported; show a friendly message
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
