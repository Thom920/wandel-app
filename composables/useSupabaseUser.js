// Ingelogde gebruiker (ook anonieme gast van Supabase)

export function useSupabaseUser() {
  return useState('supabase-user')
}
