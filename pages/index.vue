<script setup>
// <script setup> = Vue 3 manier om logica in een pagina te zetten
// Nuxt laadt dit automatisch voor pages/index.vue (= de homepagina "/")

// Vaste keuzes voor wandelduur (minuten) — komt overeen met het conceptdocument
const durationOptions = [15, 20, 25, 30]

// ref() = een waarde die kan veranderen EN waarbij het scherm mee ververst
// null = nog geen knop gekozen
const selectedMinutes = ref(null)

// Wordt aangeroepen als je op een duur-knop klikt
// minutes = het getal van die knop (bijv. 25)
function chooseDuration(minutes) {
  // .value omdat selectedMinutes een ref is (Vue-regel)
  selectedMinutes.value = minutes
}
</script>

<template>
  <!-- Alles hieronder is wat de gebruiker ziet (HTML-structuur) -->

  <main class="home">
    <header class="home__header">
      <h1>Wandelapp</h1>
      <p>Even weg. Zonder nadenken over de route.</p>
    </header>

    <!-- Sectie voor het kiezen van de duur -->
    <section class="home__picker" aria-labelledby="duration-label">
      <p id="duration-label" class="home__label">Hoe lang wil je lopen?</p>

      <div class="home__buttons">
        <!--
          v-for: één knop per duur (15, 20, 25, 30)
          :key: unieke id per knop (verplicht bij v-for)
          :class: extra class als deze knop gekozen is (groene rand)
          :aria-pressed: toegankelijkheid voor screenreaders
          @click: bij tik roep chooseDuration(minutes) aan
          {{ minutes }}: toon het getal in de knop
        -->
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

      <!--
        v-if = toon deze tekst alleen als selectedMinutes een getal is (niet null)
        {{ selectedMinutes }} = het gekozen aantal minuten in de zin
      -->
      <p v-if="selectedMinutes" class="home__hint">
        Je koos {{ selectedMinutes }} minuten. De route komt in de volgende stap.
      </p>
    </section>
  </main>
</template>

<style scoped>
/*
  scoped = deze CSS geldt alleen voor dit bestand (index.vue)
  Donkere, rustige kleuren — past bij "ontspannen wandelen", geen sport-app
*/

/* Hele pagina: centreren en volledige schermhoogte */
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

/* Blok met vraag + knoppen */
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

/* Grid 2 kolommen = vier knoppen in een 2x2 raster */
.home__buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
}

/* Standaardknop: groot genoeg om makkelijk te tikken op telefoon */
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

/* Hover = alleen op desktop met muis; op telefoon zie je dit minder */
.home__button:hover {
  background: #2d3633;
  border-color: #4d5c56;
}

/* Duidelijke focus-ring voor toetsenbordgebruikers */
.home__button:focus-visible {
  outline: 2px solid #6b8f7a;
  outline-offset: 2px;
}

/* Geselecteerde knop: iets lichter/groener (class komt van :class in template) */
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
