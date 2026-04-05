import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Deliberately lean config — no unnecessary plugins or overrides.
   *
   * Architecture notes (for interview discussion):
   *
   * WHY no image optimization domains?
   * → We use emoji + Lucide SVG icons instead of remote images.
   *   This avoids external image fetch latency entirely and removes
   *   a class of CLS issues caused by unsized remote images.
   *
   * WHY no rewrites for city routing?
   * → City is a query param (?city=Austin), not a path segment (/austin).
   *   Trade-off: query params don't require route segments, making the
   *   edge function simpler. Path-based routing would improve SEO for
   *   city-specific pages — a v2 consideration.
   *
   * FUTURE: Partial Prerendering (PPR)
   * → Ideal architecture for this app: static shell (hero, nav) cached
   *   at CDN edge indefinitely; dynamic slot (deals feed) rendered per-request.
   *   Currently experimental. Would look like:
   *   experimental: { ppr: true }
   *   + export const experimental_ppr = true on the page
   */
}

export default nextConfig
