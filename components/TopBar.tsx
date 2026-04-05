'use client'

/**
 * TopBar — Floating pill navigation.
 *
 * Design: a rounded card that floats above the page with a shadow,
 * rather than a full-width bar stuck to the top edge. This is the
 * pattern used by Vercel, Linear, and Loom's marketing sites —
 * it feels modern and doesn't dominate the page.
 *
 * Implementation:
 *   - Outer wrapper: fixed + full-width, pointer-events-none so the
 *     transparent gap around the pill doesn't block page clicks
 *   - Inner pill: max-w-6xl mx-auto with rounded corners + shadow,
 *     pointer-events-auto restores clickability on the pill itself
 *
 * CLOCK: city-local timezone via CITY_TIMEZONES[city] in toLocaleTimeString.
 * WEATHER: fetched client-side after mount — progressive enhancement.
 * CITY SWITCH: router.push(..., { scroll: false }) so switching city
 *   doesn't snap the page back to the top. The content re-renders in place.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, MapPin, MapPinned } from 'lucide-react'
import { SUPPORTED_CITIES } from '@/lib/types'
import { CITY_TIMEZONES } from '@/lib/geo'
import type { SupportedCity, WeatherData } from '@/lib/types'

interface TopBarProps {
  city: SupportedCity
  detectedCity: SupportedCity
  isDetected: boolean
  /**
   * When the user's real geo city is unsupported (e.g. "Fremont"), this is
   * the raw detected city name to show in the pill instead of the fallback
   * supported city. Weather and clock are suppressed when this is set since
   * we don't have coordinates or timezone data for unsupported cities.
   */
  rawCity?: string
}

export default function TopBar({ city, detectedCity, isDetected, rawCity }: TopBarProps) {
  // When rawCity is set, the user is in an unsupported city.
  // We show rawCity in the pill but suppress weather/clock — we have no
  // coords or timezone for cities outside our supported set.
  const isUnsupportedCity = rawCity !== undefined
  const pillLabel = rawCity ?? city
  const router = useRouter()
  const [time, setTime] = useState('')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: true,
          timeZone: CITY_TIMEZONES[city],
        })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [city])

  useEffect(() => {
    let cancelled = false
    setWeather(null)
    async function load() {
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
        if (!res.ok) return
        const data: WeatherData = await res.json()
        if (!cancelled) setWeather(data)
      } catch { /* fail silently */ }
    }
    load()
    return () => { cancelled = true }
  }, [city])

  // scroll: false → city switch doesn't jump back to page top
  const changeCity = useCallback((newCity: SupportedCity) => {
    setShowPicker(false)
    router.push(`/discover?city=${encodeURIComponent(newCity)}`, { scroll: false })
  }, [router])

  return (
    <>
      {/*
        Outer: fixed + full-width + pointer-events-none.
        The px-4 creates a visible gap on each side so the pill appears
        to float rather than stick to the viewport edge.
      */}
      <div className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">

          {/* ── The floating pill ─────────────────────────────────────────── */}
          <div className="bg-white/92 backdrop-blur-2xl border border-[#E0E0E0]/90 rounded-2xl shadow-lg shadow-black/[0.07] px-4 sm:px-5 h-13 flex items-center justify-between"
            style={{ height: '52px' }}
          >

            {/* Logo + wordmark */}
            <Link href="/" className="flex items-center gap-2 group" aria-label="Slow Hour home">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500 group-hover:bg-indigo-600 transition-colors duration-200 shadow-sm shadow-indigo-200/60">
                <MapPinned className="w-3 h-3 text-white" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-[#080808] group-hover:text-indigo-600 transition-colors duration-200">
                Slow Hour
              </span>
              <span className="hidden md:block text-xs text-[#999999] font-normal">
                · for students &amp; all
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-2.5">

              {/* Weather — hidden for unsupported cities (no coords available) */}
              {!isUnsupportedCity && weather && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-[#666666] animate-fade-in bg-[#F5F5F5] px-2.5 py-1 rounded-full">
                  <span>{weather.icon}</span>
                  <span className="font-mono tabular-nums">{weather.temp}°</span>
                </span>
              )}

              {/* Local time — hidden for unsupported cities (no timezone mapping) */}
              {!isUnsupportedCity && time && (
                <span className="hidden sm:block text-xs font-mono tabular-nums text-[#666666] bg-[#F5F5F5] px-2.5 py-1 rounded-full">
                  {time}
                </span>
              )}

              {/* City picker */}
              <div className="relative">
                <button
                  onClick={() => setShowPicker(v => !v)}
                  aria-expanded={showPicker}
                  aria-haspopup="listbox"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#080808] bg-[#080808] text-white rounded-full px-3 py-1.5 hover:bg-[#1E1E1E] transition-colors duration-200"
                >
                  {isDetected && (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-300" />
                    </span>
                  )}
                  <MapPin className="w-3 h-3 text-white/70" />
                  <span>{pillLabel}</span>
                  <ChevronDown className={`w-3 h-3 text-white/60 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
                </button>

                {showPicker && (
                  <div
                    role="listbox"
                    aria-label="Switch city"
                    className="absolute top-full mt-2 right-0 bg-white border border-[#E0E0E0] rounded-2xl shadow-2xl shadow-black/[0.08] py-2 min-w-[200px] z-50"
                  >
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#999999] px-4 py-2">
                      Switch city
                    </p>
                    {SUPPORTED_CITIES.map(c => (
                      <button
                        key={c}
                        role="option"
                        aria-selected={c === city}
                        onClick={() => changeCity(c)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                          c === city
                            ? 'text-indigo-600 font-medium bg-indigo-50'
                            : 'text-[#404040] hover:bg-[#FAFAF9]'
                        }`}
                      >
                        <span>{c}</span>
                        {c === detectedCity && (
                          <span className="text-[10px] text-[#999999] bg-[#F5F5F5] px-2 py-0.5 rounded-full">you</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Backdrop for closing picker */}
      {showPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} aria-hidden="true" />
      )}
    </>
  )
}
