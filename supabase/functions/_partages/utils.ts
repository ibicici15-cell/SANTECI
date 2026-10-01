// Utilitaires partagés par les Edge Functions Santé-CI (Deno runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

export const enTetesCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function reponseJson(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...enTetesCors, 'Content-Type': 'application/json' },
  })
}

// Client avec la clé service_role : ne jamais exposer ce client au frontend.
export function clientAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )
}

// Vérifie le token JWT envoyé par le frontend (header Authorization: Bearer ...)
export async function utilisateurConnecte(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data, error } = await client.auth.getUser()
  if (error) return null
  return data.user
}
