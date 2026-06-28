// Utilidades de geolocalización.

export interface Coords {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6371000; // radio de la Tierra en metros

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distancia en metros entre dos puntos lat/lon usando la fórmula de haversine.
 * Es la distancia "en línea recta" sobre la superficie del planeta (no por calles).
 * Suficiente para ordenar comercios por cercanía.
 */
export function distanceInMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Formatea una distancia en metros a un texto legible en español de Argentina.
 * Ej: 350 -> "350 m", 1234 -> "1,2 km", 15000 -> "15 km".
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    // un decimal, con coma como separador (es-AR)
    return `${km.toFixed(1).replace('.', ',')} km`;
  }
  return `${Math.round(km)} km`;
}
