// GET /api/health — test of de route-API bereikbaar is

export default defineEventHandler(() => {
  return { ok: true, service: 'wandel-api' }
})
