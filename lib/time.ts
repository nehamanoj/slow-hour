// format a live countdown from now until an absolute expiry timestamp.
// returns: "1h 23m" / "45m 12s" / "9s" / "Expired"
//
// switches to "Xm Xs" below 1 hour — same trick flight booking sites use
// to make deadlines feel more urgent as they get close.
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

// convert relative "hours from now" to an absolute unix timestamp (ms).
// called once per dealcard on mount and stored in a stable ref — never
// recomputed, so countdowns don't reset when a card remounts (e.g. on filter change).
export function computeExpiryTimestamp(hoursFromNow: number): number {
  return Date.now() + hoursFromNow * 60 * 60 * 1000
}

// maps hours remaining to a visual urgency level for styling.
// ≤ 1h → critical (red pulse), ≤ 3h → urgent (amber), > 3h → normal (slate)
export function getUrgencyLevel(hoursFromNow: number): 'critical' | 'urgent' | 'normal' {
  if (hoursFromNow <= 1) return 'critical'
  if (hoursFromNow <= 3) return 'urgent'
  return 'normal'
}
