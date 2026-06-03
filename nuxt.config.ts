// Nuxt-instellingen voor de wandelapp
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Vercel: website + /api/route op één domein
  nitro: {
    preset: process.env.VERCEL ? 'vercel' : undefined
  },

  // Website altijd op poort 3000 — niet dezelfde poort als de API (3002)
  devServer: {
    port: 3000
  },

  // API-adres: leeg = zelfde site (/api/route). Lokaal met 2 terminals: http://localhost:3002
  runtimeConfig: {
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE ??
        (process.env.VERCEL ? '' : 'http://localhost:3002'),
      // Supabase (stap 7+8) — zie plugins/supabase.client.js
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey:
        process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ''
    }
  }
})
