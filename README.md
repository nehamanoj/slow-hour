# Slow Hour

A real-time local deals app to bridge students and small businesses. You open it, it knows where you are, and it shows you what's ending soon nearby — coffee deals, happy hours, fitness classes, whatever's live right now. Reviving local businesses & rebuilding community after COVID-19 - _Slow Hour_

---

## Inspiration

The relentless grip of COVID-19 sent shock through our global economy, leaving behind desperation. In the aftermath of the pandemic, the battle for survival was vital for small businesses as they desperately tried to stay afloat. The once buzzing tapestry of local businesses now bears the scars of widespread closures, affecting not just local communities but beyond.

A sharp decline in the number of active business owners hurts these small establishments as those individuals striving to make a living, face unprecedented challenges. Even today, the once lively buzz of local businesses remains subdued, with no resounding revival in sight even today.

According to a stark report from the NCBI, the period between February and April 2020 witnessed over 3.3 million businesses rendered inactive, marking a staggering 22 percent decline. This alarming plunge in active businesses stands as the largest ever recorded in the U.S., echoing a profound loss of business activity cutting across nearly all industries. And this has continued for the past 4-years (NCBI).

It’s vital for small businesses to endure and thrive as a matter of economic survival- to resonate as a testament to standing against adversity that echoes far beyond the confines of commerce. The journey to recovery is fraught with challenges, yet the heartbeat of local entrepreneurship perseveres, urging us all to stand united and rebuild what the pandemic sought to dismantle.

## Why I built this

There is a huge community of students, especially in college towns. Students are looking for things to do on weekends, and spend money on a day to day. Especially after COVID-19, they’re looking for ways to go out and about. We need to connect them to local businesses, that may have limited resources to market and advertise, looking to make business.

I kept noticing the same thing: local spots (especially coffee shops and small restaurants) have these dead hours in the afternoon where they're basically empty, and they don't have a good way to get the word out fast. At the same time, students are always looking for cheap things to do nearby and nobody has really built something for that specific moment — not "what's happening this weekend", but "what's happening in the next two hours near me."

The existing options don't really cut it:
- **Instagram** eans you have to discover the business.
- **Groupon** doesn’t allow time and proximity-based deals to pop up.
- **Eventbrite** doesn’t allow for deals/sales to be advertised and is not very lightweight.

Slow Hour is for the small, time-sensitive, right-now moment.

---

## What it does + Next.JS integrations

- Detects your city automatically at the edge — no GPS prompt, no location permission
- Shows a live feed of deals ranked by how soon they expire, not how recently they were posted
- Countdown timers are live; when something expires it fades out and disappears
- Filter by category (food, drinks, events, fitness) or flip to "ending soon" to re-sort what's already visible
- Anyone can post a deal — it shows up in your feed immediately and is visible to others in the same city within 5 seconds

---

## How the rendering works

The `/discover` page runs on **Vercel Edge Runtime**. The moment a request comes in, the geo header is read, Hero and TopBar render and stream to the client right away. The deals grid is behind a `<Suspense>` boundary — it loads in parallel and streams in once ready, with a skeleton that matches the real layout exactly so there's no layout shift.

I looked at using PPR (Partial Prerendering) but it didn't make sense here — the hero headline includes the city name, so there's no meaningful static shell to cache. Every request is personalized from the start.

---

## Decisions I Mapped

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

## Tech Stack for my FrontEnd Cloud

- **Next.js 15** — App Router, Edge Runtime, React Streaming, Server Components
- **Vercel** — Edge geo headers, KV (Redis), Analytics
- **Tailwind CSS** — custom keyframes for blur-in, float, fade-up; design tokens as CSS variables
- **Vercel KV** with in-process memory fallback (two-tier storage)
- **Open-Meteo** for weather — free, no API key, CORS-enabled
- **DM Sans** via `next/font` with `display: swap`
- **Vitest** with `vi.useFakeTimers()` for countdown tests

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

Note for locla run: city detection from `x-vercel-ip-city` only works once deployed to Vercel. Locally it defaults to Houston.

---

## Next Iterations: Beyond MVP

Near-term:
- **Real deal data** — right now it's all mocks. Next step is an authenticated `/business` route (probably Clerk + Supabase) where businesses post deals; the KV + polling infrastructure is already there
- **Distance ranking** — `x-vercel-ip-latitude` and `x-vercel-ip-longitude` are already injected by Vercel on every edge request, I'm just not using them yet due to scope clarity
- **Push notifications & Personalization** — let users subscribe to a business or category and get alerted when something new is posted in their city or newsletters & texts when deals ending

Longer-term:
- **More cities** — allow new cities to automatically be selected.
- **Campus-specific feeds** — verified student discounts, university partnerships
- **Native app** — the edge geo + streaming architecture would translate well to React Native + Expo

Current Notes:
- For this Iteration, I wanted to keep scope tight for clarity & structure purposes. Hence limit of few MVP cities to allow controlled development.

---

*Built with care & lots of caffeine by Neha Manoj*
