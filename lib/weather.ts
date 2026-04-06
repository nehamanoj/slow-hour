import type { WeatherData, SupportedCity } from './types'
import { CITY_COORDS } from './geo'

// maps wmo weather codes to human-readable conditions.
// full code table: https://open-meteo.com/en/docs#weathervariables
// 7 conditions is enough nuance for the messages without being annoying to maintain.
function interpretWeatherCode(code: number): { condition: string; icon: string } {
  if (code === 0)        return { condition: 'Clear',         icon: '☀️' }
  if (code <= 3)         return { condition: 'Partly Cloudy', icon: '⛅' }
  if (code <= 48)        return { condition: 'Foggy',         icon: '🌫️' }
  if (code <= 67)        return { condition: 'Rainy',         icon: '🌧️' }
  if (code <= 77)        return { condition: 'Snowy',         icon: '❄️' }
  if (code <= 82)        return { condition: 'Showery',       icon: '🌦️' }
  return                        { condition: 'Stormy',        icon: '⛈️' }
}

// small contextual message based on weather — rainy → lean into "grab a deal indoors",
// sunny → "get out and explore". makes the app feel alive without adding complexity.
function getWeatherMessage(condition: string): string {
  const messages: Record<string, string> = {
    Clear:          '☀️ Sun is out, so should you. Great day to get out and explore',
    'Partly Cloudy':'⛅ Cloudy, but perfect to check out a deal', //'Partly Cloudy' is in brackets because there is a space in the string. needs more specification.
    Foggy:          '🌫️ Foggy days are cozy days for a warm café or study spot',
    Rainy:          '🌧️ Rainy - perfect excuse to grab a deal indoors',
    Snowy:          '❄️ Ooh Snowy and chilly - warm up with a local deal nearby',
    Showery:        '🌦️ Sprinkles of rain means between showers — grab something good',
    Stormy:         '⛈️ Storm day calls for a study deal',
  }
  return messages[condition] ?? '🏙️ Deals waiting nearby'
}

// fetch real-time weather via open-meteo — free, no api key, cors-enabled.
// perfect for a demo. in production we'd use tomorrow.io or openweather for sla guarantees.
//
// revalidate every 10 minutes — weather is contextual enhancement, not
// mission-critical data. stale weather is fine; stale deal data is not.
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
      // next.js extended fetch: cache weather server-side for 10 minutes
      next: { revalidate: 600 },
    })

    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

    const data = await res.json()
    const code: number = data.current.weather_code
    const temp: number = Math.round(data.current.temperature_2m)
    const { condition, icon } = interpretWeatherCode(code)

    return { condition, icon, temp, message: getWeatherMessage(condition) }
  } catch {
    // graceful degradation — app is fully functional without weather
    return {
      condition: 'Clear',
      icon: '☀️',
      temp: 72,
      message: '🏙️ Deals waiting nearby',
    }
  }
}
