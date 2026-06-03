<script setup>
// Logica van de homepagina (Composition API + script setup)

const durationOptions = [15, 20, 25, 30]

// Gekozen wandelduur in minuten (null = nog niets gekozen)
const selectedMinutes = ref(null)

// Tekst voor de gebruiker: laden, fout, of succes
const statusMessage = ref('')
const isError = ref(false)
const isLoading = ref(false)

// Na succes: korte route-info (afstand); coordinates bewaren we voor de kaart (stap 5)
const routeInfo = ref(null)

// apiBase komt uit nuxt.config.ts (bijv. http://localhost:3003)
const config = useRuntimeConfig()

function chooseDuration(minutes) {
  selectedMinutes.value = minutes
  statusMessage.value = ''
  isError.value = false
  routeInfo.value = null
}

// Zet API-fouten altijd om naar leesbare tekst (nooit "true" of [object Object])
function apiErrorText(data) {
  if (typeof data?.error === 'string') return data.error
  return 'Route kon niet worden gemaakt. Controleer of npm run dev:api draait.'
}

// Vraag de GPS-locatie van de browser op
function getUserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Je browser ondersteunt geen locatie.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () =>
        reject(
          new Error(
            'Locatie niet beschikbaar. Sta locatie toe in je browser of telefoon.'
          )
        ),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  })
}

// Hoofdstap: locatie ophalen → naar onze API sturen → route terug
async function createRoute() {
  if (!selectedMinutes.value) {
    statusMessage.value = 'Kies eerst hoe lang je wilt lopen.'
    return
  }

  isLoading.value = true
  isError.value = false
  statusMessage.value = 'Je locatie en route worden berekend…'
  routeInfo.value = null

  try {
    const position = await getUserPosition()
    const lat = position.coords.latitude
    const lng = position.coords.longitude

    const apiUrl = `${config.public.apiBase}/api/route`

    // In de browserconsole zie je naar welk adres we echt vragen (handig bij poort-problemen)
    if (import.meta.dev) {
      console.log('Route opvragen bij:', apiUrl)
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lng,
        minutes: selectedMinutes.value
      })
    })

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error(
        'Geen geldig antwoord van de API. Draait npm run dev:api op de juiste poort?'
      )
    }

    if (!response.ok || !data.ok) {
      throw new Error(apiErrorText(data))
    }

    if (!data.coordinates?.length) {
      throw new Error('De route kwam leeg terug. Probeer het opnieuw.')
    }

    routeInfo.value = {
      chosenMinutes: data.chosenMinutes ?? selectedMinutes.value,
      distanceKm: data.distanceKm,
      durationMinutes: data.durationMinutes,
      coordinates: data.coordinates
    }

    isError.value = false
    statusMessage.value =
      typeof data.message === 'string'
        ? data.message
        : 'Je route is klaar. Je kunt straks gaan lopen.'
  } catch (error) {
    isError.value = true
    statusMessage.value =
      error instanceof Error ? error.message : 'Er ging iets mis.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="home">
    <header class="home__header">
      <h1>Wandelapp</h1>
      <p>Even weg. Zonder nadenken over de route.</p>
    </header>

    <section class="home__picker" aria-labelledby="duration-label">
      <p id="duration-label" class="home__label">Hoe lang wil je lopen?</p>

      <div class="home__buttons">
        <button
          v-for="minutes in durationOptions"
          :key="minutes"
          type="button"
          class="home__button"
          :class="{ 'home__button--selected': selectedMinutes === minutes }"
          :aria-pressed="selectedMinutes === minutes"
          :disabled="isLoading"
          @click="chooseDuration(minutes)"
        >
          {{ minutes }} min
        </button>
      </div>

      <!-- Alleen zichtbaar als er een duur is gekozen -->
      <button
        v-if="selectedMinutes"
        type="button"
        class="home__start"
        :disabled="isLoading"
        @click="createRoute"
      >
        {{ isLoading ? 'Even geduld…' : 'Maak mijn route' }}
      </button>

      <!-- Status: laden, fout of bevestiging -->
      <p v-if="statusMessage" class="home__status" :class="{ 'home__status--error': isError }">
        {{ statusMessage }}
      </p>

      <!-- Afstand; de minuten staan al in statusMessage van de API -->
      <p v-if="routeInfo" class="home__route">
        Afstand: ongeveer {{ routeInfo.distanceKm }} km.
      </p>
    </section>
  </main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  padding: 1.5rem;
  background: #1a1f1e;
  color: #e8ebe9;
  font-family: system-ui, sans-serif;
  text-align: center;
}

.home__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
}

.home__header p {
  margin: 0;
  color: #a8b0ac;
  max-width: 20rem;
  line-height: 1.5;
}

.home__picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  max-width: 18rem;
}

.home__label {
  margin: 0;
  font-size: 1rem;
  color: #c5ccc8;
}

.home__buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
}

.home__button {
  padding: 1rem 0.5rem;
  border: 1px solid #3d4a45;
  border-radius: 0.75rem;
  background: #242b28;
  color: #e8ebe9;
  font-size: 1.05rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.home__button:hover:not(:disabled) {
  background: #2d3633;
  border-color: #4d5c56;
}

.home__button:focus-visible {
  outline: 2px solid #6b8f7a;
  outline-offset: 2px;
}

.home__button--selected {
  background: #2a3d34;
  border-color: #6b8f7a;
}

.home__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Groene actieknop: start route-berekening */
.home__start {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 0.75rem;
  background: #4a7c59;
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
}

.home__start:hover:not(:disabled) {
  background: #558f66;
}

.home__start:disabled {
  opacity: 0.7;
  cursor: wait;
}

.home__status {
  margin: 0;
  font-size: 0.9rem;
  color: #a8b0ac;
  line-height: 1.4;
}

.home__status--error {
  color: #e8a89a;
}

.home__route {
  margin: 0;
  font-size: 0.95rem;
  color: #b8d4c4;
  line-height: 1.4;
}
</style>
