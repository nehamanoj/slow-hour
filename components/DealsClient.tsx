'use client'

/**
 * DealsClient — Interactive hydration boundary.
 *
 * Everything here runs on the client after React hydrates.
 * It receives pre-ranked deals from the server (DealsGrid) and handles:
 *   - Category filter state
 *   - Expired deal tracking → "Missed" section
 *   - Surprise Me random highlight
 *   - City navigation (always → /discover?city=X)
 *   - Demo test-data form (collapsible panel for adding custom deals during presentations)
 *
 * VISUAL STRUCTURE (top → bottom):
 *   1. Section header: deal count + weather message + Surprise Me
 *   2. City quick-select strip
 *   3. [FEATURED] Most urgent deal — full-width spotlight card
 *   4. Divider → "More deals"
 *   5. Filter tabs
 *   6. Deal grid (remaining deals)
 *   7. Empty state (if no deals match filter)
 *   8. Missed deals section (deals that expired this session)
 *   9. Demo panel (collapsible form to inject test deals)
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle, ChevronDown, Plus, FlaskConical, Clock, Inbox } from 'lucide-react'
import { filterDeals } from '@/lib/ranking'
import { SUPPORTED_CITIES } from '@/lib/types'
import type { Deal, WeatherData, SupportedCity, Category } from '@/lib/types'
import DealCard from './DealCard'
import Filters from './Filters'
import EmptyState from './EmptyState'

interface DealsClientProps {
  initialDeals: Deal[]
  city: SupportedCity
  weather: WeatherData
}

// All valid categories for the test form dropdown
const CATEGORIES: Category[] = ['Food', 'Drinks', 'Events', 'Fitness', 'Retail', 'Study']

// Emoji map for test-form auto-assignment
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

  // ── Custom deals injected via demo form ────────────────────────────────
  const [customDeals, setCustomDeals] = useState<Deal[]>([])

  // ── Demo panel state ───────────────────────────────────────────────────
  const [demoOpen, setDemoOpen] = useState(false)
  const [formTitle,    setFormTitle]    = useState('')
  const [formBusiness, setFormBusiness] = useState('')
  const [formCategory, setFormCategory] = useState<Category>('Food')
  const [formDiscount, setFormDiscount] = useState('')
  const [formDesc,     setFormDesc]     = useState('')
  const [formMinutes,  setFormMinutes]  = useState('2')

  // When a card expires: move deal to missedDeals, mark id expired
  const handleExpired = useCallback((id: string) => {
    setExpiredIds(prev => {
      if (prev.has(id)) return prev
      return new Set([...prev, id])
    })
    setMissedDeals(prev => {
      const allDeals = [...initialDeals, ...customDeals]
      const deal = allDeals.find(d => d.id === id)
      if (!deal || prev.find(d => d.id === id)) return prev
      return [deal, ...prev]
    })
  }, [initialDeals, customDeals])

  // Merge initial + custom, filter out expired, then apply active filter
  const allActive = [...customDeals, ...initialDeals].filter(d => !expiredIds.has(d.id))
  const filtered  = filterDeals(allActive, activeFilter)

  // Split: featured (most urgent first item) + rest
  const featuredDeal: Deal | null = filtered.length > 0 ? filtered[0] : null
  const restDeals:    Deal[]      = filtered.length > 1 ? filtered.slice(1) : []
  const showFeatured = activeFilter === 'all' && featuredDeal !== null

  // Surprise Me — pick a random deal, scroll to + highlight it briefly
  function handleSurpriseMe() {
    if (filtered.length === 0) return
    const random = filtered[Math.floor(Math.random() * filtered.length)]
    setHighlightedId(random.id)
    setTimeout(() => {
      document.getElementById(`deal-${random.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    setTimeout(() => setHighlightedId(null), 2500)
  }

  // City navigation — scroll: false keeps the user's scroll position so
  // clicking a city pill doesn't snap back to the top of the page.
  function changeCity(newCity: SupportedCity) {
    router.push(`/discover?city=${encodeURIComponent(newCity)}`, { scroll: false })
  }

  // Demo form submit — create a fake Deal and prepend to customDeals
  function handleAddDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle || !formBusiness) return

    const minutes = parseFloat(formMinutes) || 2
    const newDeal: Deal = {
      id:             `custom-${Date.now()}`,
      title:          formTitle,
      business:       formBusiness,
      description:    formDesc || 'Demo deal — added for live testing.',
      city:           city,
      category:       formCategory,
      discount:       formDiscount || 'DEMO',
      // Convert minutes → fractional hours (what computeExpiryTimestamp expects)
      expiresInHours: minutes / 60,
      emoji:          CATEGORY_EMOJI[formCategory],
    }

    setCustomDeals(prev => [newDeal, ...prev])

    // Reset form fields
    setFormTitle(''); setFormBusiness(''); setFormDiscount(''); setFormDesc(''); setFormMinutes('2')
  }

  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-28">

      {/* ══ STEP 1: Section header ═══════════════════════════════════════════ */}
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

        {/* Surprise Me button */}
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

      {/* Thin rule below header */}
      <div className="h-px bg-[#E0E0E0] mb-6" />

      {/* ══ STEP 2: City quick-select ═════════════════════════════════════════ */}
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

      {/* ══ STEP 3: Featured deal ══════════════════════════════════════════════ */}
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
          <DealCard
            deal={featuredDeal}
            index={0}
            isHighlighted={highlightedId === featuredDeal.id}
            onExpired={() => handleExpired(featuredDeal.id)}
            variant="featured"
          />
        </div>
      )}

      {/* ══ STEP 4: Divider into main grid ════════════════════════════════════ */}
      {showFeatured && restDeals.length > 0 && (
        <div className="flex items-center gap-4 my-8">
          <div className="h-px flex-1 bg-[#E0E0E0]" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#999999]">
            More deals
          </span>
          <div className="h-px flex-1 bg-[#E0E0E0]" />
        </div>
      )}

      {/* ══ STEP 5: Filters ═══════════════════════════════════════════════════ */}
      <div className="mb-6">
        <Filters activeFilter={activeFilter} onChange={setActiveFilter} />
      </div>

      {/* ══ STEP 6: Deal grid or empty state ══════════════════════════════════ */}
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
              isHighlighted={highlightedId === deal.id}
              onExpired={() => handleExpired(deal.id)}
              variant="default"
            />
          ))}
        </div>
      )}

      {/* ══ STEP 7: Missed deals ══════════════════════════════════════════════
          Deals that expired this session. Shown in muted grayscale so they
          feel "past" — the visual contrast between live deals and missed deals
          reinforces the urgency of the active ones above.
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

      {/* ══ STEP 8: Demo panel ════════════════════════════════════════════════
          Collapsible form to inject test deals during the Vercel SA presentation.
          Walk-through for the demo:
            1. Open this panel, fill in a title + business
            2. Set "Expires in" to 1–2 minutes
            3. Click "Add deal" — it jumps to the top as the featured card
            4. Watch the live countdown tick down in real time
            5. Card auto-removes and appears in "Missed" above when it hits 0
          This showcases the full deal lifecycle in ~2 minutes of live demo time.
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
              · add a deal to see it live
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#999999] transition-transform duration-200 ${demoOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {demoOpen && (
          <div className="px-6 pb-6 border-t border-dashed border-[#C8C8C8]">

            {/* How-to callout */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-4 mb-5 text-xs text-indigo-700 leading-relaxed">
              <p className="font-semibold mb-1.5">Add Deal Live:</p>
              <ol className="list-decimal list-inside space-y-1 text-indigo-600">
                <li>Fill in a deal title + business name below</li>
                <li>Set &ldquo;Expires in&rdquo; to <strong>1–2 minutes</strong></li>
                <li>Click &ldquo;Add deal&rdquo; — it appears instantly as the featured card</li>
                <li>Watch the countdown tick live in real time</li>
                <li>When it hits zero: card fades out → appears in &ldquo;Missed · catch them next time&rdquo;</li>
              </ol>
            </div>

            <form onSubmit={handleAddDeal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

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

              <div className="sm:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-[#080808] hover:bg-[#1E1E1E] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all duration-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add deal
                </button>
                <span className="text-xs text-[#999999]">
                  Appears instantly · countdown starts from now
                </span>
              </div>
            </form>
          </div>
        )}
      </div>

    </section>
  )
}
