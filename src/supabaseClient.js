// Client Supabase.
// Renseigne les valeurs dans un fichier .env (copie .env.example vers .env)
// avec l'URL du projet et la clé "anon" trouvées dans
// Supabase → Project Settings → API.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// persistSession: false — la session n'est pas conservée entre deux
// chargements de page (demandé explicitement) : après un rechargement,
// il faut se reconnecter.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})
