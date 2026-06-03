// Verwerkt POST /api/route — aparte Node-server (npm run dev:api, lokaal poort 3002)

import { buildRouteResponse } from './routeLogic.js'
import { readJsonBody, sendJson } from './httpHelpers.js'

export async function handleRouteRequest(req, res, config, corsHeaders) {
  try {
    const body = await readJsonBody(req)
    const result = await buildRouteResponse(body, config.openRouteServiceKey)
    sendJson(res, result.status, result.body, corsHeaders)
  } catch (err) {
    sendJson(
      res,
      500,
      { ok: false, error: err.message || 'Route kon niet worden gemaakt.' },
      corsHeaders
    )
  }
}
