// GPS en waarschuwingen terwijl je telefoon in je zak zit (stap 10)
// Let op: elke browser is anders; op iPhone kan achtergrond-GPS beperkt zijn

// Hoe ver vóór de afslag we al trillen (meter) — uit concept: 10–15 m, hier iets ruimer voor GPS-ruis
export const NUDGE_DISTANCE_METERS = 22

export function useWalkBackground() {
  let onPageHideHandler = null
  let beforeUnloadHandler = null

  // Start: luister of je het tabblad verlaat — GPS-watch blijft gewoon lopen
  function beginWalkTracking() {
    if (typeof document === 'undefined') return

    onPageHideHandler = () => {
      // Geen actie nodig: watchPosition stopt niet als je dit tabblad minimaliseert
      // (op sommige telefoons pauzeert Safari wel — dan helpt alleen de app open houden)
    }

    document.addEventListener('visibilitychange', onPageHideHandler)

    // Waarschuw als je de pagina sluit terwijl je nog loopt
    beforeUnloadHandler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', beforeUnloadHandler)
  }

  // Stop: luisters opruimen na afronden of annuleren
  function endWalkTracking() {
    if (typeof document === 'undefined') return

    if (onPageHideHandler) {
      document.removeEventListener('visibilitychange', onPageHideHandler)
      onPageHideHandler = null
    }

    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      beforeUnloadHandler = null
    }
  }

  return {
    beginWalkTracking,
    endWalkTracking,
    nudgeDistanceMeters: NUDGE_DISTANCE_METERS
  }
}
