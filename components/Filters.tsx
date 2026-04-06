'use client'

// filters — tab-style, not pill-style.
//
// minimal text tabs with an underline indicator instead of colored pill buttons.
// active state: bold text + thin underline accent.
// inactive: muted gray, hover darkens text.
// "ending soon" gets rose color to match the urgency aesthetic.

import { LayoutGrid, UtensilsCrossed, Wine, Calendar, Zap } from 'lucide-react'

const FILTERS = [
  { id: 'all',         label: 'All',          Icon: LayoutGrid },
  { id: 'food',        label: 'Food',         Icon: UtensilsCrossed },
  { id: 'drinks',      label: 'Drinks',       Icon: Wine },
  { id: 'events',      label: 'Events',       Icon: Calendar },
  { id: 'ending-soon', label: 'Ending soon',  Icon: Zap },
] as const

interface FiltersProps {
  activeFilter: string
  onChange: (filter: string) => void
}

export default function Filters({ activeFilter, onChange }: FiltersProps) {
  return (
    <div
      className="flex items-center gap-1 border-b border-[#E8E8E8]"
      role="group"
      aria-label="Filter deals by category"
    >
      {FILTERS.map(({ id, label, Icon }) => {
        const active = activeFilter === id
        const isUrgency = id === 'ending-soon'

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={`
              relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium
              transition-all duration-200 whitespace-nowrap
              ${active
                ? isUrgency
                  ? 'text-rose-500'
                  : 'text-[#0C0C0C]'
                : isUrgency
                ? 'text-[#A3A3A3] hover:text-rose-400'
                : 'text-[#A3A3A3] hover:text-[#404040]'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}

            {/* active underline indicator */}
            {active && (
              <span
                className={`absolute bottom-0 left-0 right-0 h-[1.5px] rounded-full ${
                  isUrgency ? 'bg-rose-500' : 'bg-[#0C0C0C]'
                }`}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
