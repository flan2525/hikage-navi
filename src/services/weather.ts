import type { Weather } from '../types'
import { HIROSHIMA_CENTER } from '../data/hiroshima'
const endpoint = new URL('https://api.open-meteo.com/v1/forecast')
endpoint.search = new URLSearchParams({ latitude: String(HIROSHIMA_CENTER.lat), longitude: String(HIROSHIMA_CENTER.lng), timezone: 'Asia/Tokyo', forecast_days: '1', current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,shortwave_radiation', hourly: 'temperature_2m,apparent_temperature,shortwave_radiation' }).toString()
const value = (item: number | null | undefined) => typeof item === 'number' ? item : null
export async function fetchWeather(signal?: AbortSignal): Promise<Weather> {
  const response = await fetch(endpoint, { signal }); if (!response.ok) throw new Error('気象情報を取得できませんでした')
  const json = await response.json() as { current?: Record<string, number | string | null>; hourly?: { time?: string[]; temperature_2m?: Array<number | null>; apparent_temperature?: Array<number | null>; shortwave_radiation?: Array<number | null> } }
  const current = json.current ?? {}; const hourly = json.hourly ?? {}
  return { temperature: value(current.temperature_2m as number), apparentTemperature: value(current.apparent_temperature as number), humidity: value(current.relative_humidity_2m as number), windSpeed: value(current.wind_speed_10m as number), radiation: value(current.shortwave_radiation as number), observedAt: typeof current.time === 'string' ? current.time : null, hourly: (hourly.time ?? []).slice(0, 8).map((time, index) => ({ time, temperature: value(hourly.temperature_2m?.[index]), apparentTemperature: value(hourly.apparent_temperature?.[index]), radiation: value(hourly.shortwave_radiation?.[index]) })) }
}
