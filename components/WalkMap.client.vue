<script setup>
// Kaart met Leaflet — alleen in de browser (.client.vue)
// Toont de wandelroute; tijdens het lopen optioneel een blauw puntje (jij)

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { routeToLatLngList } from '~/utils/mapCoordinates.js'

const props = defineProps({
  // Route van de API: [[lng, lat], ...]
  coordinates: {
    type: Array,
    default: () => []
  },
  startLat: { type: Number, default: null },
  startLng: { type: Number, default: null },
  // Jouw huidige plek tijdens wandelen (optioneel)
  userLat: { type: Number, default: null },
  userLng: { type: Number, default: null }
})

const mapBox = ref(null)
let map = null
let routeLine = null
let startDot = null
let userDot = null

// Maak de kaart één keer aan als het vakje op het scherm staat
function buildMap() {
  if (!mapBox.value || map) return

  const points = routeToLatLngList(props.coordinates)
  if (points.length < 2) return

  map = L.map(mapBox.value, {
    zoomControl: true,
    attributionControl: true
  })

  // Gratis kaartbeelden van OpenStreetMap (internet nodig voor tegels)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map)

  routeLine = L.polyline(points, {
    color: '#6b8f7a',
    weight: 5,
    opacity: 0.9
  }).addTo(map)

  if (props.startLat != null && props.startLng != null) {
    startDot = L.circleMarker([props.startLat, props.startLng], {
      radius: 9,
      color: '#e8ebe9',
      fillColor: '#4a7c59',
      fillOpacity: 1,
      weight: 2
    })
      .addTo(map)
      .bindPopup('Start (je eindigt hier weer)')
  }

  map.fitBounds(routeLine.getBounds(), { padding: [24, 24] })
  updateUserDot()
}

// Blauw puntje: waar jij nu bent (alleen tijdens wandelen)
function updateUserDot() {
  if (!map) return

  if (props.userLat == null || props.userLng == null) {
    if (userDot) {
      map.removeLayer(userDot)
      userDot = null
    }
    return
  }

  if (!userDot) {
    userDot = L.circleMarker([props.userLat, props.userLng], {
      radius: 7,
      color: '#ffffff',
      fillColor: '#5b9bd5',
      fillOpacity: 1,
      weight: 2
    }).addTo(map)
  } else {
    userDot.setLatLng([props.userLat, props.userLng])
  }
}

// Route veranderd? Teken opnieuw
function refreshRoute() {
  if (!map) {
    buildMap()
    return
  }

  const points = routeToLatLngList(props.coordinates)
  if (points.length < 2) return

  if (routeLine) map.removeLayer(routeLine)
  routeLine = L.polyline(points, {
    color: '#6b8f7a',
    weight: 5,
    opacity: 0.9
  }).addTo(map)

  if (startDot) map.removeLayer(startDot)
  if (props.startLat != null && props.startLng != null) {
    startDot = L.circleMarker([props.startLat, props.startLng], {
      radius: 9,
      color: '#e8ebe9',
      fillColor: '#4a7c59',
      fillOpacity: 1,
      weight: 2
    }).addTo(map)
  }

  map.fitBounds(routeLine.getBounds(), { padding: [24, 24] })
  updateUserDot()
}

watch(
  () => props.coordinates,
  () => refreshRoute(),
  { deep: true }
)

watch(
  () => [props.userLat, props.userLng],
  () => updateUserDot()
)

onMounted(() => {
  nextTick(() => buildMap())
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
  routeLine = null
  startDot = null
  userDot = null
})
</script>

<template>
  <div class="walk-map">
    <div ref="mapBox" class="walk-map__canvas" aria-label="Kaart met wandelroute" />
    <p class="walk-map__note">
      Kaarttegels komen van internet. Trillen en tekst werken ook zonder kaart.
    </p>
  </div>
</template>

<style scoped>
.walk-map {
  width: 100%;
}

.walk-map__canvas {
  width: 100%;
  height: 220px;
  border-radius: 0.75rem;
  border: 1px solid #3d4a45;
  background: #242b28;
  overflow: hidden;
}

.walk-map__note {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: #8a9590;
  line-height: 1.4;
  text-align: left;
}

/* Leaflet-knoppen passen bij donker thema */
:deep(.leaflet-control-attribution) {
  font-size: 0.65rem;
  background: rgba(26, 31, 30, 0.85);
  color: #8a9590;
}

:deep(.leaflet-control-zoom a) {
  background: #242b28;
  color: #e8ebe9;
  border-color: #3d4a45;
}
</style>
