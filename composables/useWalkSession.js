// Beheert de wandeling: route bewaren, starten, aanwijzingen, afronden
// Werkt samen met lokale opslag (stap 9) en Supabase (stap 7/8)

import {
  buildTurnSteps,
  distanceMeters,
  getStartInstruction
} from '~/utils/routeTurns.js'
import { playStartNudge, playTurnNudge } from '~/utils/hapticNudge.js'

export function useWalkSession() {
  const { saveRoute, saveWalk, isConfigured: isStorageConfigured } = useWalkStorage()
  const {
    rememberRoute,
    markRouteFinished,
    rememberWalk,
    markWalkSynced,
    syncPendingWalksToCloud
  } = useWalkLocalCache()

  const { beginWalkTracking, endWalkTracking, nudgeDistanceMeters } =
    useWalkBackground()

  // In welk scherm zitten we?
  // pick = duur kiezen, ready = route klaar, walking = bezig, done = klaar
  const phase = ref('pick')

  // Route-data van de API (geheugen + optioneel id in Supabase)
  const savedRoute = ref(null)

  // Afslagpunten en welke afslag nu aan de beurt is
  const turnSteps = ref([])
  const turnIndex = ref(0)

  // Grote tekst tijdens het lopen
  const walkInstruction = ref('')

  // Hoeveel minuten gewandeld (bij afronden)
  const walkedMinutes = ref(0)

  // Waar je nu bent (voor kaart tijdens wandelen) — null als we geen GPS hebben
  const currentPosition = ref(null)

  let locationWatchId = null
  let walkStartedAt = null
  let hasLeftStartArea = false // voorkomt direct "klaar" terwijl je nog bij start staat

  // Route opslaan na API-antwoord en scherm "klaar" tonen
  async function setRouteFromApi(data) {
    const coordinates = data.coordinates || []
    const [startLng, startLat] = coordinates[0] || [0, 0]

    savedRoute.value = {
      chosenMinutes: data.chosenMinutes,
      distanceKm: data.distanceKm,
      durationMinutes: data.durationMinutes,
      coordinates,
      startLat,
      startLng,
      startInstruction: getStartInstruction(coordinates),
      supabaseRouteId: null,
      localCacheId: data.localCacheId || null,
      fromOfflineCache: Boolean(data.fromOfflineCache)
    }

    turnSteps.value = buildTurnSteps(coordinates)
    turnIndex.value = 0
    phase.value = 'ready'

    // Op je telefoon/computer bewaren (werkt ook zonder internet tijdens het lopen)
    rememberRoute(savedRoute.value)

    // Supabase: route bewaren op de achtergrond (wandelen werkt ook als dit mislukt)
    if (isStorageConfigured()) {
      const routeId = await saveRoute(savedRoute.value)
      if (routeId) {
        savedRoute.value.supabaseRouteId = routeId
      }
    }
  }

  // Wordt steeds aangeroepen als je GPS-positie verandert tijdens het lopen
  function onPositionUpdate(position) {
    if (!savedRoute.value || phase.value !== 'walking') return

    const userLat = position.coords.latitude
    const userLng = position.coords.longitude
    currentPosition.value = { lat: userLat, lng: userLng }
    const route = savedRoute.value

    const metersFromStart = distanceMeters(
      userLat,
      userLng,
      route.startLat,
      route.startLng
    )

    // Eerst even weg van start (minstens ~100 meter), anders denkt de app dat je al klaar bent
    if (metersFromStart > 100) {
      hasLeftStartArea = true
    }

    // Terug bij start na een rondje? Dan afronden
    if (hasLeftStartArea && metersFromStart < 45) {
      finishWalk()
      return
    }

    const step = turnSteps.value[turnIndex.value]
    if (!step) {
      walkInstruction.value = 'Blijf de route volgen. Je bent bijna terug.'
      return
    }

    const metersToTurn = distanceMeters(userLat, userLng, step.lat, step.lng)

    // Dicht bij een afslag? Tekst + trilpatroon (links/rechts/rechtdoor)
    if (metersToTurn < nudgeDistanceMeters) {
      walkInstruction.value = step.instruction
      playTurnNudge(step.turnKind || 'straight')
      turnIndex.value += 1
      return
    }

    walkInstruction.value = 'Blijf lopen. De volgende aanwijzing komt zo.'
  }

  // Start het volgen van je locatie (GPS in de achtergrond)
  function startWalk() {
    if (!savedRoute.value) return

    if (!navigator.geolocation) {
      walkInstruction.value = 'Locatie werkt niet in deze browser.'
      return
    }

    phase.value = 'walking'
    turnIndex.value = 0
    walkStartedAt = Date.now()
    hasLeftStartArea = false
    currentPosition.value = null
    walkInstruction.value = savedRoute.value.startInstruction

    // Trilling bij start + GPS blijft luisteren als scherm uit of tab op achtergrond
    playStartNudge()
    beginWalkTracking()

    locationWatchId = navigator.geolocation.watchPosition(
      onPositionUpdate,
      () => {
        walkInstruction.value =
          'Locatie even kwijt. Blijf lopen of controleer je GPS-instellingen.'
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
  }

  // Stop GPS-volgen (belangrijk als je de pagina verlaat)
  function stopLocationWatch() {
    endWalkTracking()

    if (locationWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchId)
      locationWatchId = null
    }
  }

  // Wandeling netjes afsluiten
  async function finishWalk() {
    stopLocationWatch()

    const startedAt = walkStartedAt

    if (walkStartedAt) {
      walkedMinutes.value = Math.max(
        1,
        Math.round((Date.now() - walkStartedAt) / 60000)
      )
    }

    phase.value = 'done'
    walkInstruction.value = ''

    const route = savedRoute.value
    const finishedAt = new Date().toISOString()

    if (route?.localCacheId) {
      markRouteFinished(route.localCacheId)
    }

    // Lokaal bewaren (back-up; bij succesvolle cloud meteen als "klaar" gemarkeerd)
    let pendingWalkId = null
    if (route && startedAt && walkedMinutes.value > 0) {
      pendingWalkId = rememberWalk({
        route,
        walkedMinutes: walkedMinutes.value,
        startedAt,
        finishedAt,
        supabaseRouteId: route.supabaseRouteId || null
      })
    }

    // Supabase: direct opslaan als we een route-id hebben
    let cloudSaved = false
    if (
      isStorageConfigured() &&
      route?.supabaseRouteId &&
      startedAt &&
      walkedMinutes.value > 0
    ) {
      cloudSaved = await saveWalk({
        routeId: route.supabaseRouteId,
        route,
        walkedMinutes: walkedMinutes.value,
        startedAt
      })
    }

    // Al in de cloud? Dan niet nog een keer syncen
    if (cloudSaved && pendingWalkId) {
      markWalkSynced(pendingWalkId)
    }

    // Geen cloud? Wachtrij blijft staan; plugin probeert bij "online"
    if (!cloudSaved && isStorageConfigured()) {
      await syncPendingWalksToCloud()
    }
  }

  // Terug naar beginscherm (nieuwe wandeling)
  function resetToPick() {
    stopLocationWatch()
    phase.value = 'pick'
    savedRoute.value = null
    turnSteps.value = []
    turnIndex.value = 0
    walkInstruction.value = ''
    walkedMinutes.value = 0
    walkStartedAt = null
    hasLeftStartArea = false
    currentPosition.value = null
  }

  // Handmatig stoppen tijdens wandeling
  function stopWalkEarly() {
    finishWalk()
  }

  onUnmounted(() => {
    stopLocationWatch()
  })

  return {
    phase,
    savedRoute,
    walkInstruction,
    walkedMinutes,
    currentPosition,
    setRouteFromApi,
    startWalk,
    stopWalkEarly,
    resetToPick
  }
}
