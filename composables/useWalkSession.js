// Beheert de wandeling: route bewaren, starten, aanwijzingen, afronden

import {
  buildTurnSteps,
  distanceMeters,
  getStartInstruction
} from '~/utils/routeTurns.js'

export function useWalkSession() {
  const { saveRoute, saveWalk, isConfigured: isStorageConfigured } = useWalkStorage()
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
      supabaseRouteId: null
    }

    turnSteps.value = buildTurnSteps(coordinates)
    turnIndex.value = 0
    phase.value = 'ready'

    // Supabase: route bewaren op de achtergrond (wandelen werkt ook als dit mislukt)
    if (isStorageConfigured()) {
      const routeId = await saveRoute(savedRoute.value)
      if (routeId) {
        savedRoute.value.supabaseRouteId = routeId
      }
    }
  }

  // Korte trilling op je telefoon (werkt niet op elke browser/desktop)
  function nudgePhone() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(180)
    }
  }

  // Wordt steeds aangeroepen als je GPS-positie verandert tijdens het lopen
  function onPositionUpdate(position) {
    if (!savedRoute.value || phase.value !== 'walking') return

    const userLat = position.coords.latitude
    const userLng = position.coords.longitude
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

    // Dicht bij een afslag? Toon aanwijzing en ga naar de volgende afslag
    if (metersToTurn < 35) {
      walkInstruction.value = step.instruction
      nudgePhone()
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
    walkInstruction.value = savedRoute.value.startInstruction

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

    // Supabase: wandelgeschiedenis opslaan (stil, geen extra scherm)
    const route = savedRoute.value
    if (
      isStorageConfigured() &&
      route?.supabaseRouteId &&
      startedAt &&
      walkedMinutes.value > 0
    ) {
      await saveWalk({
        routeId: route.supabaseRouteId,
        route,
        walkedMinutes: walkedMinutes.value,
        startedAt
      })
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
    setRouteFromApi,
    startWalk,
    stopWalkEarly,
    resetToPick
  }
}
