'use client'

/**
 * DealsClient — Interactive hydration boundary.
 *
 * Handles:
 *   - Category filter state
 *   - Expired deal tracking → "Missed" section
 *   - Surprise Me random highlight
 *   - City navigation (/discover?city=X)
 *   - Cross-user shared deals (poll /api/shared-deals every 5s)
 *   - Add deal panel (auto-adds on Enter — no button click needed)
 *
 * TIMER STABILITY FIX:
 * expiresAt timestamps are stored in `expiresAtMapRef` (a useRef), keyed by
 * deal.id. They are set once and never overwritten — so even if a DealCard
 * unmounts and remounts (e.g. when switching between "all" and a category
 * filter), it receives the same expiresAt and the countdown continues without
 * resetting. Previously, expiresAt was computed inside DealCard's useState,
 * which re-ran on every remount.
 *
 * CROSS-USER SHARING:
 * When a deal is added via the form it's POSTed to /api/shared-deals.
 * All clients poll that endpoint every 5s and merge results with local deals.
 * Server deals carry an absolute expiresAt timestamp so all viewers see the
 * same countdown regardless of when they loaded the page.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle, ChevronDown, FlaskConical, Clock, Inbox, Check } from 'lucide-react'
import { filterDeals } from '@/lib/ranking'
import { computeExpiryTimestamp } from '@/lib/time'
import { SUPPORTED_CITIES } from '@/lib/types'
import type { Deal, WeatherData, SupportedCity, Category } from '@/lib/types'
import type { SharedDeal } from '@/app/api/shared-deals/route'
import DealCard from './DealCard'
import Filters from './Filters'
import EmptyState from './EmptyState'

interface DealsClientProps {
  initialDeals: Deal[]
  city: SupportedCity
  weather: WeatherData
}

const CATEGORIES: Category[] = ['Food', 'Drinks', 'Events', 'Fitness', 'Retail', 'Study']

const CATEGORY_EMOJI: Record<Category, string> = {
  Food:    '🍔',
  Drinks:  '🥤',
  Events:  '🎉',
  Fitness: '🏋️',
  Retail:  '🛍️',
  Study:   '📚',
}

export default function DealsClient({ initialDeals, city, weather }: DealsClientProps) {
  const router = useRouter()

  // ── Filter / expired state ──────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState('all')
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set())
  const [missedDeals, setMissedDeals] = useState<Deal[]>([])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // ── Custom deals added locally ──────────────────────────────────────────
  const [customDeals, setCustomDeals] = useState<Deal[]>([])

  // ── Deals shared by other users (polled from /api/shared-deals) ─────────
  const [serverDeals, setServerDeals] = useState<Deal[]>([])

  // ── Stable expiry timestamps keyed by deal.id ───────────────────────────
  // A useRef so writes never trigger re-renders. Once a deal's expiresAt is
  // set here it never changes — this is what keeps countdown timers stable.
  const expiresAtMapRef = useRef<Record<string, number>>({})

  function getExpiresAt(deal: Deal): number {
    if (!(deal.id in expiresAtMapRef.current)) {
      expiresAtMapRef.current[deal.id] = computeExpiryTimestamp(deal.expiresInHours)
    }
    return expiresAtMapRef.current[deal.id]
  }

  // ── Demo panel state ───────────────────────────────────────────────────
  const [demoOpen, setDemoOpen] = useState(false)
  const [formTitle,    setFormTitle]    = useState('')
  const [formBusiness, setFormBusiness] = useState('')
  const [formCategory, setFormCategory] = useState<Category>('Food')
  const [formDiscount, setFormDiscount] = useState('')
  const [formDesc,     setFormDesc]     = useState('')
  const [formMinutes,  setFormMinutes]  = useState('2')
  const [justAdded,    setJustAdded]    = useState(false)

  // ── Poll /api/shared-deals every 5s ─────────────────────────────────────
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/shared-deals?city=${encodeURIComponent(city)}`)
        if (!res.ok) return
        const data = (await res.json()) as SharedDeal[]

        const deals: Deal[] = data.map(d => {
          // Server's expiresAt is the source of truth — store it so DealCard
          // gets the same timestamp even if it unmounts/remounts
          expiresAtMapRef.current[d.id] = d.expiresAt
          return {
            id:            d.id,
            title:         d.title,
            business:      d.business,
            description:   d.description,
            city:          d.city,
            category:      d.category as Category,
            discount:      d.discount,
            expiresInHours: Math.max(0, (d.expiresAt - Date.now()) / (1000 * 60 * 60)),
            emoji:         d.emoji,
          }
        })

        setServerDeals(deals)
      } catch {
        // fail silently — app is fully functional without shared deals
      }
    }

    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [city])

  // ── Expiry handler ──────────────────────────────────────────────────────
  const handleExpired = useCallback((id: string) => {
    setExpiredIds(prev => {
      if (prev.has(id)) return prev
      return new Set([...prev, id])
    })
    setMissedDeals(prev => {
      const allDeals = [...serverDeals, ...initialDeals, ...customDeals]
      const deal = allDeals.find(d => d.id === id)
      if (!deal || prev.find(d => d.id === id)) return prev
      return [deal, ...prev]
    })
  }, [initialDeals, customDeals, serverDeals])

  // ── Merge all deal sources, deduplicate by id ───────────────────────────
  // Server deals take priority so their server-stamped expiresAt is canonical.
  const seen = new Set<string>()
  const allActive = [...serverDeals, ...customDeals, ...initialDeals]
    .filter(d => !expiredIds.has(d.id))
    .filter(d => {
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    })

  const filtered     = filterDeals(allActive, activeFilter)
  const featuredDeal: Deal | null = filtered.length > 0 ? filtered[0] : null
  const restDeals:    Deal[]      = filtered.length > 1 ? filtered.slice(1) : []
  const showFeatured = activeFilter === 'all' && featuredDeal !== null

  // ── Surprise Me ─────────────────────────────────────────────────────────
  function handleSurpriseMe() {
    if (filtered.length === 0) return
    const random = filtered[Math.floor(Math.random() * filtered.length)]
    setHighlightedId(random.id)
    setTimeout(() => {
      document.getElementById(`deal-${random.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    setTimeout(() => setHighlightedId(null), 2500)
  }

  // ── City navigation ──────────────────────────────────────────────────────
  function changeCity(newCity: SupportedCity) {
    router.push(`/discover?city=${encodeURIComponent(newCity)}`, { scroll: false })
  }

  // ── Add deal — auto-triggered on Enter, no button click needed ──────────
  function handleAddDeal(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!formTitle.trim() || !formBusiness.trim()) return

    const minutes    = parseFloat(formMinutes) || 2
    const expiresAt  = Date.now() + minutes * 60 * 1000
    const id         = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const newDeal: Deal = {
      id,
      title:          formTitle.trim(),
      business:       formBusiness.trim(),
      description:    formDesc.trim() || 'Added live.',
      city,
      category:       formCategory,
      discount:       formDiscount.trim() || 'DEAL',
      expiresInHours: minutes / 60,
      emoji:          CATEGORY_EMOJI[formCategory],
    }

    // Pin this deal's expiry before adding it so getExpiresAt() is consistent
    expiresAtMapRef.current[id] = expiresAt

    // Optimistic local update — card appears instantly
    setCustomDeals(prev => [newDeal, ...prev])

    // Broadcast to everyone else on the site
    fetch('/api/shared-deals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...newDeal, expiresAt }),
    }).catch(() => {}) // fail silently

    // Show confirmation briefly
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)

    // Reset form
    setFormTitle(''); setFormBusiness('')
    setFormDiscount(''); setFormDesc(''); setFormMinutes('2')
  }

  // Pressing Enter in any form field triggers add (if required fields are filled)
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && !e.shiftKey && formTitle.trim() && formBusiness.trim()) {
      e.preventDefault()
      handleAddDeal()
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-28">

      {/* ══ Section header ═══════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#666666] mb-1">
            Near you
          </p>
          <p className="text-base font-light text-[#404040]">
            {weather.message}
            <span className="text-[#999999] ml-2 text-sm">
              · {allActive.length} deal{allActive.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>

        {filtered.length > 1 && (
          <button
            onClick={handleSurpriseMe}
            className="flex items-center gap-2 text-xs font-medium text-[#404040] hover:text-[#4F46E5] border border-[#C8C8C8] hover:border-[#4F46E5]/40 bg-white px-4 py-2 rounded-full transition-all duration-200 shadow-sm group"
          >
            <Shuffle className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
            Surprise me
          </button>
        )}
      </div>

      <div className="h-px bg-[#E0E0E0] mb-6" />

      {/* ══ City quick-select ═════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 flex-wrap mb-10">
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#666666]">
          Explore
        </span>
        <div className="h-px w-4 bg-[#E0E0E0]" />
        {SUPPORTED_CITIES.map(c => (
          <button
            key={c}
            onClick={() => changeCity(c)}
            className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-all duration-200 ${
              c === city
                ? 'bg-[#080808] text-white border-[#080808]'
                : 'bg-white text-[#404040] border-[#C8C8C8] hover:border-[#4F46E5]/40 hover:text-[#4F46E5]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ══ Featured deal ══════════════════════════════════════════════════════ */}
      {showFeatured && featuredDeal && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#666666]">
              {featuredDeal.expiresInHours <= (1 / 60) * 5
                ? '⚡ Critical — ending in seconds'
                : featuredDeal.expiresInHours <= 1
                ? '⚡ Critical — ending very soon'
                : '🔥 Ending soonest'}
            </span>
          </div>
          {/*
            key={featuredDeal.id} is essential here.
            Without it, React uses positional reconciliation: when a deal moves
            between the featured slot and the grid (e.g. on filter change),
            the DealCard unmounts and remounts, resetting the countdown.
            With a stable key, React "moves" the component rather than
            replacing it, so all internal state (countdown timer) is preserved.
          */}
          <DealCard
            key={featuredDeal.id}
            deal={featuredDeal}
            index={0}
            expiresAt={getExpiresAt(featuredDeal)}
            isHighlighted={highlightedId === featuredDeal.id}
            onExpired={() => handleExpired(featuredDeal.id)}
            variant="featured"
          />
        </div>
      )}

      {showFeatured && restDeals.length > 0 && (
        <div className="flex items-center gap-4 my-8">
          <div className="h-px flex-1 bg-[#E0E0E0]" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#999999]">
            More deals
          </span>
          <div className="h-px flex-1 bg-[#E0E0E0]" />
        </div>
      )}

      {/* ══ Filters ═══════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <Filters activeFilter={activeFilter} onChange={setActiveFilter} />
      </div>

      {/* ══ Deal grid ══════════════════════════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <EmptyState
          filter={activeFilter}
          city={city}
          onClearFilter={() => setActiveFilter('all')}
          onChangeCity={changeCity}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(showFeatured ? restDeals : filtered).map((deal, i) => (
            <DealCard
              key={deal.id}
              deal={deal}
              index={i}
              expiresAt={getExpiresAt(deal)}
              isHighlighted={highlightedId === deal.id}
              onExpired={() => handleExpired(deal.id)}
              variant="default"
            />
          ))}
        </div>
      )}

      {/* ══ Missed deals ══════════════════════════════════════════════════════
          Shown only after a deal's countdown hits zero this session.
          Grayscale + opacity makes them feel "past" vs the live deals above.
      ═══════════════════════════════════════════════════════════════════════ */}
      {missedDeals.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-[#E0E0E0]" />
            <div className="flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5 text-[#999999]" />
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#999999]">
                Missed · catch them next time
              </span>
            </div>
            <div className="h-px flex-1 bg-[#E0E0E0]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {missedDeals.map((deal, i) => (
              <article
                key={`missed-${deal.id}-${i}`}
                className="relative bg-[#FAFAF9] rounded-2xl border border-[#E0E0E0] p-6 opacity-55 grayscale"
              >
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-[#999999] bg-[#F0F0F0] px-2 py-0.5 rounded-full">
                    Expired
                  </span>
                </div>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-xl" role="img" aria-label={deal.category}>{deal.emoji}</span>
                  <p className="text-xs font-semibold text-[#666666]">{deal.category}</p>
                </div>
                <h3 className="text-sm font-medium text-[#404040] leading-snug mb-1 line-through decoration-[#C8C8C8]">
                  {deal.title}
                </h3>
                <p className="text-xs text-[#999999] mb-0.5">{deal.business}</p>
                <p className="text-xs text-[#999999] font-semibold">{deal.discount}</p>
                <div className="mt-4 pt-3 border-t border-[#E0E0E0] flex items-center gap-1.5 text-[#999999]">
                  <Clock className="w-3 h-3" />
                  <span className="text-[11px] font-mono">Expired</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ══ Add deal panel ════════════════════════════════════════════════════
          Fill in title + business, then press Enter (or Tab through to the
          last field) — the deal appears instantly without clicking any button.
          It's also broadcast to everyone else currently on the page.
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mt-10 border border-dashed border-[#C8C8C8] rounded-2xl overflow-hidden">

        <button
          onClick={() => setDemoOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FAFAF9] transition-colors duration-200 text-left"
        >
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-4 h-4 text-[#666666]" />
            <span className="text-sm font-medium text-[#404040]">Add Deal</span>
            <span className="text-xs text-[#999999] hidden sm:inline">
              · visible to everyone on the site
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#999999] transition-transform duration-200 ${demoOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {demoOpen && (
          <div className="px-6 pb-6 border-t border-dashed border-[#C8C8C8]">

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-4 mb-5 text-xs text-indigo-700 leading-relaxed">
              <p className="font-semibold mb-1">Add a deal — visible to everyone</p>
              <p className="text-indigo-600">
                Fill in title + business name, then press <kbd className="bg-white border border-indigo-200 rounded px-1 font-mono">↵ Enter</kbd> — the deal appears instantly for all visitors and starts counting down live.
              </p>
            </div>

            <form
              onSubmit={handleAddDeal}
              onKeyDown={handleFormKeyDown}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#666666] mb-1.5">
                  Deal title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. 50% off all lattes"
                  required
                  className="w-full text-sm px-4 py-2.5 border border-[#C8C8C8] rounded-xl bg-white text-[#080808] placeholder-[#C8C8C8] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#666666] mb-1.5">
                  Business name *
                </label>
                <input
                  type="text"
                  value={formBusiness}
                  onChange={e => setFormBusiness(e.target.value)}
                  placeholder="e.g. Blue Bottle Coffee"
                  required
                  className="w-full text-sm px-4 py-2.5 border border-[#C8C8C8] rounded-xl bg-white text-[#080808] placeholder-[#C8C8C8] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#666666] mb-1.5">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as Category)}
                  className="w-full text-sm px-4 py-2.5 border border-[#C8C8C8] rounded-xl bg-white text-[#080808] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#666666] mb-1.5">
                  Discount label
                </label>
                <input
                  type="text"
                  value={formDiscount}
                  onChange={e => setFormDiscount(e.target.value)}
                  placeholder="e.g. 30% OFF"
                  className="w-full text-sm px-4 py-2.5 border border-[#C8C8C8] rounded-xl bg-white text-[#080808] placeholder-[#C8C8C8] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#666666] mb-1.5">
                  Expires in (minutes)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formMinutes}
                  onChange={e => setFormMinutes(e.target.value)}
                  // Pressing Enter in a number input doesn't trigger form submit
                  // in all browsers — add explicit onKeyDown as a fallback
                  onKeyDown={e => {
                    if (e.key === 'Enter' && formTitle.trim() && formBusiness.trim()) {
                      e.preventDefault()
                      handleAddDeal()
                    }
                  }}
                  className="w-full text-sm px-4 py-2.5 border border-[#C8C8C8] rounded-xl bg-white text-[#080808] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#666666] mb-1.5">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Short deal description..."
                  className="w-full text-sm px-4 py-2.5 border border-[#C8C8C8] rounded-xl bg-white text-[#080808] placeholder-[#C8C8C8] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition"
                />
              </div>

              {/* Confirmation / submit row */}
              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                {justAdded ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <Check className="w-4 h-4" />
                    Deal added — visible to everyone
                  </span>
                ) : (
                  <span className="text-xs text-[#999999]">
                    Press <kbd className="bg-[#F5F5F5] border border-[#E0E0E0] rounded px-1 font-mono text-[10px]">↵ Enter</kbd> to add · appears for all visitors instantly
                  </span>
                )}
              </div>

            </form>
          </div>
        )}
      </div>

    </section>
  )
}
