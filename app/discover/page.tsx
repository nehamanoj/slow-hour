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
import { normalizeCity } from '@/lib/geo'
import type { SupportedCity } from '@/lib/types'
import TopBar from '@/components/TopBar'
import Hero from '@/components/Hero'
import DealsGrid from '@/components/DealsGrid'
import LoadingSkeleton from '@/components/LoadingSkeleton'

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
  const detectedCity = normalizeCity(vercelCity)

  // User can override city via ?city= query param (city picker in TopBar).
  // We normalise it through the same function to handle casing / fuzzy matches.
  const requestedCity = params.city ? normalizeCity(params.city) : null

  // isDetected = true when showing the user's geo-detected city (not a manual override).
  // Passed to TopBar so it can show "Houston detected" vs "New York" (no label).
  const isUserOverride = requestedCity !== null
  const city: SupportedCity = requestedCity ?? detectedCity

  return (
    <main className="min-h-screen">
      {/*
        TopBar: 'use client' — needs useEffect for live clock and city picker state.
        It receives city as a prop so the server decides the city; the client just displays it.
        Weather is fetched client-side via /api/weather after mount (non-blocking).
      */}
      <TopBar city={city} detectedCity={detectedCity} isDetected={!isUserOverride} />

      {/*
        Hero: pure server component — no async, no data.
        Renders synchronously into the first HTML chunk.
        This is our LCP element: the big headline paints before any data loads.
        AnimatedCity inside Hero is a thin client component that only handles
        the cross-fade transition when city changes — the rest stays server-rendered.
      */}
      <Hero city={city} />

      {/*
        Suspense boundary: the split between static and dynamic content.
        Everything inside (DealsGrid → DealsClient) is async and streams as chunk 2.
        LoadingSkeleton is the fallback — it renders synchronously in chunk 1,
        holding layout space so there's zero CLS when the real content arrives.
      */}
      <Suspense fallback={<LoadingSkeleton />}>
        <DealsGrid city={city} />
      </Suspense>
    </main>
  )
}
