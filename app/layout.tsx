import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

/**
 * Font: DM Sans
 *
 * Chosen for its clean, geometric quality that reads as "Apple-modern"
 * without using a proprietary font. Key properties:
 * - Slightly rounded terminals → friendly, not corporate
 * - Excellent at both display (thin) and body (regular) weights
 * - Optical sizing at large scales keeps headlines crisp
 *
 * We load weights 300 (light for display) and 400/500 (body/label).
 * `display: 'swap'` prevents FOIT — text renders in fallback immediately,
 * swaps to DM Sans once loaded. Fallback is system-ui which looks fine.
 */
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-dm',
})

export const metadata: Metadata = {
  title: 'Slow Hour — Local Deals for Students',
  description:
    'Discover real-time, edge-personalized local deals near your campus. ' +
    'Ranked by urgency so you never miss a limited offer.',
  keywords: ['student deals', 'local discounts', 'campus offers', 'food deals'],
  openGraph: {
    title: 'Slow Hour',
    description: 'Edge-personalized local deals for students.',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-[family-name:var(--font-dm)] min-h-screen bg-[#FAFAF9] antialiased">
        {children}
        {/*
          Vercel Analytics — zero-config, privacy-first web analytics.
          Tracks page views and Core Web Vitals (LCP, CLS, FCP) automatically.
          Data surfaces in the Vercel dashboard under the Analytics tab.
          No cookies, no GDPR banner needed — data is aggregated, not personal.
          In a customer conversation: "You get CWV monitoring out of the box —
          no third-party script, no performance penalty, just add one component."
        */}
        <Analytics />
      </body>
    </html>
  )
}
