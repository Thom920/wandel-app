// Supabase-client voor de browser (geen @nuxtjs/supabase — die botst met onze map server/)

import { createClient } from '@supabase/supabase-js'
import { authErrorToDutch } from '~/utils/supabaseAuthErrors.js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseKey

  // Gebruiker in de app (wordt bijgewerkt bij inloggen/uitloggen)
  const user = useState('supabase-user', () => null)

  if (!url || !key) {
    return {
      provide: {
        supabase: null
      }
    }
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })

  // Luister naar wijzigingen (anoniem inloggen, e-mail koppelen, uitloggen)
  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
  })

  // Sessie ophalen; zo niet → stille anonieme login (geen aparte plugin meer)
  supabase.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      user.value = data.session.user
      return
    }

    const { data: anonData, error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.warn('Supabase gast-login mislukt:', authErrorToDutch(error))
      return
    }

    user.value = anonData.session?.user ?? anonData.user ?? null
  })

  return {
    provide: {
      supabase
    }
  }
})
