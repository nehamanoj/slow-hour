// ─── Core domain types ────────────────────────────────────────────────────────

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
   * Hours from "now" until this deal expires.
   * Stored as a relative offset (not an absolute timestamp) so mock data
   * feels fresh on every session. The DealCard component converts this to
   * an absolute timestamp on mount using Date.now().
   *
   * In a real system, this would be an ISO timestamp from the DB.
   */
  expiresInHours: number
  emoji: string
}

export type WeatherData = {
  condition: string
  icon: string
  temp: number
  /** Context-aware message to show in the deals feed header */
  message: string
}

// ─── Supported cities ─────────────────────────────────────────────────────────

export const SUPPORTED_CITIES = [
  'Houston',
  'San Francisco',
  'New York',
  'Pittsburgh',
  'Austin',
] as const

export type SupportedCity = (typeof SUPPORTED_CITIES)[number]

// ─── Filter options ───────────────────────────────────────────────────────────

export type FilterId = 'all' | 'food' | 'drinks' | 'events' | 'fitness' | 'ending-soon'
