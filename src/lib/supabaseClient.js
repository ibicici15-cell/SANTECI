import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Santé-CI] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. ' +
    'Copiez .env.example vers .env et renseignez vos identifiants Supabase.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sur demande explicite : un rechargement de page (F5, fermeture/
    // réouverture de l'onglet) doit imposer une reconnexion — la session ne
    // vit qu'en mémoire, jamais dans le localStorage du navigateur.
    // Conséquence à connaître : un vrai utilisateur devra se reconnecter à
    // chaque nouvelle visite/rechargement, y compris en production (ce
    // n'est pas juste un effet du mode développement).
    persistSession: false,
  },
})
