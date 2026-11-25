/** Return the AQI category and plain-language health guidance. */
export function category(aqi) {
  if (aqi === null || aqi === undefined || (typeof aqi === 'string' && aqi.trim() === '')) {
    return ['Unavailable', 'Air-quality reading is unavailable.'];
  }
  const value = Number(aqi);
  if (!Number.isFinite(value) || value < 0) return ['Unavailable', 'Air-quality reading is unavailable.'];
  if (value <= 50) return ['Good', 'Air quality is good. Enjoy your usual outdoor activities.'];
  if (value <= 100) return ['Moderate', 'Air quality is acceptable for most people. Sensitive groups may want to take it a little easier outdoors.'];
  if (value <= 150) return ['Unhealthy for sensitive groups', 'Sensitive groups should reduce prolonged outdoor exertion.'];
  if (value <= 200) return ['Unhealthy', 'Consider moving exercise indoors and limiting time near busy roads.'];
  if (value <= 300) return ['Very unhealthy', 'Reduce outdoor exposure and keep activity light indoors.'];
  return ['Hazardous', 'Stay indoors when possible and follow local health guidance.'];
}
