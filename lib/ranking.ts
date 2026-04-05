import type { Deal } from './types'

/**
 * Rank deals by urgency: soonest expiry at the top.
 *
 * Why urgency-first?
 * This is deliberate UX design: a deal expiring in 45 minutes should be
 * top-of-feed, not buried under a deal that expires in 3 days.
 * Urgency drives engagement and conversion — it's the same principle
 * behind flash sales and "only 2 left" indicators on e-commerce sites.
 *
 * We create a shallow copy before sorting to avoid mutating the original
 * array (important for React's referential equality checks).
 */
export function rankDeals(deals: Deal[]): Deal[] {
  return [...deals].sort((a, b) => a.expiresInHours - b.expiresInHours)
}

/**
 * Filter deals by category.
 *
 * 'all'          → return everything
 * 'ending-soon'  → virtual filter: deals expiring within 3 hours
 * anything else  → match by category name (case-insensitive)
 *
 * "Ending Soon" is intentionally a filter, not a sort — it's a different
 * intent. A user selecting "Ending Soon" is in "act now" mode; they want
 * only urgent items, not just urgency-sorted items.
 */
export function filterDeals(deals: Deal[], filter: string): Deal[] {
  if (filter === 'all') return deals
  if (filter === 'ending-soon') return deals.filter((d) => d.expiresInHours <= 3)
  return deals.filter((d) => d.category.toLowerCase() === filter.toLowerCase())
}
