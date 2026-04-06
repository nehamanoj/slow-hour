import type { Deal } from './types'

// sort deals by urgency — soonest expiry first.
// spread before sort so we don't mutate the original array
// (important for react's referential equality checks).
// urgency-first is deliberate: a deal expiring in 45 min shouldn't be
// buried under one that expires in 3 days. same logic as "only 2 seats left."
export function rankDeals(deals: Deal[]): Deal[] {
  return [...deals].sort((a, b) => a.expiresInHours - b.expiresInHours)
}

// filter deals by category.
// 'all'         → return everything
// 'ending-soon' → virtual filter: only deals expiring within 3 hours
// anything else → match by category name (case-insensitive)
//
// "ending soon" is intentionally a filter, not just a sort — a user in
// "act now" mode wants only urgent items, not everything sorted by urgency.
export function filterDeals(deals: Deal[], filter: string): Deal[] {
  if (filter === 'all') return deals
  if (filter === 'ending-soon') return deals.filter((d) => d.expiresInHours <= 3)
  return deals.filter((d) => d.category.toLowerCase() === filter.toLowerCase())
}
