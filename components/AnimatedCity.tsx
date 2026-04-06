'use client'

// why client component?
// the parent Hero is a server component so it can't own state or run effects.
// we extract just the animated city span into a tiny client component —
// as little JS on the client as possible while still enabling the transition.
//
// how it works:
//   when the city prop changes (user switches city → router.push('/discover?city=X')):
//   1. detects the prop change via useEffect
//   2. fades out (opacity 0, slides up 8px)
//   3. after 180ms: updates displayCity to the new name
//   4. fades back in (opacity 1, returns to 0px)
//
// only uses opacity + transform — compositor-thread only, zero CLS.

import { useState, useEffect } from 'react'

interface AnimatedCityProps {
  city: string
}

export default function AnimatedCity({ city }: AnimatedCityProps) {
  const [displayCity, setDisplayCity] = useState(city)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (city === displayCity) return

    // step 1: start fade-out
    setAnimating(true)

    // step 2: after fade-out completes (180ms), swap text and fade in
    const t = setTimeout(() => {
      setDisplayCity(city)
      setAnimating(false)
    }, 180)

    return () => clearTimeout(t)
  }, [city, displayCity])

  // no box/pill — just indigo text inline with the sentence.
  // bold weight + color is enough to signal "this word is dynamic."
  // a surrounding shape caused awkward line-breaks with short city
  // names like "Austin" and looked boxy next to flowing body copy.
  return (
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
