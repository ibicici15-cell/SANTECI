import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Comme pour la messagerie (où chaque conversation a son propre compteur
 * qui décroît quand ON L'OUVRE, pas les autres) : renvoie l'ensemble des
 * identifiants d'éléments (rendez-vous, compte-rendu, demande d'analyse…)
 * qui ont une notification non lue pour "lien" donné, afin que chaque
 * ligne d'une liste affiche son propre point rouge — et seulement le sien.
 */
export default function useEntitesNonLues(utilisateurId, lien) {
  const [entites, setEntites] = useState(new Set())

  const charger = async () => {
    if (!utilisateurId || !lien) { setEntites(new Set()); return }
    const { data } = await supabase
      .from('notifications')
      .select('entite_id')
      .eq('destinataire_id', utilisateurId)
      .eq('lien', lien)
      .eq('lu', false)
      .not('entite_id', 'is', null)
    setEntites(new Set((data || []).map(n => n.entite_id)))
  }

  useEffect(() => {
    charger()
    if (!utilisateurId) return
    const canal = supabase
      .channel(`entites-non-lues-${utilisateurId}-${lien}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `destinataire_id=eq.${utilisateurId}` },
        () => charger())
      .subscribe()
    return () => supabase.removeChannel(canal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateurId, lien])

  return entites
}
