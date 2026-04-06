// core domain types

export type Category = 'Food' | 'Drinks' | 'Events' | 'Fitness' | 'Retail' | 'Study'

export type Deal = {
  id: string
  title: string
  business: string
  description: string
  city: string
  category: Category
  discount: string
  /**
   * relative hours offset, not an absolute timestamp — keeps mock data
   * feeling fresh every session. dealcard converts this to an absolute ms
   * timestamp on mount via Date.now().
   *
   * in production this'd be an iso timestamp from the db.
   */
  expiresInHours: number
  emoji: string
}

export type WeatherData = {
  condition: string
  icon: string
  temp: number
  /** context-aware message shown in the deals feed header */
  message: string
}

// ─── supported cities ─────────────────────────────────────────────────────────

export const SUPPORTED_CITIES = [
  'Houston',
  'San Francisco',
  'New York',
  'Pittsburgh',
  'Austin',
] as const

export type SupportedCity = (typeof SUPPORTED_CITIES)[number]

// ─── filter options ───────────────────────────────────────────────────────────

export type FilterId = 'all' | 'food' | 'drinks' | 'events' | 'fitness' | 'retail' | 'study' | 'ending-soon'
