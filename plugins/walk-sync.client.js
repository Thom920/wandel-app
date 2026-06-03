// Als internet terugkomt: lokale wandelingen alsnog naar Supabase sturen

export default defineNuxtPlugin(() => {
  const { syncPendingWalksToCloud } = useWalkLocalCache()

  async function trySync() {
    try {
      await syncPendingWalksToCloud()
    } catch (err) {
      console.warn('Sync naar Supabase mislukt:', err?.message || err)
    }
  }

  // Bij opstarten en als je weer online bent
  if (typeof window !== 'undefined') {
    window.addEventListener('online', trySync)
    trySync()
  }
})
