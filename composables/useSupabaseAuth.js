// Supabase-auth: stille gast-sessie + optioneel e-mail koppelen (stap 8)

import { authErrorToDutch } from '~/utils/supabaseAuthErrors.js'

export function useSupabaseAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Zijn SUPABASE_URL en key ingevuld in .env?
  function isConfigured() {
    const config = useRuntimeConfig()
    return Boolean(config.public.supabaseUrl && config.public.supabaseKey)
  }

  // Geen Supabase in .env → client is null
  if (!supabase) {
    return {
      user,
      isConfigured: () => false,
      ensureSession: async () => ({ ok: false, reason: 'not_configured' }),
      linkEmail: async () => ({
        ok: false,
        message: 'Supabase is nog niet ingesteld in .env.'
      }),
      signOutToGuest: async () => ({ ok: false }),
      hasLinkedEmail: computed(() => false)
    }
  }

  // Zorg dat er altijd een gebruiker is (anoniem = geen inlogscherm nodig)
  async function ensureSession() {
    if (!isConfigured()) return { ok: false, reason: 'not_configured' }

    if (user.value?.id) {
      return { ok: true, user: user.value }
    }

    const { data, error } = await supabase.auth.signInAnonymously()

    if (error) {
      return {
        ok: false,
        reason: 'sign_in_failed',
        error,
        message: authErrorToDutch(error)
      }
    }

    // Sessie uit het antwoord (betrouwbaarder dan alleen user-state)
    if (data.session?.user) {
      user.value = data.session.user
      return { ok: true, user: data.session.user }
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session?.user) {
      user.value = sessionData.session.user
      return { ok: true, user: sessionData.session.user }
    }

    return {
      ok: false,
      reason: 'no_session',
      message:
        'Inloggen leek te lukken maar er is geen sessie. Herlaad de pagina.'
    }
  }

  // Gast-account koppelen aan e-mail (optioneel, voor later op andere telefoon)
  async function linkEmail(email) {
    if (!isConfigured()) {
      return { ok: false, message: 'Supabase is nog niet ingesteld in .env.' }
    }

    const sessionResult = await ensureSession()
    if (!sessionResult.ok) {
      return {
        ok: false,
        message:
          sessionResult.message ||
          'Eerst moet anonieme login werken. Zie de stappen in docs/08-supabase-auth.md.'
      }
    }

    const trimmed = String(email || '').trim()
    if (!trimmed.includes('@')) {
      return { ok: false, message: 'Vul een geldig e-mailadres in.' }
    }

    const { error } = await supabase.auth.updateUser({ email: trimmed })

    if (error) {
      return { ok: false, message: authErrorToDutch(error) }
    }

    return {
      ok: true,
      message:
        'Check je e-mail om te bevestigen. Daarna kun je op andere apparaten inloggen.'
    }
  }

  // Uitloggen en opnieuw een anonieme sessie (geschiedenis blijft op oude account)
  async function signOutToGuest() {
    if (!isConfigured()) return { ok: false }

    await supabase.auth.signOut()
    const result = await ensureSession()
    return result
  }

  // Heeft deze gebruiker al een e-mail gekoppeld?
  const hasLinkedEmail = computed(() => {
    const u = user.value
    if (!u?.email) return false
    return !u.is_anonymous
  })

  return {
    user,
    isConfigured,
    ensureSession,
    linkEmail,
    signOutToGuest,
    hasLinkedEmail
  }
}
