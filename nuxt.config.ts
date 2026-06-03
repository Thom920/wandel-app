// Nuxt-instellingen voor de wandelapp
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Website altijd op poort 3000 — niet dezelfde poort als de API (3003)
  devServer: {
    port: 3000
  },

  // Adres van je Node API (moet overeenkomen met PORT in .env)
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3002'
    }
  }
})
