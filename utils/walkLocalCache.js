// Opslag op je telefoon/computer (localStorage) — werkt zonder internet
// Geen kaart-tegels hier; alleen route-punten en wandelgeschiedenis

const STORAGE_KEY = 'wandelapp_lokale_data'
const MAX_ROUTES = 5 // niet te veel data in de browser

// Lees alles wat we lokaal hebben opgeslagen
function readStore() {
  if (typeof localStorage === 'undefined') {
    return { routes: [], pendingWalks: [] }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { routes: [], pendingWalks: [] }
    const parsed = JSON.parse(raw)
    return {
      routes: Array.isArray(parsed.routes) ? parsed.routes : [],
      pendingWalks: Array.isArray(parsed.pendingWalks) ? parsed.pendingWalks : []
    }
  } catch {
    return { routes: [], pendingWalks: [] }
  }
}

// Alles wegschrijven naar localStorage
function writeStore(store) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

// Uniek lokaal id (simpele tijdstempel + random stukje)
function makeLocalId() {
  return `lokaal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Werkt localStorage in deze browser?
export function isLocalCacheAvailable() {
  return typeof localStorage !== 'undefined'
}

// Route bewaren na succes van de API (of kopie voor offline)
export function cacheRouteLocally(route) {
  if (!isLocalCacheAvailable() || !route?.coordinates?.length) return null

  const store = readStore()
  const localId = makeLocalId()

  const entry = {
    localId,
    chosenMinutes: route.chosenMinutes,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    coordinates: route.coordinates,
    startLat: route.startLat,
    startLng: route.startLng,
    startInstruction: route.startInstruction,
    savedAt: new Date().toISOString(),
    used: false
  }

  store.routes.unshift(entry)

  // Oude routes weggooien als er te veel zijn
  if (store.routes.length > MAX_ROUTES) {
    store.routes = store.routes.slice(0, MAX_ROUTES)
  }

  writeStore(store)
  return localId
}

// Markeer route als "al gelopen" zodat we die niet opnieuw als offline-back-up tonen
export function markRouteUsedLocally(localId) {
  if (!localId || !isLocalCacheAvailable()) return

  const store = readStore()
  const item = store.routes.find((r) => r.localId === localId)
  if (item) item.used = true
  writeStore(store)
}

// Zoek een route die nog niet gebruikt is, voor de gekozen duur (15/20/25/30)
export function getUnusedCachedRoute(chosenMinutes) {
  const store = readStore()
  const match = store.routes.find(
    (r) => r.used === false && r.chosenMinutes === chosenMinutes
  )
  if (!match) return null

  return {
    chosenMinutes: match.chosenMinutes,
    distanceKm: match.distanceKm,
    durationMinutes: match.durationMinutes,
    coordinates: match.coordinates,
    startLat: match.startLat,
    startLng: match.startLng,
    startInstruction: match.startInstruction,
    localCacheId: match.localId
  }
}

// Wandeling lokaal bewaren als Supabase even niet bereikbaar is
export function cacheWalkLocally({
  route,
  walkedMinutes,
  startedAt,
  finishedAt,
  supabaseRouteId
}) {
  if (!isLocalCacheAvailable() || !route) return

  const store = readStore()

  const localId = makeLocalId()

  store.pendingWalks.push({
    localId,
    chosenMinutes: route.chosenMinutes,
    walkedMinutes,
    startedAt,
    finishedAt: finishedAt || new Date().toISOString(),
    route,
    supabaseRouteId: supabaseRouteId || null,
    synced: false
  })

  writeStore(store)
  return localId
}

// Lijst met wandelingen die nog naar Supabase moeten
export function getPendingWalks() {
  return readStore().pendingWalks.filter((w) => !w.synced)
}

// Markeer één wandeling als gesynchroniseerd
export function markWalkSynced(localId) {
  if (!localId) return

  const store = readStore()
  const item = store.pendingWalks.find((w) => w.localId === localId)
  if (item) item.synced = true
  writeStore(store)
}

// Heeft de browser internet? (niet 100% betrouwbaar, maar handig)
export function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}
