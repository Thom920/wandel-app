// Dit bestand leest instellingen uit je .env-bestand.
// .env staat in de projectmap; die wordt NIET naar GitHub gecommit (geheimen veilig).
// npm run dev:api laadt .env via: node --env-file=.env

// Maak één object met alle instellingen die de server nodig heeft
export function getConfig() {
  return {
    // Op welke poort de API luistert (bijv. 3002 of 3003)
    // BELANGRIJK: in .env moet het PORT heten (hoofdletters), niet "port"
    // Number(...) zet tekst om naar een getal; || 3002 = fallback als PORT leeg is
    port: Number(process.env.PORT) || 3002,

    // API-sleutel voor OpenRouteService (routes berekenen) — stap 4+
    openRouteServiceKey: process.env.OPENROUTESERVICE_API_KEY || '',

    // Supabase-database en login — stap 7+
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  }
}
