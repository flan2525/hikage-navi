export const landsatSurfaceTemperatureCelsius = (digitalNumber) => digitalNumber * 0.00341802 + 149 - 273.15
export const isLandsatQaValid = (digitalNumber, qaPixel) => digitalNumber !== 0 && (qaPixel & 0b111111) === 0
export const sentinelReflectance = (digitalNumber) => digitalNumber / 10000
export const isSentinelSclValid = (scl) => !new Set([0, 1, 3, 7, 8, 9, 10, 11]).has(scl)
export const ndviFromDigitalNumbers = (nirDigitalNumber, redDigitalNumber) => {
  const nir = sentinelReflectance(nirDigitalNumber)
  const red = sentinelReflectance(redDigitalNumber)
  const denominator = nir + red
  if (!Number.isFinite(denominator) || denominator === 0) return null
  return Math.max(-1, Math.min(1, (nir - red) / denominator))
}
