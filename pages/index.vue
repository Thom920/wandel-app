<template>
  <!-- Home page: first screen of the walking app -->
  <main class="home">
    <h1>Wandelapp</h1>
    <p>Even weg. Zonder nadenken over de route.</p>
  </main>
</template>

<style scoped>
/* Simple, calm styling for step 1 (no Tailwind yet) */
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #1a1f1e;
  color: #e8ebe9;
  font-family: system-ui, sans-serif;
  text-align: center;
}

h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
}

p {
  margin: 0;
  color: #a8b0ac;
  max-width: 20rem;
  line-height: 1.5;
}
</style>
