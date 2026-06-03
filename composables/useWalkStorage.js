// Routes en wandelingen opslaan in Supabase (stap 7 + 8)

export function useWalkStorage() {
  const supabase = useSupabaseClient()
  const { ensureSession, isConfigured } = useSupabaseAuth()

  // Route in tabel "routes" zetten na API-antwoord
  async function saveRoute(route) {
    if (!supabase || !isConfigured() || !route) return null

    const session = await ensureSession()
    if (!session.ok) return null

    const userId = session.user?.id
    if (!userId) return null

    const { data, error } = await supabase
      .from('routes')
      .insert({
        user_id: userId,
        guest_id: null,
        chosen_minutes: route.chosenMinutes,
        duration_minutes: route.durationMinutes,
        distance_km: route.distanceKm,
        start_lat: route.startLat,
        start_lng: route.startLng,
        coordinates: route.coordinates,
        start_instruction: route.startInstruction
      })
      .select('id')
      .single()

    if (error) {
      console.warn('Route opslaan mislukt:', error.message)
      return null
    }

    return data.id
  }

  // Afgeronde wandeling in tabel "walks" zetten
  async function saveWalk({ routeId, route, walkedMinutes, startedAt }) {
    if (!supabase || !isConfigured() || !routeId || !route || !startedAt) return false

    const session = await ensureSession()
    if (!session.ok) return false

    const userId = session.user?.id
    if (!userId) return false

    const finishedAt = new Date()
    const started = new Date(startedAt)

    const { error } = await supabase.from('walks').insert({
      user_id: userId,
      guest_id: null,
      route_id: routeId,
      chosen_minutes: route.chosenMinutes,
      walked_minutes: walkedMinutes,
      started_at: started.toISOString(),
      finished_at: finishedAt.toISOString()
    })

    if (error) {
      console.warn('Wandeling opslaan mislukt:', error.message)
      return false
    }

    return true
  }

  return {
    isConfigured,
    saveRoute,
    saveWalk
  }
}
