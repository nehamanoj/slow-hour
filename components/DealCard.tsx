'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Copy, Check } from 'lucide-react'
import type { Deal, Category } from '@/lib/types'
import { formatCountdown, computeExpiryTimestamp } from '@/lib/time'

// ─── Category system ──────────────────────────────────────────────────────────
// Each category gets:
//   dot   — the colored dot inside the badge pill
//   bg    — the badge pill background
//   text  — the badge pill text color
//   card  — the card's own background tint (very subtle — ~4% opacity)
//           This gives each card a hint of personality without being loud.
//           Think: Notion's colored page icons but for card backgrounds.
const CATEGORY_STYLES: Record<Category, { dot: string; bg: string; text: string; card: string }> = {
  Food:    { dot: 'bg-orange-300',  bg: 'bg-orange-50',  text: 'text-orange-700',  card: 'bg-orange-50/40'  }, // warm peach
  Drinks:  { dot: 'bg-violet-300',  bg: 'bg-violet-50',  text: 'text-violet-700',  card: 'bg-violet-50/40'  }, // soft lavender
  Events:  { dot: 'bg-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700', card: 'bg-emerald-50/40' }, // sage green
  Fitness: { dot: 'bg-sky-300',     bg: 'bg-sky-50',     text: 'text-sky-700',     card: 'bg-sky-50/40'     }, // sky blue
  Retail:  { dot: 'bg-rose-300',    bg: 'bg-rose-50',    text: 'text-rose-700',    card: 'bg-rose-50/40'    }, // coral rose
  Study:   { dot: 'bg-amber-300',   bg: 'bg-amber-50',   text: 'text-amber-700',   card: 'bg-amber-50/40'   }, // warm gold
}

interface DealCardProps {
  deal: Deal
  index: number
  isHighlighted: boolean
  onExpired: () => void
  variant?: 'default' | 'featured'
}

export default function DealCard({ deal, index, isHighlighted, onExpired, variant = 'default' }: DealCardProps) {
  const [expiresAt] = useState(() => computeExpiryTimestamp(deal.expiresInHours))
  const [countdown, setCountdown] = useState(() => formatCountdown(expiresAt))
  const [isExpired, setIsExpired] = useState(false)
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  // Staggered entrance — each card delays by index × 60ms
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60)
    return () => clearTimeout(t)
  }, [index])

  // Live countdown — ticks every second, fades card out on expiry
  useEffect(() => {
    const id = setInterval(() => {
      const next = formatCountdown(expiresAt)
      setCountdown(next)
      if (next === 'Expired') {
        setIsExpired(true)
        clearInterval(id)
        setTimeout(onExpired, 900) // let fade-out complete before DOM removal
      }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpired])

  // Copy deal as formatted plain text
  const handleCopy = useCallback(async () => {
    const text = [
      `${deal.emoji} ${deal.title}`,
      `📍 ${deal.business} · ${deal.city}`,
      `🏷️ ${deal.discount}`,
      `⏰ Expires in: ${countdown}`,
      `ℹ️ ${deal.description}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* fail silently */ }
  }, [deal, countdown])

  const style = CATEGORY_STYLES[deal.category]
  const isUrgent   = deal.expiresInHours <= 2
  const isCritical = deal.expiresInHours <= 1

  // ── FEATURED VARIANT ─────────────────────────────────────────────────────
  if (variant === 'featured') {
    return (
      <article
        id={`deal-${deal.id}`}
        className={`relative rounded-3xl overflow-hidden transition-all duration-500 ${style.card} ${
          isHighlighted ? 'ring-2 ring-[#4F46E5] ring-offset-4' : 'border border-white/60'
        }`}
        style={{
          opacity: isExpired ? 0 : visible ? 1 : 0,
          transform: visible && !isExpired ? 'translateY(0)' : 'translateY(12px)',
          transitionDuration: isExpired ? '800ms' : '500ms',
        }}
      >
        {/* Urgency gradient bar — thicker on featured */}
        <div
          className={`h-[3px] w-full ${
            isCritical
              ? 'bg-gradient-to-r from-rose-400 via-red-400 to-orange-400'
              : 'bg-gradient-to-r from-amber-300 via-orange-400 to-rose-300'
          }`}
        />

        <div className="p-8 sm:p-10">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label={deal.category}>{deal.emoji}</span>
              <div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {deal.category}
                </span>
              </div>
            </div>

            {/* Discount badge — large on featured */}
            <span className={`text-sm font-bold px-4 py-2 rounded-full shrink-0 ${
              isCritical ? 'bg-rose-500 text-white' :
              isUrgent   ? 'bg-amber-100 text-amber-700' :
                           'bg-[#EEF2FF] text-[#4F46E5]'
            }`}>
              {deal.discount}
            </span>
          </div>

          {/* Title — large */}
          <div className="select-text mb-6">
            <h3 className="text-2xl sm:text-3xl font-light tracking-tight text-[#0C0C0C] leading-snug mb-2">
              {deal.title}
            </h3>
            <p className="text-sm font-medium text-[#A3A3A3]">{deal.business}</p>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between">
            {/* Countdown — prominent on featured */}
            <div className={`flex items-center gap-2 ${
              isCritical ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-[#A3A3A3]'
            }`}>
              <Clock className={`w-4 h-4 ${isCritical ? 'animate-pulse' : ''}`} />
              <span className="text-lg font-mono font-semibold tracking-tight">{countdown}</span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-xs font-medium text-[#A3A3A3] hover:text-[#4F46E5] border border-[#E8E8E8] hover:border-[#4F46E5]/40 px-4 py-2 rounded-full transition-all duration-200"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">Copied</span></>
              ) : (
                <><Copy className="w-3.5 h-3.5" /><span>Copy deal</span></>
              )}
            </button>
          </div>
        </div>

        {isHighlighted && (
          <div className="absolute inset-0 bg-[#4F46E5]/[0.03] pointer-events-none rounded-3xl animate-pulse" />
        )}
      </article>
    )
  }

  // ── DEFAULT VARIANT ───────────────────────────────────────────────────────
  return (
    <article
      id={`deal-${deal.id}`}
      className={`
        relative rounded-2xl overflow-hidden
        transition-all duration-500 select-none group ${style.card}
        ${isHighlighted
          ? 'ring-2 ring-[#4F46E5] ring-offset-2'
          : 'border border-white/70 hover:border-white hover:shadow-lg hover:shadow-black/[0.05]'
        }
      `}
      style={{
        opacity: isExpired ? 0 : visible ? 1 : 0,
        transform: visible && !isExpired ? 'translateY(0)' : 'translateY(14px)',
        transitionDuration: isExpired ? '800ms' : '400ms',
        transitionDelay: isExpired ? '0ms' : `${index * 40}ms`,
      }}
    >
      {/* Urgency top stripe */}
      {isUrgent && (
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${
          isCritical
            ? 'bg-gradient-to-r from-red-400 via-rose-400 to-orange-400'
            : 'bg-gradient-to-r from-amber-300 via-orange-400 to-rose-300'
        }`} aria-hidden="true" />
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-[22px] leading-none" role="img" aria-label={deal.category}>
              {deal.emoji}
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
              {deal.category}
            </span>
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
            isCritical ? 'bg-rose-500 text-white' :
            isUrgent   ? 'bg-amber-100 text-amber-700' :
                         'bg-[#EEF2FF] text-[#4F46E5]'
          }`}>
            {deal.discount}
          </span>
        </div>

        {/* Body */}
        <div className="select-text mb-5">
          <h3 className="font-medium text-[15px] leading-snug text-[#0C0C0C] mb-1.5 tracking-[-0.01em]">
            {deal.title}
          </h3>
          <p className="text-xs font-medium text-[#A3A3A3] mb-2">{deal.business}</p>
          <p className="text-xs text-[#A3A3A3] leading-relaxed">{deal.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F5F5F5]">
          <div className={`flex items-center gap-1.5 ${
            isCritical ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-[#A3A3A3]'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isCritical ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-mono font-semibold">{countdown}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-[#A3A3A3] hover:text-[#4F46E5] transition-colors duration-200"
            aria-label="Copy deal info"
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500 font-medium">Copied</span></>
            ) : (
              <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>

      {isHighlighted && (
        <div className="absolute inset-0 bg-[#4F46E5]/[0.04] pointer-events-none rounded-2xl animate-pulse" aria-hidden="true" />
      )}
    </article>
  )
}
