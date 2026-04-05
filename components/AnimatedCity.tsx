'use client'

/**
 * AnimatedCity — Client component for animating the city name in Hero.
 *
 * WHY CLIENT COMPONENT?
 * The parent Hero is a server component (no 'use client') so it can't
 * own any state or run effects. We extract just the animated city span
 * into a tiny client component — keeping as little JS as possible on
 * the client while enabling the transition effect.
 *
 * HOW IT WORKS:
 * When the city prop changes (user switches city → router.push('/discover?city=X')),
 * the parent re-renders with a new `city` prop. This component:
 *   1. Detects the prop change via useEffect
 *   2. Fades out (opacity 0, slides up 8px)
 *   3. After 180ms: updates displayCity to the new name
 *   4. Fades back in (opacity 1, returns to 0px)
 *
 * PERFORMANCE:
 * Uses only `opacity` and `transform` — compositor-thread only.
 * Zero layout recalculations, zero CLS. The span occupies the same
 * space before and after the transition.
 */

import { useState, useEffect } from 'react'

interface AnimatedCityProps {
  city: string
}

export default function AnimatedCity({ city }: AnimatedCityProps) {
  const [displayCity, setDisplayCity] = useState(city)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (city === displayCity) return

    // Step 1: start fade-out
    setAnimating(true)

    // Step 2: after fade-out completes (180ms), swap text and fade in
    const t = setTimeout(() => {
      setDisplayCity(city)
      setAnimating(false)
    }, 180)

    return () => clearTimeout(t)
  }, [city, displayCity])

  return (
    /*
     * No box/pill — just indigo text inline with the sentence.
     * Bold weight + color is enough to signal "this word is dynamic."
     * A surrounding shape caused awkward line-breaks with short city
     * names like "Austin" and looked boxy next to flowing body copy.
     */
    <span
      className="font-semibold text-indigo-500 inline-block"
      style={{
        opacity:    animating ? 0 : 1,
        transform:  animating ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {displayCity}
    </span>
  )
}
