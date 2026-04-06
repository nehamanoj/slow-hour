// hero — static server component (dashboard variant)
//
// pure server component: no async deps, no 'use client', renders synchronously.
// lands in the first HTML chunk → LCP element.
//
// the only client boundary is <AnimatedCity> — a tiny 'use client' that handles
// the indigo crossfade when city changes. everything else stays server-rendered.
//
// clipping fix (the "g" in "Happening"):
//   root cause was leading-[1.0] + overflow-hidden on the line wrapper.
//   at line-height 1.0 the line box height = the em square exactly, which
//   clips descenders ("g", "p", "y"). fix: leading-[1.1] gives 10% extra room.
//   removed overflow-hidden — the blur+opacity combo masks the slide anyway.
//
// animation performance:
//   all animations are GPU-composited (opacity, filter:blur, transform).
//   floating blobs use transform: translateY in an infinite keyframe —
//   compositor thread only, zero layout recalculations, zero CLS.

import { MapPin, Zap, Clock } from 'lucide-react'
import AnimatedCity from './AnimatedCity'

interface HeroProps {
  city: string
}

export default function Hero({ city }: HeroProps) {
  return (
    // pt-24: accounts for floating nav (top-4 + h-[52px] + 12px gap = ~72px)
    <section className="relative max-w-6xl mx-auto px-6 sm:px-10 pt-24 pb-8">

      {/*
        decorative background globs — GPU composited, aria-hidden.
        animate-float / animate-float-slow = infinite translateY keyframe.
        blur is so large (120px+) that movement reads as ambience, not animation.
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

      {/* ── badge row ─────────────────────────────────────────────────────── */}
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
        {/* accent dot trio — visual texture, no semantic content */}
        <div className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
          <span className="w-1 h-1 rounded-full bg-violet-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
        </div>
        <div className="h-px flex-1 max-w-[60px] bg-[#E0E0E0]" />
      </div>

      {/* ── headline ──────────────────────────────────────────────────────── */}
      {/*
        leading-[1.1] (not 1.0): fixes descender clipping on "g" in "Happening".
        no overflow-hidden on the line wrappers — the blur-in animation's
        opacity/blur combo already masks the slide-up.
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

      {/* ── sub-copy + metadata row ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-blur-in-d2">

        {/* animatedcity gives the city name its indigo color — only this word is client-side */}
        <div className="max-w-lg">
          <p className="text-base sm:text-lg font-light text-[#404040] leading-relaxed">
            Student-exclusive offers in{' '}
            {/*
              the {' '} above is intentional — JSX strips whitespace between
              an inline text node and a component, so we add it explicitly.
            */}
            <AnimatedCity city={city} />,
            ranked by urgency. Discover what&apos;s ending soon — before it&apos;s gone.
          </p>

          {/* feature tag pills */}
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

        {/* right metadata chips */}
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

      {/* ── divider ───────────────────────────────────────────────────────── */}
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
