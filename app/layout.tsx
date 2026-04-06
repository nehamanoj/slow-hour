import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// using dm sans — clean geometric feel without being too corporate.
// slightly rounded terminals read as friendly. works well at both display
// (light/300) and body (regular/400-500) weights.
//
// display: 'swap' prevents FOIT — text renders in system-ui immediately,
// swaps to dm sans once loaded. fallback looks fine.
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
          vercel analytics — zero-config, privacy-first web analytics.
          tracks page views and core web vitals (LCP, CLS, FCP) automatically.
          no cookies, no gdpr banner needed — data is aggregated, not personal.
          in a customer convo: "you get CWV monitoring out of the box —
          no third-party script, no performance penalty, just one component."
        */}
        <Analytics />
      </body>
    </html>
  )
}
