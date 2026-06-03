// Supabase auth-fouten → simpele Nederlandse uitleg

export function authErrorToDutch(error) {
  const msg = String(error?.message || error?.msg || '')
  const code = String(error?.code || error?.error || '')

  if (
    msg.includes('Anonymous sign-ins are disabled') ||
    code.includes('anonymous') ||
    msg.includes('422')
  ) {
    return (
      'Anonieme login staat UIT in Supabase. Ga naar Authentication → Providers → Anonymous sign-ins en zet die AAN. Herlaad daarna deze pagina.'
    )
  }

  if (msg.includes('Auth session missing')) {
    return (
      'Er is nog geen sessie. Zet eerst Anonymous sign-ins aan, herlaad de pagina, en probeer daarna opnieuw.'
    )
  }

  if (msg.includes('Signups not allowed')) {
    return (
      'Registratie staat uit. Zet aan: Authentication → Providers → Email → Enable sign ups.'
    )
  }

  return msg || 'Inloggen lukte niet. Controleer je Supabase-instellingen.'
}
