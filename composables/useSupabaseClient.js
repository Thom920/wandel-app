// Geeft de Supabase-client uit de plugin (of null als .env leeg is)

export function useSupabaseClient() {
  const { $supabase } = useNuxtApp()
  return $supabase
}
