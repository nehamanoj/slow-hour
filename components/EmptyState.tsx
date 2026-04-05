/**
 * EmptyState — clean, editorial empty state.
 *
 * Matches the new minimal aesthetic: no colored icon containers,
 * just typography and subtle actions. Think Apple's "nothing here yet" screens.
 */

import { SUPPORTED_CITIES } from '@/lib/types'
import type { SupportedCity } from '@/lib/types'

interface EmptyStateProps {
  filter: string
  city: SupportedCity
  onClearFilter: () => void
  onChangeCity: (city: SupportedCity) => void
}

export default function EmptyState({ filter, city, onClearFilter, onChangeCity }: EmptyStateProps) {
  const isFiltered = filter !== 'all'
  const otherCities = SUPPORTED_CITIES.filter(c => c !== city)

  return (
    <div className="flex flex-col items-start py-20">
      {/* Overline */}
      <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#A3A3A3] mb-4">
        {isFiltered ? 'No matches' : 'Nothing here yet'}
      </p>

      {/* Headline */}
      <h3 className="text-3xl font-light tracking-tight text-[#0C0C0C] mb-3">
        It&apos;s a little quiet here
      </h3>

      {/* Sub-copy */}
      <p className="text-base font-light text-[#A3A3A3] max-w-sm leading-relaxed mb-10">
        {isFiltered
          ? `No ${filter} deals are active right now. Clear the filter to see everything.`
          : `No deals near ${city} at the moment. Try exploring another city.`}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isFiltered && (
          <button
            onClick={onClearFilter}
            className="text-sm font-medium text-[#0C0C0C] border border-[#0C0C0C] px-5 py-2.5 rounded-full hover:bg-[#0C0C0C] hover:text-white transition-all duration-300"
          >
            Show all deals
          </button>
        )}

        {!isFiltered && otherCities.map(c => (
          <button
            key={c}
            onClick={() => onChangeCity(c)}
            className="text-sm font-medium text-[#404040] border border-[#E8E8E8] bg-white px-5 py-2.5 rounded-full hover:border-[#4F46E5]/40 hover:text-[#4F46E5] transition-all duration-200"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
