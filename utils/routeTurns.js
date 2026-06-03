// Hulpfuncties om uit route-punten simpele aanwijzingen te maken (links / rechts / rechtdoor)

// Afstand tussen twee GPS-punten in meters (korte formule, goed genoeg voor de wandelapp)
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Richting van punt A naar punt B in graden (0 = noorden, 90 = oosten)
function bearingDegrees(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const lat1r = toRad(lat1)
  const lat2r = toRad(lat2)
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(lat2r)
  const x =
    Math.cos(lat1r) * Math.sin(lat2r) -
    Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// Tekst voor het allereerste stuk van de route
export function getStartInstruction(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return 'Begin met lopen. Volg de route.'
  }

  const [lng1, lat1] = coordinates[0]
  const [lng2, lat2] = coordinates[1]
  const direction = bearingDegrees(lat1, lng1, lat2, lng2)

  if (direction >= 45 && direction < 135) return 'Begin met lopen. Eerst richting het oosten.'
  if (direction >= 135 && direction < 225) return 'Begin met lopen. Eerst richting het zuiden.'
  if (direction >= 225 && direction < 315) return 'Begin met lopen. Eerst richting het westen.'
  return 'Begin met lopen. Eerst richting het noorden.'
}

// Maak een lijst met afslagpunten uit alle route-coördinaten
// coordinates = [[lng, lat], [lng, lat], ...] van OpenRouteService
export function buildTurnSteps(coordinates) {
  const steps = []
  const minAngle = 28 // graden verschil voordat we het een afslag noemen
  const minGapMeters = 35 // punten dichter bij elkaar overslaan (ruis)

  for (let i = 1; i < coordinates.length - 1; i++) {
    const [lngPrev, latPrev] = coordinates[i - 1]
    const [lngMid, latMid] = coordinates[i]
    const [lngNext, latNext] = coordinates[i + 1]

    const bearingIn = bearingDegrees(latPrev, lngPrev, latMid, lngMid)
    const bearingOut = bearingDegrees(latMid, lngMid, latNext, lngNext)
    let turn = bearingOut - bearingIn

    if (turn > 180) turn -= 360
    if (turn < -180) turn += 360

    if (Math.abs(turn) < minAngle) continue

    const last = steps[steps.length - 1]
    if (last && distanceMeters(last.lat, last.lng, latMid, lngMid) < minGapMeters) {
      continue
    }

    let instruction = 'Ga rechtdoor'
    let turnKind = 'straight'
    if (turn > 0) {
      instruction = 'Ga links'
      turnKind = 'left'
    }
    if (turn < 0) {
      instruction = 'Ga rechts'
      turnKind = 'right'
    }

    steps.push({
      lat: latMid,
      lng: lngMid,
      instruction,
      // Voor trilpatroon in stap 10 (links / rechts / rechtdoor)
      turnKind
    })
  }

  return steps
}
