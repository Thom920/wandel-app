// POST /api/route — draait op Vercel én bij npm run dev (zelfde site als Nuxt)
// Lokaal met aparte API: zet NUXT_PUBLIC_API_BASE=http://localhost:3002

import { buildRouteResponse } from '../routeLogic.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const apiKey = process.env.OPENROUTESERVICE_API_KEY || ''

  try {
    const result = await buildRouteResponse(body, apiKey)
    setResponseStatus(event, result.status)
    return result.body
  } catch (err) {
    setResponseStatus(event, 500)
    return {
      ok: false,
      error: err.message || 'Route kon niet worden gemaakt.'
    }
  }
})
