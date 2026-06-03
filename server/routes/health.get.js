// GET /health — zelfde test als de oude Node-server op poort 3002

export default defineEventHandler(() => {
  return { ok: true, service: 'wandel-api' }
})
