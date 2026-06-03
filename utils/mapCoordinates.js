// Omzetten van route-punten voor Leaflet (kaart gebruikt [lat, lng], API geeft [lng, lat])

export function routeToLatLngList(coordinates) {
  if (!Array.isArray(coordinates)) return []
  return coordinates
    .filter((p) => Array.isArray(p) && p.length >= 2)
    .map(([lng, lat]) => [lat, lng])
}
