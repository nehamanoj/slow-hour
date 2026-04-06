import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // tells next.js/turbopack not to bundle @vercel/kv — resolve it at runtime instead.
  // without this, turbopack throws "module not found" when the package isn't
  // installed locally. in production vercel installs it automatically.
  // the try/catch in shared-deals/route.ts handles the local dev fallback.
  serverExternalPackages: ['@vercel/kv'],

  // deliberately lean config — no unnecessary plugins or overrides.
  //
  // no image optimization domains:
  //   using emoji + lucide svg icons instead of remote images.
  //   avoids external image fetch latency and a whole class of CLS issues
  //   from unsized remote images.
  //
  // no rewrites for city routing:
  //   city is a query param (?city=Austin), not a path segment (/austin).
  //   trade-off: simpler edge function routing but worse SEO for city pages.
  //   path-based routing would be a v2 thing.
  //
  // future: partial prerendering (PPR)
  //   ideal architecture: static shell (hero, nav) cached at CDN indefinitely,
  //   dynamic slot (deals feed) rendered per-request. currently experimental.
  //   would look like:
  //     experimental: { ppr: true }
  //     + export const experimental_ppr = true on the page
}

export default nextConfig
