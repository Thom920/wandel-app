// Trillen op je telefoon — ander patroon voor links, rechts en rechtdoor
// Werkt alleen als de browser vibrate ondersteunt (vaak wel op telefoon, niet op pc)

const SETTINGS_KEY = 'wandelapp_trillen_aan'

// Staat trillen aan? (standaard ja; gebruiker kan uit zetten op het scherm)
export function isHapticEnabled() {
  if (typeof localStorage === 'undefined') return true
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (raw === null) return true
  return raw === '1'
}

// Zet trillen aan (1) of uit (0) en onthoud dat
export function setHapticEnabled(on) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, on ? '1' : '0')
}

// Kan deze browser überhaupt trillen?
export function canUseVibration() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

// Tril op basis van richting: links = twee korte tikken, rechts = één langere, rechtdoor = één korte
export function playTurnNudge(turnKind) {
  if (!isHapticEnabled() || !canUseVibration()) return

  let pattern = [120]

  if (turnKind === 'left') {
    // Links: kort-kort (je voelt: "tik tik")
    pattern = [70, 45, 70]
  } else if (turnKind === 'right') {
    // Rechts: langer (je voelt: "bzzzz")
    pattern = [220, 80, 120]
  } else if (turnKind === 'straight') {
    // Rechtdoor: één rustige tik
    pattern = [100]
  }

  navigator.vibrate(pattern)
}

// Eén korte trilling bij start wandeling (bevestiging)
export function playStartNudge() {
  if (!isHapticEnabled() || !canUseVibration()) return
  navigator.vibrate(90)
}
