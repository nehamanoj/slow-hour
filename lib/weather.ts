import type { WeatherData, SupportedCity } from './types'
import { CITY_COORDS } from './geo'

/**
 * Interpret WMO weather code into a human-readable condition.
 * Full code table: https://open-meteo.com/en/docs#weathervariables
 *
 * We map to 7 conditions — enough nuance for messaging, simple enough to
 * maintain. Adding more conditions would have diminishing UX returns.
 */
function interpretWeatherCode(code: number): { condition: string; icon: string } {
  if (code === 0)        return { condition: 'Clear',         icon: '☀️' }
  if (code <= 3)         return { condition: 'Partly Cloudy', icon: '⛅' }
  if (code <= 48)        return { condition: 'Foggy',         icon: '🌫️' }
  if (code <= 67)        return { condition: 'Rainy',         icon: '🌧️' }
  if (code <= 77)        return { condition: 'Snowy',         icon: '❄️' }
  if (code <= 82)        return { condition: 'Showery',       icon: '🌦️' }
  return                        { condition: 'Stormy',        icon: '⛈️' }
}

/**
 * Weather-aware deal discovery messages.
 * The idea: if it's raining, lean into "perfect excuse to grab a deal inside".
 * If it's sunny, lean into "get out and explore".
 * Small personalization detail that makes the app feel alive.
 */
function getWeatherMessage(condition: string): string {
  const messages: Record<string, string> = {
    Clear:          '☀️ Great day to get out and explore',
    'Partly Cloudy':'⛅ Nice enough to check out a deal',
    Foggy:          '🌫️ Cozy day for a café or study spot',
    Rainy:          '🌧️ Perfect excuse to grab a deal indoors',
    Snowy:          '❄️ Warm up with a local deal nearby',
    Showery:        '🌦️ Between showers — grab something good',
    Stormy:         '⛈️ Storm day calls for a study deal',
  }
  return messages[condition] ?? '🏙️ Deals waiting nearby'
}

/**
 * Fetch real-time weather for a city using Open-Meteo.
 *
 * Why Open-Meteo?
 * → Completely free, no API key required, CORS-enabled.
 *   Perfect for a demo that shouldn't require env var setup.
 *   In production, we'd use a paid service (Tomorrow.io, OpenWeather) for
 *   SLA guarantees and finer granularity.
 *
 * Caching strategy: revalidate every 10 minutes.
 * Weather is contextual enhancement, not mission-critical data.
 * Stale weather data is acceptable; stale deal data is not.
 */
export async function fetchWeather(city: SupportedCity): Promise<WeatherData> {
  const coords = CITY_COORDS[city]

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&current=temperature_2m,weather_code` +
      `&temperature_unit=fahrenheit` +
      `&timezone=auto`

    const res = await fetch(url, {
      // Next.js extended fetch: cache weather for 10 minutes server-side.
      // This means the first request in a 10-min window hits Open-Meteo;
      // all subsequent requests within that window use the cached response.
      next: { revalidate: 600 },
    })

    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

    const data = await res.json()
    const code: number = data.current.weather_code
    const temp: number = Math.round(data.current.temperature_2m)
    const { condition, icon } = interpretWeatherCode(code)

    return { condition, icon, temp, message: getWeatherMessage(condition) }
  } catch {
    // Graceful degradation: weather is enhancement, not core functionality.
    // The app remains fully functional with a sensible default.
    return {
      condition: 'Clear',
      icon: '☀️',
      temp: 72,
      message: '🏙️ Deals waiting nearby',
    }
  }
}
