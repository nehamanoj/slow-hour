// unsupportedcity — "quiet city" state
//
// shown when vercel's edge geo detects a city we don't have deals for yet
// (e.g. fremont, CA). instead of showing an empty feed or silently falling
// back to houston, we acknowledge the user's location and direct them somewhere useful.
//
// pure server component — no client JS needed, just links.

import Link from 'next/link'
import { SUPPORTED_CITIES } from '@/lib/types'
import type { SupportedCity } from '@/lib/types'

interface UnsupportedCityProps {
  city: string  // raw detected city name, e.g. "Fremont"
}

const CITY_EMOJI: Record<SupportedCity, string> = {
  Houston:         '🤠',
  'San Francisco': '🌉',
  'New York':      '🗽',
  Pittsburgh:      '🌁',
  Austin:          '🎸',
}

export default function UnsupportedCity({ city }: UnsupportedCityProps) {
  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-28">

      {/* thin rule matching dealsclient header */}
      <div className="h-px bg-[#E0E0E0] mb-10" />

      <div className="max-w-xl">

        {/* label */}
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#666666] mb-3">
          Near you
        </p>

        {/* main message */}
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#080808] leading-snug mb-3">
          {city} seems quiet right now.
        </h2>
        <p className="text-base font-light text-[#666666] leading-relaxed mb-8">
          We&apos;re working on bringing deals to your area — check back soon.
          In the meantime, see what&apos;s happening somewhere nearby:
        </p>

        {/* city buttons */}
        <div className="flex flex-wrap gap-3">
          {SUPPORTED_CITIES.map((c) => (
            <Link
              key={c}
              href={`/discover?city=${encodeURIComponent(c)}`}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full border border-[#C8C8C8] bg-white text-[#404040] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all duration-200"
            >
              <span>{CITY_EMOJI[c]}</span>
              {c}
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
