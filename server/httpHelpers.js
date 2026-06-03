// Kleine hulpfuncties voor de HTTP-server (hergebruikt in index.js)

// Stuur een JSON-antwoord naar de browser
export function sendJson(res, statusCode, body, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...extraHeaders
  })
  res.end(JSON.stringify(body))
}

// CORS = browser mag Nuxt (poort 3000) praten met API (poort 3003)
export function setCorsHeaders(res, origin) {
  const allowed =
    origin &&
    (origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:'))

  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

// Lees de body van een POST-verzoek (komt binnen als stukjes tekst)
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''

    req.on('data', (chunk) => {
      raw += chunk
    })

    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Ongeldige JSON in het verzoek.'))
      }
    })

    req.on('error', reject)
  })
}
