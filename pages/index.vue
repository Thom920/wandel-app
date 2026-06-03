<script setup>
// Homepagina: duur kiezen → route maken → wandeling → afronden

const durationOptions = [15, 20, 25, 30]

const selectedMinutes = ref(null)
const statusMessage = ref('')
const isError = ref(false)
const isLoading = ref(false)

const config = useRuntimeConfig()

// Wandeling-logica — refs hier "uitpakken" zodat de template ze herkent
const {
  phase,
  savedRoute,
  walkInstruction,
  walkedMinutes,
  setRouteFromApi,
  startWalk,
  stopWalkEarly,
  resetToPick
} = useWalkSession()

function chooseDuration(minutes) {
  if (phase.value !== 'pick') {
    resetToPick()
  }
  selectedMinutes.value = minutes
  statusMessage.value = ''
  isError.value = false
}

function apiErrorText(data) {
  if (typeof data?.error === 'string') return data.error
  return 'Route kon niet worden gemaakt. Controleer of npm run dev:api draait.'
}

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

async function createRoute() {
  if (!selectedMinutes.value) {
    statusMessage.value = 'Kies eerst hoe lang je wilt lopen.'
    return
  }

  isLoading.value = true
  isError.value = false
  statusMessage.value = 'Je locatie en route worden berekend…'

  try {
    const position = await getUserPosition()
    const lat = position.coords.latitude
    const lng = position.coords.longitude
    const apiUrl = `${config.public.apiBase}/api/route`

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

    setRouteFromApi({
      chosenMinutes: data.chosenMinutes ?? selectedMinutes.value,
      distanceKm: data.distanceKm,
      durationMinutes: data.durationMinutes,
      coordinates: data.coordinates
    })

    isError.value = false
    statusMessage.value =
      typeof data.message === 'string'
        ? data.message
        : 'Je route is klaar.'
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

    <!-- FASE 1: duur kiezen en route laten maken -->
    <section
      v-if="phase === 'pick'"
      class="home__block"
      aria-labelledby="duration-label"
    >
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

      <button
        v-if="selectedMinutes"
        type="button"
        class="home__action"
        :disabled="isLoading"
        @click="createRoute"
      >
        {{ isLoading ? 'Even geduld…' : 'Maak mijn route' }}
      </button>

      <p v-if="statusMessage" class="home__status" :class="{ 'home__status--error': isError }">
        {{ statusMessage }}
      </p>
    </section>

    <!-- FASE 2: route is klaar — bevestiging vóór je echt gaat lopen -->
    <section v-else-if="phase === 'ready'" class="home__block">
      <p class="home__ready-title">Je route is klaar</p>
      <p class="home__status">{{ statusMessage }}</p>
      <p v-if="savedRoute" class="home__route">
        Afstand: ongeveer {{ savedRoute.distanceKm }} km.
      </p>
      <p v-if="savedRoute" class="home__hint">
        {{ savedRoute.startInstruction }}
      </p>

      <button type="button" class="home__action" @click="startWalk">
        Start wandeling
      </button>

      <button type="button" class="home__link" @click="resetToPick">
        Andere duur kiezen
      </button>
    </section>

    <!-- FASE 3: je loopt — grote tekst, weinig afleiding -->
    <section v-else-if="phase === 'walking'" class="home__block home__block--walk">
      <p class="home__walk-label">Nu</p>
      <p class="home__walk-instruction">
        {{ walkInstruction }}
      </p>
      <p class="home__hint">Je telefoon mag in je zak. We geven een korte trilling bij een afslag als je telefoon dat ondersteunt.</p>

      <button type="button" class="home__link" @click="stopWalkEarly">
        Wandeling stoppen
      </button>
    </section>

    <!-- FASE 4: klaar — warme afronding, geen prestaties -->
    <section v-else-if="phase === 'done'" class="home__block">
      <p class="home__ready-title">Goed gedaan</p>
      <p class="home__status">
        Je was ongeveer {{ walkedMinutes }}
        {{ walkedMinutes === 1 ? 'minuut' : 'minuten' }} onderweg.
      </p>
      <p v-if="savedRoute" class="home__hint">
        Je koos {{ savedRoute.chosenMinutes }} minuten. Even weg zijn was het doel.
      </p>

      <button type="button" class="home__action" @click="resetToPick">
        Nieuwe wandeling
      </button>
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
  gap: 2rem;
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

.home__block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  max-width: 20rem;
}

.home__block--walk {
  max-width: 22rem;
}

.home__label {
  margin: 0;
  font-size: 1rem;
  color: #c5ccc8;
}

.home__ready-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  color: #e8ebe9;
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
}

.home__button:hover:not(:disabled) {
  background: #2d3633;
}

.home__button--selected {
  background: #2a3d34;
  border-color: #6b8f7a;
}

.home__button:disabled {
  opacity: 0.6;
}

.home__action {
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

.home__action:hover {
  background: #558f66;
}

.home__action:disabled {
  opacity: 0.7;
  cursor: wait;
}

.home__link {
  background: none;
  border: none;
  color: #8a9590;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
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
}

.home__hint {
  margin: 0;
  font-size: 0.875rem;
  color: #8a9590;
  line-height: 1.45;
}

.home__walk-label {
  margin: 0;
  font-size: 0.85rem;
  color: #8a9590;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.home__walk-instruction {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.35;
  color: #e8ebe9;
}
</style>
