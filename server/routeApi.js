// Verwerkt POST /api/route — ontvangt locatie + minuten, stuurt route terug

import { fetchRoundWalkRoute } from './openRouteService.js'
import { readJsonBody, sendJson } from './httpHelpers.js'

const allowedMinutes = [15, 20, 25, 30]

// Controleer of lat/lng echte getallen zijn binnen geldige grenzen
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

// Hoofdfunctie voor het route-endpoint
export async function handleRouteRequest(req, res, config, corsHeaders) {
  try {
    const body = await readJsonBody(req)
    const minutes = Number(body.minutes)
    const location = parseLocation(body.lat, body.lng)

    if (location.error) {
      sendJson(res, 400, { ok: false, error: location.error }, corsHeaders)
      return
    }

    if (!allowedMinutes.includes(minutes)) {
      sendJson(
        res,
        400,
        { ok: false, error: 'Kies een duur van 15, 20, 25 of 30 minuten.' },
        corsHeaders
      )
      return
    }

    if (!config.openRouteServiceKey) {
      sendJson(
        res,
        503,
        {
          ok: false,
          error:
            'OPENROUTESERVICE_API_KEY ontbreekt in .env. Maak een gratis key op openrouteservice.org.'
        },
        corsHeaders
      )
      return
    }

    const route = await fetchRoundWalkRoute({
      lat: location.latitude,
      lng: location.longitude,
      minutes,
      apiKey: config.openRouteServiceKey
    })

    const durationMinutes = Math.round(route.durationSeconds / 60)
    const difference = Math.abs(durationMinutes - minutes)
    const closeEnough = difference <= (minutes >= 30 ? 3 : 2)

    // Boodschap: altijd je keuze noemen + geschatte looptijd van deze route
    let message = `Je koos ${minutes} minuten. Deze route duurt ongeveer ${durationMinutes} minuten.`
    if (closeEnough) {
      message = `Je route is klaar — ongeveer ${durationMinutes} minuten, past bij je keuze.`
    }

    sendJson(
      res,
      200,
      {
        ok: true,
        message,
        chosenMinutes: minutes,
        distanceKm: Number((route.distanceMeters / 1000).toFixed(2)),
        durationMinutes,
        coordinates: route.coordinates
      },
      corsHeaders
    )
  } catch (err) {
    sendJson(
      res,
      500,
      {
        ok: false,
        error: err.message || 'Route kon niet worden gemaakt.'
      },
      corsHeaders
    )
  }
}
