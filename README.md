# Slow Hour

A real-time local deals app for students. You open it, it knows where you are, and it shows you what's ending soon nearby — coffee deals, happy hours, fitness classes, whatever's live right now.

---

## Why I built this

I kept noticing the same thing: local spots (especially coffee shops and small restaurants) have these dead hours in the afternoon where they're basically empty, and they don't have a good way to get the word out fast. At the same time, students are always looking for cheap things to do nearby and nobody has really built something for that specific moment — not "what's happening this weekend", but "what's happening in the next two hours near me."

The existing options don't really cut it:
- **Instagram** — only works if you already follow the business
- **Groupon** — not real-time, not location-sensitive
- **Eventbrite** — built for big planned events, not spontaneous stuff

Slow Hour is for the small, time-sensitive, right-now moment.

---

## What it does

- Detects your city automatically at the edge — no GPS prompt, no location permission
- Shows a live feed of deals ranked by how soon they expire, not how recently they were posted
- Countdown timers are live; when something expires it fades out and disappears
- Filter by category (food, drinks, events, fitness) or flip to "ending soon" to re-sort what's already visible
- Anyone can post a deal — it shows up in your feed immediately and is visible to others in the same city within 5 seconds

---

## How the rendering works

The `/discover` page runs on **Vercel Edge Runtime**. The moment a request comes in, the geo header is read, Hero and TopBar render and stream to the client right away. The deals grid is behind a `<Suspense>` boundary — it loads in parallel and streams in once ready, with a skeleton that matches the real layout exactly so there's no layout shift.

```
request → edge
  ↓
headers() + searchParams → resolved in parallel (Promise.all)
  ↓
Hero + TopBar → streamed immediately (first HTML chunk)
  ↓
<Suspense boundary>
  DealsGrid (async server) → awaits getDeals() + fetchWeather() in parallel
  ↓
DealsClient hydrates → starts 5s polling for shared deals
```

I looked at using PPR (Partial Prerendering) but it didn't make sense here — the hero headline includes the city name, so there's no meaningful static shell to cache. Every request is personalized from the start.

---

## Decisions worth explaining

**Why not GPS?**
Edge geo headers are instant and require zero user interaction. The `x-vercel-ip-city` value is already there on every request — no permission modal, no async wait.

**Why `useRef` for countdown timestamps?**
If I stored expiry timestamps in state, every time a filter changes and DealCards re-mount, the timers would reset back to the full duration. The ref map (`expiresAtMapRef`) persists across renders so cards always look up their existing timestamp on mount — countdown is always accurate.

**The `new Function` import trick for KV:**
Turbopack statically analyzes imports at build time and tries to bundle `@vercel/kv` as a server dependency, which breaks the edge build. Wrapping the import in `new Function('m', 'return import(m)')` makes it invisible to the static analyzer and deferred to runtime, where it loads only if the env vars exist.

**Client components are kept minimal:**
Hero is a pure server component — it's the LCP element and I didn't want any JS on the critical path. The only client boundary inside it is `AnimatedCity`, a tiny component that handles the crossfade when you switch cities.

**"Ending soon" is a virtual filter:**
It doesn't refetch — it just re-sorts the current visible set by time remaining. Felt more honest to the user than pretending it's a separate data category.

---

## Client boundary breakdown

| Component | Server or Client | Reason |
|---|---|---|
| `Hero` | server | LCP element — no JS on critical path |
| `AnimatedCity` | client | needs `useState` for city name crossfade |
| `TopBar` | client | scroll detection, live clock, weather fetch |
| `DealsGrid` | async server | data fetch + ranking happens server-side |
| `DealsClient` | client | filters, polling, optimistic updates, timers |
| `DealCard` | client | per-card countdown interval, copy to clipboard |

---

## Tech

- **Next.js 15** — App Router, Edge Runtime, React Streaming, Server Components
- **Vercel** — Edge geo headers, KV (Redis), Analytics
- **Tailwind CSS** — custom keyframes for blur-in, float, fade-up; design tokens as CSS variables
- **Vercel KV** with in-process memory fallback (two-tier storage)
- **Open-Meteo** for weather — free, no API key, CORS-enabled
- **DM Sans** via `next/font` with `display: swap`
- **Vitest** with `vi.useFakeTimers()` for countdown tests

---

## Project structure

```
app/
  page.tsx                  — static landing page
  discover/page.tsx         — edge runtime, geo detection, streaming boundary
  api/weather/route.ts      — separate route because TopBar is a client component
  api/shared-deals/route.ts — two-tier KV + memory storage, city-namespaced

components/
  Hero.tsx                  — server component, LCP element
  AnimatedCity.tsx          — minimal client boundary for city crossfade
  TopBar.tsx                — floating nav, city picker, live clock, weather
  DealsGrid.tsx             — async server component, parallel fetch
  DealsClient.tsx           — client hub: filters, polling, optimistic updates
  DealCard.tsx              — countdown timer, two layout variants
  LoadingSkeleton.tsx       — Suspense fallback, matches DealsClient layout exactly
  Filters.tsx               — tab bar with ARIA
  EmptyState.tsx            — different state for filtered vs. no deals at all
  UnsupportedCity.tsx       — shown when geo isn't in the supported list

lib/
  types.ts                  — domain types, SUPPORTED_CITIES as const literal union
  geo.ts                    — city detection + fuzzy normalization
  time.ts                   — countdown formatting, expiry math
  ranking.ts                — urgency sort + category filter logic
  weather.ts                — WMO code → readable description, Open-Meteo fetch
  deals.ts                  — mock deal data for 5 cities
```

---

## Running locally

```bash
npm install
npm run dev
```

```env
# both optional — falls back to in-memory if not set
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

Note: city detection from `x-vercel-ip-city` only works once deployed to Vercel. Locally it defaults to Houston.

---

## What I'd do next

Near-term:
- **Real deal data** — right now it's all mocks. Next step is an authenticated `/business` route (probably Clerk + Supabase) where businesses post deals; the KV + polling infrastructure is already there
- **Distance ranking** — `x-vercel-ip-latitude` and `x-vercel-ip-longitude` are already injected by Vercel on every edge request, I'm just not using them yet
- **Push notifications** — let users subscribe to a business or category and get alerted when something new is posted in their city

Longer-term:
- **More cities** — only one line to change in `lib/types.ts` and the rest of the app picks it up automatically
- **Campus-specific feeds** — verified student discounts, university partnerships
- **Native app** — the edge geo + streaming architecture would translate well to React Native + Expo

---

*Built with care & lots of caffeine by Neha Manoj*
