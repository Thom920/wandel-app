// Dit is het startpunt van je Node.js API (backend).
// De frontend (Nuxt) draait apart; later praten ze met elkaar via HTTP.

import http from 'http'
import { getConfig } from './config.js'

// Stuur data terug als JSON (zoals {"ok": true})
// res = het antwoord dat naar de browser of app gaat
function sendJson(res, statusCode, body) {
  // statusCode 200 = ok, 404 = niet gevonden
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  // body is een JavaScript-object; JSON.stringify maakt er een tekststring van
  res.end(JSON.stringify(body))
}

// Wordt aangeroepen bij elk request (elke URL die iemand opent)
// req = het verzoek (welke URL, GET of POST, enz.)
// res = het antwoord dat we terugsturen
function handleRequest(req, res) {
  // Health check: simpele test of de server leeft
  // Open in browser: http://localhost:3003/health (poort uit jouw .env)
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'wandel-api'
    })
    return
  }

  // Alle andere URL's: nog geen route (komt in stap 4+)
  sendJson(res, 404, { error: 'Not found' })
}

// Haal poort en keys op uit .env via config.js
const config = getConfig()

// Maak de HTTP-server aan en koppel handleRequest
const server = http.createServer(handleRequest)

// Start luisteren op de poort (server blijft aan tot je Ctrl+C drukt)
server.listen(config.port, () => {
  console.log(`API ready at http://localhost:${config.port}`)
  console.log(`Health check: http://localhost:${config.port}/health`)
})

// Als de poort al bezet is (andere npm run dev:api nog draait)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Poort ${config.port} is al in gebruik.`)
    console.error('Stop het andere proces (taskkill) of zet PORT=3003 in .env (hoofdletters PORT).')
    process.exit(1)
  }
  throw err
})
