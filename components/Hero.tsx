/**
 * Hero — Static Server Component (dashboard variant)
 *
 * Pure server component: no async deps, no 'use client', renders synchronously.
 * Lands in the FIRST HTML chunk → LCP element.
 *
 * The only client boundary is <AnimatedCity> — a tiny 'use client' that handles
 * the indigo crossfade when city changes. Everything else stays server-rendered.
 *
 * CLIPPING FIX (the "g" in "Happening"):
 * Root cause was leading-[1.0] + overflow-hidden on the line wrapper.
 * At line-height 1.0 the line box height = the em square exactly, which
 * clips descenders ("g", "p", "y"). Fix: leading-[1.1] gives 10% extra
 * vertical room. Removed overflow-hidden — it was guarding the blur-in
 * translateY animation, but the blur+opacity combo masks the slide anyway.
 *
 * ANIMATION PERFORMANCE:
 * All animations here are GPU-composited (opacity, filter:blur, transform).
 * The floating blobs use `transform: translateY` in an infinite keyframe —
 * compositor thread only, zero layout recalculations, zero CLS.
 * The blob blur radius is already large (120px) so movement reads as
 * a subtle "breathing" glow, not a jarring bounce.
 *
 * DASHBOARD SPACING:
 * pt-20 (80px) = 56px fixed nav + 24px breathing room.
 * pb-8 keeps the hero compact so deals content starts near the top.
 * Horizontal padding matches DealsClient: px-6 sm:px-10.
 */

import { MapPin, Zap, Clock } from 'lucide-react'
import AnimatedCity from './AnimatedCity'

interface HeroProps {
  city: string
}

export default function Hero({ city }: HeroProps) {
  return (
    /* pt-24: accounts for floating nav (top-4 + h-[52px] + 12px gap = ~72px) */
    <section className="relative max-w-6xl mx-auto px-6 sm:px-10 pt-24 pb-8">

      {/*
        Decorative background glows — GPU composited, aria-hidden.
        animate-float / animate-float-slow = infinite translateY keyframe.
        This gives the page a "breathing" quality without any layout cost.
        Blurs are so large (120px+) that the movement reads as ambience,
        not animation — engaging without being distracting.
      */}
      <div
        className="absolute top-12 right-0 w-[560px] h-[420px] bg-indigo-50/80 rounded-full blur-[120px] pointer-events-none -z-10 animate-float"
        aria-hidden="true"
      />
      <div
        className="absolute top-40 left-8 w-[280px] h-[280px] bg-violet-50/60 rounded-full blur-[100px] pointer-events-none -z-10 animate-float-slow"
        style={{ animationDelay: '3s' }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-1/4 w-[200px] h-[200px] bg-sky-50/50 rounded-full blur-[80px] pointer-events-none -z-10 animate-float-slow"
        style={{ animationDelay: '1.5s' }}
        aria-hidden="true"
      />

      {/* ── Badge row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8 animate-blur-in">
        <span className="inline-flex items-center gap-2 bg-white/80 border border-[#E0E0E0] rounded-full px-3 py-1.5 shadow-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
          </span>
          <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#666666]">
            Real-time · Made for where you are
          </span>
        </span>
        {/* Accent dot trio — visual texture, no semantic content */}
        <div className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
          <span className="w-1 h-1 rounded-full bg-violet-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
        </div>
        <div className="h-px flex-1 max-w-[60px] bg-[#E0E0E0]" />
      </div>

      {/* ── Headline ──────────────────────────────────────────────────────── */}
      {/*
        leading-[1.1] (not 1.0): fixes descender clipping on "g" in "Happening".
        No overflow-hidden on the line wrappers — the blur-in animation's
        opacity/blur combo already masks the slide-up, so clipping isn't needed.
      */}
      <div className="mb-8">
        <h1 className="text-[clamp(2.6rem,7vw,5rem)] font-light leading-[1.1] tracking-[-0.03em] text-[#080808]">
          <span className="block animate-blur-in">
            Slow Hour:
          </span>
          <span className="block animate-blur-in-d1">
            What&apos;s Happening
          </span>
          <span className="block animate-blur-in-d2 text-[#999999]">
            near you?
          </span>
        </h1>
      </div>

      {/* ── Sub-copy + metadata row ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-blur-in-d2">

        {/* Sub-copy — AnimatedCity gives the city name its indigo color pill */}
        <div className="max-w-lg">
          <p className="text-base sm:text-lg font-light text-[#404040] leading-relaxed">
            Student-exclusive offers in
            {/*
              AnimatedCity: 'use client' component — only this word is
              interactive. The indigo pill makes it unmistakably clear
              this word is dynamic / personalized to the visitor's location.
            */}
            <AnimatedCity city={city} />,
            ranked by urgency. Discover what&apos;s ending soon — before it&apos;s gone.
          </p>

          {/* Feature tag pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" aria-hidden="true" />
              Real-time countdowns
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" aria-hidden="true" />
              Urgency ranked
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Students &amp; all
            </span>
          </div>
        </div>

        {/* Right metadata chips */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-[#666666]">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#666666]">Location</span>
              <span className="text-xs font-medium text-[#1E1E1E]">{city}</span>
            </div>
          </div>

          <div className="h-7 w-px bg-[#E0E0E0]" />

          <div className="flex items-center gap-2 text-[#666666]">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#666666]">Deals</span>
              <span className="text-xs font-medium text-[#1E1E1E]">Live now</span>
            </div>
          </div>

          <div className="h-7 w-px bg-[#E0E0E0]" />

          <div className="flex items-center gap-2 text-[#666666]">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#666666]">Updates</span>
              <span className="text-xs font-medium text-[#1E1E1E]">Every 10m</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="mt-10 flex items-center gap-6 animate-fade-up">
        <div className="h-px flex-1 bg-[#E0E0E0] animate-line-grow origin-left" />
        <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#999999] whitespace-nowrap">
          Deals below
        </span>
        <div className="h-px w-8 bg-[#E0E0E0]" />
      </div>
    </section>
  )
}
