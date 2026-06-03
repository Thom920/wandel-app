// Startpunt van de Node API — ontvangt verzoeken van de Nuxt-app

import http from 'http'
import { getConfig } from './config.js'
import { sendJson, setCorsHeaders } from './httpHelpers.js'
import { handleRouteRequest } from './routeApi.js'

// Haal alleen het pad uit de URL (zonder ?query en zonder trailing slash)
function getPathname(req) {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

// Wordt aangeroepen bij elk HTTP-verzoek
async function handleRequest(req, res) {
  const origin = req.headers.origin || ''
  const corsHeaders = setCorsHeaders(res, origin)
  const path = getPathname(req)

  // Browser stuurt eerst OPTIONS vóór een POST (CORS-check)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  // Startpagina van de API — geen HTML, alleen uitleg in JSON
  if (req.method === 'GET' && path === '/') {
    sendJson(
      res,
      200,
      {
        ok: true,
        service: 'wandel-api',
        hint: 'Gebruik /health om te testen. De app gebruikt POST /api/route.'
      },
      corsHeaders
    )
    return
  }

  // Test: is de API-server aan?
  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, { ok: true, service: 'wandel-api' }, corsHeaders)
    return
  }

  // Route berekenen: GPS + minuten → rondwandeling via OpenRouteService
  if (req.method === 'POST' && path === '/api/route') {
    await handleRouteRequest(req, res, config, corsHeaders)
    return
  }

  sendJson(res, 404, { ok: false, error: 'Niet gevonden' }, corsHeaders)
}

const config = getConfig()
const server = http.createServer((req, res) => {
  handleRequest(req, res)
})

server.listen(config.port, () => {
  console.log(`API ready at http://localhost:${config.port}`)
  console.log(`Health: http://localhost:${config.port}/health`)
  console.log(`Route:  POST http://localhost:${config.port}/api/route`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Poort ${config.port} is al in gebruik.`)
    console.error('Stop het andere proces of zet PORT=3003 in .env (hoofdletters).')
    process.exit(1)
  }
  throw err
})
