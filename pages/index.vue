<script setup>
// How long the user can walk — only choice on the start screen (minutes)
const durationOptions = [15, 20, 25, 30]

// Which duration button the user tapped last (null = none yet)
const selectedMinutes = ref(null)

// Save the chosen walk length when user taps a button
function chooseDuration(minutes) {
  selectedMinutes.value = minutes
}
</script>

<template>
  <!-- Home page: pick walk duration, then start (route comes in a later step) -->
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
          @click="chooseDuration(minutes)"
        >
          {{ minutes }} min
        </button>
      </div>

      <!-- Short feedback after a tap (no route yet — step 3+) -->
      <p v-if="selectedMinutes" class="home__hint">
        Je koos {{ selectedMinutes }} minuten. De route komt in de volgende stap.
      </p>
    </section>
  </main>
</template>

<style scoped>
/* Calm, dark start screen — matches the “rest, not sport” feel from the docs */
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

/* Large tap targets — one tap to choose duration */
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

.home__button:hover {
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

.home__hint {
  margin: 0;
  font-size: 0.875rem;
  color: #8a9590;
  line-height: 1.4;
}
</style>
