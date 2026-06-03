// Gedeelde logica voor route berekenen — gebruikt door Node API én Vercel (Nitro)

import { fetchRoundWalkRoute } from './openRouteService.js'

const allowedMinutes = [15, 20, 25, 30]

// Controleer of lat/lng kloppen
function parseLocation(lat, lng) {
  const latitude = Number(lat)
  const longitude = Number(lng)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: 'Locatie is ongeldig. Geef geldige lat en lng door.' }
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: 'Locatie valt buiten het kaartgebied.' }
  }

  return { latitude, longitude }
}

// Hoofdfunctie: body { lat, lng, minutes } → JSON-antwoord voor de app
export async function buildRouteResponse(body, apiKey) {
  const minutes = Number(body?.minutes)
  const location = parseLocation(body?.lat, body?.lng)

  if (location.error) {
    return { status: 400, body: { ok: false, error: location.error } }
  }

  if (!allowedMinutes.includes(minutes)) {
    return {
      status: 400,
      body: { ok: false, error: 'Kies een duur van 15, 20, 25 of 30 minuten.' }
    }
  }

  if (!apiKey) {
    return {
      status: 503,
      body: {
        ok: false,
        error:
          'OPENROUTESERVICE_API_KEY ontbreekt. Zet die in .env of Vercel Environment Variables.'
      }
    }
  }

  const route = await fetchRoundWalkRoute({
    lat: location.latitude,
    lng: location.longitude,
    minutes,
    apiKey
  })

  const durationMinutes = Math.round(route.durationSeconds / 60)
  const difference = Math.abs(durationMinutes - minutes)
  const closeEnough = difference <= (minutes >= 30 ? 3 : 2)

  let message = `Je koos ${minutes} minuten. Deze route duurt ongeveer ${durationMinutes} minuten.`
  if (closeEnough) {
    message = `Je route is klaar — ongeveer ${durationMinutes} minuten, past bij je keuze.`
  }

  return {
    status: 200,
    body: {
      ok: true,
      message,
      chosenMinutes: minutes,
      distanceKm: Number((route.distanceMeters / 1000).toFixed(2)),
      durationMinutes,
      coordinates: route.coordinates
    }
  }
}
