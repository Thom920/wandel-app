// Bepaalt waar de app de route-API aanroept (lokaal vs Vercel)

// Op Vercel nooit localhost uit een per ongeluk geïmporteerde .env
function isLocalhostUrl(url) {
  if (!url) return false
  return url.includes('localhost') || url.includes('127.0.0.1')
}

// Bouw het volledige adres voor POST /api/route
export function getRouteApiUrl(configApiBase) {
  let base = (configApiBase || '').trim().replace(/\/$/, '')

  // In de browser: live site → altijd eigen domein, niet poort 3002 op je pc
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const onLiveSite = host !== 'localhost' && host !== '127.0.0.1'

    if (onLiveSite && isLocalhostUrl(base)) {
      base = ''
    }
  }

  // Leeg = zelfde website (Vercel: https://jouw-app.vercel.app/api/route)
  if (!base) {
    return '/api/route'
  }

  return `${base}/api/route`
}

// Voor nuxt.config bij build op Vercel
export function resolveApiBaseForBuild() {
  const fromEnv = (process.env.NUXT_PUBLIC_API_BASE || '').trim()

  if (process.env.VERCEL) {
    if (!fromEnv || isLocalhostUrl(fromEnv)) {
      return ''
    }
    return fromEnv.replace(/\/$/, '')
  }

  return fromEnv || 'http://localhost:3002'
}
