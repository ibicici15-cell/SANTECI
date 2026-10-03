import { supabase } from './supabaseClient'

// Marque comme lues les notifications non lues pointant vers "lien", pour
// l'utilisateur connecté. Appelé à l'arrivée sur la page correspondante,
// pour que le badge de cet onglet s'efface sans attendre que l'utilisateur
// ouvre la cloche de notifications générale.
export async function marquerLuParLien(utilisateurId, lien) {
  if (!utilisateurId || !lien) return
  await supabase.from('notifications').update({ lu: true })
    .eq('destinataire_id', utilisateurId).eq('lien', lien).eq('lu', false)
}

// Comme "ouvrir une conversation" en messagerie : marque comme lue la (ou
// les) notification(s) d'un élément précis d'une liste — le compteur
// global de la page baisse d'autant, les autres lignes non consultées
// restent en rouge.
export async function marquerEntiteLue(utilisateurId, lien, entiteId) {
  if (!utilisateurId || !lien || !entiteId) return
  await supabase.from('notifications').update({ lu: true })
    .eq('destinataire_id', utilisateurId).eq('lien', lien).eq('entite_id', entiteId).eq('lu', false)
}
