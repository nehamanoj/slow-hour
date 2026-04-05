import Link from 'next/link'
import { ArrowRight, MapPinned, Clock } from 'lucide-react'

/**
 * Landing / Splash Page
 *
 * Statically rendered — no data fetching, no edge runtime needed.
 * CDN-cached at the edge forever (until next deploy).
 *
 * Layout: two-column on desktop.
 *   Left  → headline, sub-copy, CTAs, city pills
 *   Right → static mock UI preview (shows what the app looks like before clicking in)
 *
 * The mock preview makes the value proposition immediately legible —
 * users see real-looking deal cards before they ever click a button.
 */

const CITIES = ['Houston', 'New York', 'Austin', 'Pittsburgh', 'San Francisco']

// Static mock deals shown in the right-column preview — illustrative only, no JS
const MOCK_CARDS = [
  {
    emoji: '🍕', category: 'Food', categoryColor: 'text-orange-700 bg-orange-50',
    dot: 'bg-orange-300', title: '$1 pizza slices — all afternoon',
    business: "Joe's Pizza · New York", discount: '$1 SLICE',
    discountColor: 'bg-rose-500 text-white', countdown: '45m 12s',
    countdownColor: 'text-rose-500', urgent: true,
  },
  {
    emoji: '☕', category: 'Drinks', categoryColor: 'text-violet-700 bg-violet-50',
    dot: 'bg-violet-300', title: 'Free drip coffee with any purchase',
    business: 'Common Bond Café · Houston', discount: 'FREE',
    discountColor: 'bg-indigo-100 text-indigo-700', countdown: '2h 30m',
    countdownColor: 'text-[#999999]', urgent: false,
  },
  {
    emoji: '🎭', category: 'Events', categoryColor: 'text-emerald-700 bg-emerald-50',
    dot: 'bg-emerald-300', title: 'Student rush tickets — 50% off',
    business: 'MCC Theater · New York', discount: '50% OFF',
    discountColor: 'bg-indigo-100 text-indigo-700', countdown: '1h 20m',
    countdownColor: 'text-amber-500', urgent: false,
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF9] flex flex-col">

      {/* ── Floating pill header ─────────────────────────────────────────── */}
      <div className="sticky top-4 z-50 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <header
            className="bg-white/92 backdrop-blur-2xl border border-[#E0E0E0]/90 rounded-2xl shadow-lg shadow-black/[0.07] px-4 sm:px-5 flex items-center justify-between"
            style={{ height: '52px' }}
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500 shadow-sm shadow-indigo-200/60">
                <MapPinned className="w-3 h-3 text-white" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-[#080808]">Slow Hour</span>
              <span className="hidden sm:block text-xs text-[#999999] font-normal">· for students &amp; all</span>
            </div>
            <Link
              href="/discover"
              className="text-xs font-medium text-white bg-[#080808] px-4 py-2 rounded-full hover:bg-indigo-600 transition-all duration-200 shadow-sm"
            >
              Open app →
            </Link>
          </header>
        </div>
      </div>

      {/* ── Hero — two-column ─────────────────────────────────────────────── */}
      <section className="relative flex-1 max-w-6xl mx-auto px-6 sm:px-10 pt-12 pb-16">

        {/* Background glows */}
        <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-indigo-50/70 rounded-full blur-[120px] pointer-events-none -z-10" aria-hidden />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-violet-50/50 rounded-full blur-[100px] pointer-events-none -z-10" aria-hidden />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: copy ─────────────────────────────────────────────── */}
          <div>

            {/* Badge */}
            <div className="flex items-center gap-3 mb-8 animate-blur-in">
              <span className="inline-flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-full px-3 py-1.5 shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#666666]">
                  Real-time · 5 cities
                </span>
              </span>
              <div className="hidden sm:flex items-center gap-1.5" aria-hidden>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                <span className="w-1 h-1 rounded-full bg-violet-300" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(2.6rem,6vw,4.8rem)] font-light leading-[1.08] tracking-[-0.03em] text-[#080808] mb-6 animate-blur-in">
              <span className="block">Slow Hour:</span>
              <span className="block">What&apos;s Happening</span>
              <span className="block text-[#999999]">near you?</span>
            </h1>

            {/* Sub-copy */}
            <p className="text-base sm:text-lg font-light text-[#404040] leading-relaxed max-w-md mb-8 animate-blur-in-d1">
              Student deals — ranked by how fast they&apos;re disappearing.
              Edge-personalized to your city, live countdowns, no account needed.
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-8 animate-blur-in-d1">
              <div className="text-center">
                <p className="text-2xl font-light tracking-tight text-[#080808]">30+</p>
                <p className="text-[11px] text-[#999999] font-medium uppercase tracking-widest">Deals</p>
              </div>
              <div className="h-8 w-px bg-[#E0E0E0]" />
              <div className="text-center">
                <p className="text-2xl font-light tracking-tight text-[#080808]">5</p>
                <p className="text-[11px] text-[#999999] font-medium uppercase tracking-widest">Cities</p>
              </div>
              <div className="h-8 w-px bg-[#E0E0E0]" />
              <div className="text-center">
                <p className="text-2xl font-light tracking-tight text-[#080808]">Live</p>
                <p className="text-[11px] text-[#999999] font-medium uppercase tracking-widest">Countdowns</p>
              </div>
            </div>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-3 mb-10 animate-blur-in-d2">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 bg-[#080808] text-white text-sm font-medium px-5 py-3 rounded-full hover:bg-indigo-600 transition-all duration-300 shadow-md shadow-black/10 group"
              >
                Discover deals
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-[#999999]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Free · no sign-up
              </div>
            </div>

            {/* City pills */}
            <div className="flex flex-wrap items-center gap-2 animate-blur-in-d2">
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#999999]">
                Cities
              </span>
              <div className="h-px w-3 bg-[#E0E0E0]" />
              {CITIES.map(c => (
                <Link
                  key={c}
                  href={`/discover?city=${encodeURIComponent(c)}`}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#C8C8C8] text-[#404040] bg-white hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all duration-200"
                >
                  {c}
                </Link>
              ))}
            </div>

          </div>

          {/* ── Right: mock UI preview ──────────────────────────────────── */}
          {/*
            Static illustration of what the app looks like.
            Pure HTML/CSS — no JS, no interactivity.
            Gives visitors an immediate sense of the product before clicking.
          */}
          <div className="hidden lg:block relative">

            {/* Slight tilt + shadow wrapper — makes it feel like a "screenshot" */}
            <div className="relative space-y-3 animate-blur-in-d1">

              {/* Header chip row */}
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#999999]">
                  🔥 Ending soonest
                </span>
              </div>

              {/* Featured card (first mock) */}
              <div className={`rounded-3xl overflow-hidden shadow-md shadow-orange-100/60 bg-orange-50/40 border border-white/70`}>
                <div className="h-[3px] bg-gradient-to-r from-rose-400 via-red-400 to-orange-400" />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{MOCK_CARDS[0].emoji}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full ${MOCK_CARDS[0].categoryColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${MOCK_CARDS[0].dot}`} />
                        {MOCK_CARDS[0].category}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${MOCK_CARDS[0].discountColor}`}>
                      {MOCK_CARDS[0].discount}
                    </span>
                  </div>
                  <p className="font-medium text-[15px] text-[#080808] mb-1 tracking-tight">{MOCK_CARDS[0].title}</p>
                  <p className="text-xs text-[#999999] mb-4">{MOCK_CARDS[0].business}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-orange-100/60">
                    <div className={`flex items-center gap-1.5 ${MOCK_CARDS[0].countdownColor}`}>
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span className="text-xs font-mono font-semibold">{MOCK_CARDS[0].countdown}</span>
                    </div>
                    <span className="text-xs text-[#C8C8C8]">Copy</span>
                  </div>
                </div>
              </div>

              {/* 2-card mini grid */}
              <div className="grid grid-cols-2 gap-3">
                {MOCK_CARDS.slice(1).map((card, i) => (
                  <div key={i} className={`rounded-2xl overflow-hidden shadow-sm border border-white/70 ${i === 0 ? 'bg-violet-50/40' : 'bg-emerald-50/40'}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{card.emoji}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${card.categoryColor}`}>
                            <span className={`w-1 h-1 rounded-full ${card.dot}`} />
                            {card.category}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.discountColor}`}>
                          {card.discount}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#080808] leading-snug mb-1">{card.title}</p>
                      <p className="text-[10px] text-[#999999] mb-3 leading-tight">{card.business}</p>
                      <div className={`flex items-center gap-1 ${card.countdownColor}`}>
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono font-semibold">{card.countdown}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom label */}
              <p className="text-center text-[11px] text-[#C8C8C8] pt-1">
                Live preview · updates every session
              </p>

            </div>

            {/* Decorative glow behind the cards */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50/40 via-transparent to-orange-50/20 rounded-3xl blur-xl" aria-hidden />
          </div>

        </div>
      </section>

      {/* ── Feature row ──────────────────────────────────────────────────── */}
      <section className="border-t border-[#E0E0E0] bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '⚡', label: 'Urgency ranked', desc: 'Ending-soon deals surface first.' },
              { icon: '📍', label: 'Auto-detects city', desc: 'Edge geo — no location prompt.' },
              { icon: '🌤️', label: 'Weather-aware', desc: 'Context that actually matters.' },
              { icon: '🎲', label: 'Surprise me', desc: 'Random deal, one tap.' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="bg-[#FAFAF9] rounded-2xl border border-[#E0E0E0] p-4 hover:shadow-sm transition-shadow duration-200">
                <div className="text-xl mb-2">{icon}</div>
                <p className="text-xs font-semibold text-[#080808] mb-0.5">{label}</p>
                <p className="text-[11px] text-[#999999] font-light leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E0E0E0]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#999999] mb-1">
              Houston · New York · Austin · more
            </p>
            <p className="text-xl font-light tracking-tight text-[#080808]">
              Your city&apos;s best deals — live right now.
            </p>
          </div>
          <Link
            href="/discover"
            className="shrink-0 inline-flex items-center gap-2 bg-[#080808] text-white text-sm font-medium px-5 py-3 rounded-full hover:bg-indigo-600 transition-all duration-300 group"
          >
            Start exploring
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E0E0E0] py-5">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 flex items-center justify-between">
          <span className="text-xs text-[#C8C8C8]">Slow Hour · Vercel SA Assessment</span>
          <span className="text-xs text-[#C8C8C8]">Next.js Edge Runtime</span>
        </div>
      </footer>

    </main>
  )
}
