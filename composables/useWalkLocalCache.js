// Composable: lokale opslag + later sync naar Supabase

import {
  cacheRouteLocally,
  cacheWalkLocally,
  getPendingWalks,
  getUnusedCachedRoute,
  isBrowserOnline,
  isLocalCacheAvailable,
  markRouteUsedLocally,
  markWalkSynced
} from '~/utils/walkLocalCache.js'

export function useWalkLocalCache() {
  const { saveRoute, saveWalk, isConfigured: isSupabaseReady } = useWalkStorage()

  // Route op het apparaat zetten
  function rememberRoute(route) {
    const localId = cacheRouteLocally(route)
    if (localId && route) {
      route.localCacheId = localId
    }
    return localId
  }

  // Offline: laatste ongebruikte route voor deze duur
  function findOfflineRoute(minutes) {
    return getUnusedCachedRoute(minutes)
  }

  // Na afronden: route niet meer als verse offline-back-up aanbieden
  function markRouteFinished(localCacheId) {
    markRouteUsedLocally(localCacheId)
  }

  // Wandeling lokaal bewaren (altijd als back-up; nodig als cloud faalt)
  function rememberWalk(payload) {
    return cacheWalkLocally(payload)
  }

  // Stuur lokale wandelingen naar Supabase zodra internet weer werkt
  async function syncPendingWalksToCloud() {
    if (!isBrowserOnline() || !isSupabaseReady()) return { synced: 0 }

    const pending = getPendingWalks()
    let synced = 0

    for (const item of pending) {
      let routeId = item.supabaseRouteId

      // Geen cloud-route-id? Eerst route uploaden
      if (!routeId && item.route) {
        routeId = await saveRoute(item.route)
      }

      if (!routeId) continue

      const ok = await saveWalk({
        routeId,
        route: item.route,
        walkedMinutes: item.walkedMinutes,
        startedAt: item.startedAt
      })

      if (ok) {
        markWalkSynced(item.localId)
        synced += 1
      }
    }

    return { synced }
  }

  return {
    isLocalCacheAvailable,
    isBrowserOnline,
    rememberRoute,
    findOfflineRoute,
    markRouteFinished,
    rememberWalk,
    markWalkSynced,
    syncPendingWalksToCloud
  }
}
