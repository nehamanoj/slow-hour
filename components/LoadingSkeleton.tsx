/**
 * LoadingSkeleton — Suspense fallback for DealsGrid.
 *
 * CRITICAL: skeleton dimensions must match the real DealsClient layout exactly.
 * Any size mismatch = layout shift when content streams in = CLS score hit.
 *
 * Updated to match the new multi-step layout:
 *   - Section header row
 *   - City strip
 *   - Featured card (tall, full-width)
 *   - Divider
 *   - Filter tabs
 *   - 5-card grid (featured takes one slot)
 */
export default function LoadingSkeleton() {
  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-28" aria-busy="true" aria-label="Loading deals">

      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-3 w-16 bg-[#F0F0F0] rounded-full animate-pulse" />
          <div className="h-5 w-56 bg-[#F0F0F0] rounded-full animate-pulse" />
        </div>
        <div className="h-8 w-28 bg-[#F0F0F0] rounded-full animate-pulse" />
      </div>
      <div className="h-px bg-[#F0F0F0] mb-6" />

      {/* ── City strip ── */}
      <div className="flex items-center gap-2 mb-10">
        <div className="h-3 w-12 bg-[#F0F0F0] rounded-full animate-pulse" />
        <div className="h-px w-4 bg-[#F0F0F0]" />
        {[64, 80, 68, 72, 56].map((w, i) => (
          <div key={i} className="h-7 bg-[#F0F0F0] rounded-full animate-pulse" style={{ width: w, animationDelay: `${i * 50}ms` }} />
        ))}
      </div>

      {/* ── Featured card skeleton ── */}
      <div className="mb-6">
        <div className="h-3 w-36 bg-[#F0F0F0] rounded-full animate-pulse mb-4" />
        <div className="bg-white rounded-3xl border border-[#F0F0F0] p-8 sm:p-10 animate-pulse">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#F0F0F0] rounded-xl" />
              <div className="h-5 w-20 bg-[#F0F0F0] rounded-full" />
            </div>
            <div className="h-8 w-20 bg-[#F0F0F0] rounded-full" />
          </div>
          <div className="h-8 w-3/4 bg-[#F0F0F0] rounded-lg mb-3" />
          <div className="h-4 w-1/4 bg-[#F0F0F0] rounded mb-6" />
          <div className="flex items-center justify-between">
            <div className="h-7 w-24 bg-[#F0F0F0] rounded" />
            <div className="h-8 w-28 bg-[#F0F0F0] rounded-full" />
          </div>
        </div>
      </div>

      {/* ── More deals divider ── */}
      <div className="flex items-center gap-4 my-8">
        <div className="h-px flex-1 bg-[#F0F0F0]" />
        <div className="h-3 w-20 bg-[#F0F0F0] rounded-full animate-pulse" />
        <div className="h-px flex-1 bg-[#F0F0F0]" />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 border-b border-[#F0F0F0] mb-6">
        {[40, 36, 48, 44, 60].map((w, i) => (
          <div key={i} className="h-10 bg-[#F0F0F0] rounded mx-2 animate-pulse" style={{ width: w, animationDelay: `${i * 40}ms` }} />
        ))}
      </div>

      {/* ── Deal grid ── 5 cards (featured takes 1 slot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#F0F0F0] p-6 animate-pulse" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 bg-[#F0F0F0] rounded-lg" />
                <div className="h-5 w-16 bg-[#F0F0F0] rounded-full" />
              </div>
              <div className="h-6 w-14 bg-[#F0F0F0] rounded-full" />
            </div>
            <div className="h-4 w-4/5 bg-[#F0F0F0] rounded mb-2" />
            <div className="h-3 w-2/5 bg-[#F0F0F0] rounded mb-2" />
            <div className="h-3 w-full bg-[#F0F0F0] rounded mb-1" />
            <div className="h-3 w-3/4 bg-[#F0F0F0] rounded mb-5" />
            <div className="flex items-center justify-between pt-4 border-t border-[#F5F5F5]">
              <div className="h-3 w-14 bg-[#F0F0F0] rounded" />
              <div className="h-3 w-10 bg-[#F0F0F0] rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
