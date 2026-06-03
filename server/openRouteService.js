// Praat met OpenRouteService om een rondwandeling te laten berekenen

const ORS_URL =
  'https://api.openrouteservice.org/v2/directions/foot-walking/geojson'

// Gemiddeld wandeltempo (km/u) om minuten om te zetten naar meters
const WALK_SPEED_KM_PER_HOUR = 5

// Meer pogingen voor langere wandelingen (ORS wijkt dan meer af)
const MAX_ATTEMPTS = 5

// Zet minuten om naar geschatte loopafstand in meters (hele rondwandeling)
export function minutesToMeters(minutes) {
  const km = (minutes / 60) * WALK_SPEED_KM_PER_HOUR
  return Math.round(km * 1000)
}

// Hoeveel minuten verschil is nog acceptabel (iets ruimer bij 25 en 30 min)
function toleranceFor(minutes) {
  if (minutes >= 30) return 3
  if (minutes >= 20) return 2
  return 2
}

// Startlengte: bij langere wandelingen beginnen we iets hoger (ORS maakt vaak te korte lussen)
function initialTargetMeters(minutes) {
  const base = minutesToMeters(minutes)

  if (minutes >= 30) return Math.round(base * 1.6)
  if (minutes >= 25) return Math.round(base * 1.45)
  if (minutes >= 20) return Math.round(base * 1.3)

  return base
}

// Pas de gevraagde lengte aan op basis van de vorige route
function adjustTargetMeters(targetMeters, chosenMinutes, durationSeconds) {
  if (durationSeconds <= 0) return targetMeters

  const wantedSeconds = chosenMinutes * 60
  let ratio = wantedSeconds / durationSeconds

  // Niet te wild schalen in één stap (voorkomt 30 min → plots 15 min)
  ratio = Math.min(2.2, Math.max(0.5, ratio))

  if (durationSeconds < wantedSeconds) {
    // Route was te kort → vraag volgende keer een langere lus
    return Math.round(targetMeters * ratio * 1.1)
  }

  // Route was te lang → vraag een kortere lus
  return Math.round(targetMeters * ratio * 0.9)
}

// Eén verzoek naar OpenRouteService met een bepaalde lengte in meters
async function fetchRoundWalkRouteOnce({ lat, lng, targetMeters, apiKey, seed }) {
  const body = {
    coordinates: [[lng, lat]],
    options: {
      round_trip: {
        length: targetMeters,
        points: 5,
        seed
      }
    }
  }

  const response = await fetch(ORS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify(body)
  })

  const data = await response.json()

  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || 'OpenRouteService gaf een fout.'
    throw new Error(message)
  }

  const feature = data.features?.[0]
  const coordinates = feature?.geometry?.coordinates || []

  if (coordinates.length === 0) {
    throw new Error('Geen route teruggekregen van OpenRouteService.')
  }

  const summary = feature?.properties?.summary || {}
  const distanceMeters = Math.round(summary.distance || targetMeters)
  const durationSeconds = Math.round(summary.duration || 0)

  return {
    targetMeters,
    distanceMeters,
    durationSeconds,
    coordinates
  }
}

// Kies de route die het dichtst bij de gekozen minuten ligt
function pickBestRoute(routes, chosenMinutes) {
  let best = routes[0]
  let bestDiff = Math.abs(best.durationSeconds / 60 - chosenMinutes)

  for (const route of routes) {
    const diff = Math.abs(route.durationSeconds / 60 - chosenMinutes)
    if (diff < bestDiff) {
      bestDiff = diff
      best = route
    }
  }

  return best
}

// Probeert een route te maken die ongeveer past bij de gekozen minuten
export async function fetchRoundWalkRoute({ lat, lng, minutes, apiKey }) {
  let targetMeters = initialTargetMeters(minutes)
  const triedRoutes = []
  const tolerance = toleranceFor(minutes)
  const seed = Math.floor(Math.random() * 1000)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const route = await fetchRoundWalkRouteOnce({
      lat,
      lng,
      targetMeters,
      apiKey,
      seed: seed + attempt
    })

    triedRoutes.push(route)

    const actualMinutes = route.durationSeconds / 60
    const difference = Math.abs(actualMinutes - minutes)

    // Perfect genoeg? Stop, maar we gebruiken nog steeds de beste poging tot nu toe
    if (difference <= tolerance) {
      break
    }

    targetMeters = adjustTargetMeters(targetMeters, minutes, route.durationSeconds)
    targetMeters = Math.max(600, Math.min(targetMeters, 18000))
  }

  const bestRoute = pickBestRoute(triedRoutes, minutes)

  return {
    minutes,
    targetMeters: bestRoute.targetMeters,
    distanceMeters: bestRoute.distanceMeters,
    durationSeconds: bestRoute.durationSeconds,
    coordinates: bestRoute.coordinates
  }
}
