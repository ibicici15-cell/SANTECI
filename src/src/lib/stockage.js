import { supabase } from './supabaseClient'

/**
 * Téléverse un fichier dans un bucket Supabase Storage, sous un chemin
 * `{prefixeDossier}/{horodatage}-{nomFichier}` (convention attendue par les
 * politiques RLS définies dans supabase/storage.sql).
 *
 * Retourne { chemin, url } :
 *  - chemin : le chemin de stockage (à sauvegarder en base pour les buckets
 *    privés, pour pouvoir générer une URL signée à la demande plus tard)
 *  - url : URL publique (bucket public) ou URL signée valable 1 an (bucket privé)
 */
export async function televerserFichier(bucket, fichier, prefixeDossier, { publique = false } = {}) {
  const nomNettoye = fichier.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const cheminFichier = `${prefixeDossier}/${Date.now()}-${nomNettoye}`

  const { error } = await supabase.storage.from(bucket).upload(cheminFichier, fichier, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  if (publique) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(cheminFichier)
    return { chemin: cheminFichier, url: data.publicUrl }
  }

  const { data, error: erreurSignature } = await supabase.storage
    .from(bucket)
    .createSignedUrl(cheminFichier, 60 * 60 * 24 * 365)
  if (erreurSignature) throw erreurSignature

  return { chemin: cheminFichier, url: data.signedUrl }
}

/** Génère une URL signée temporaire à la demande pour un fichier déjà stocké. */
export async function urlSignee(bucket, chemin, dureeSecondes = 3600) {
  if (!chemin) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(chemin, dureeSecondes)
  if (error) return null
  return data.signedUrl
}
