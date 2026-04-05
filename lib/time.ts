/**
 * Format a live countdown from now until an absolute expiry timestamp.
 *
 * Returns: "1h 23m" / "45m 12s" / "9s" / "Expired"
 *
 * Design decision: we switch from "Xh Xm" to "Xm Xs" format when under
 * 1 hour. This increases urgency perception as the deadline approaches —
 * the same psychological mechanic used by flight booking sites.
 */
export function formatCountdown(expiresAt: number): string {
  const diff = expiresAt - Date.now()
  if (diff <= 0) return 'Expired'

  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

/**
 * Convert a relative "hours from now" offset to an absolute Unix timestamp (ms).
 *
 * Called once per DealCard on client mount. This means:
 * - Each browser session gets a fresh countdown
 * - Refreshing the page resets timers (acceptable for a demo)
 * - In production: expiry timestamps would come from the database
 */
export function computeExpiryTimestamp(hoursFromNow: number): number {
  return Date.now() + hoursFromNow * 60 * 60 * 1000
}

/**
 * Determine urgency level for visual styling.
 * ≤ 1h  → 'critical' (red pulse)
 * ≤ 3h  → 'urgent'   (amber)
 * > 3h  → 'normal'   (slate)
 */
export function getUrgencyLevel(hoursFromNow: number): 'critical' | 'urgent' | 'normal' {
  if (hoursFromNow <= 1) return 'critical'
  if (hoursFromNow <= 3) return 'urgent'
  return 'normal'
}
