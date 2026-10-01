import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Compte les notifications non lues par destination ("lien"), pour
 * afficher un badge sur chaque onglet concerné (Mes rendez-vous, Mes
 * analyses, Mes collaborations, Mon abonnement...) et pas seulement sur
 * la messagerie. Se rafraîchit dès qu'une notification est créée, mise à
 * jour ou marquée lue.
 */
export default function useCompteNotifications(utilisateurId) {
  const [parLien, setParLien] = useState({})

  const charger = async () => {
    if (!utilisateurId) { setParLien({}); return }
    const { data } = await supabase
      .from('notifications')
      .select('lien')
      .eq('destinataire_id', utilisateurId)
      .eq('lu', false)
      .not('lien', 'is', null)
    const compte = {}
    ;(data || []).forEach(n => { compte[n.lien] = (compte[n.lien] || 0) + 1 })
    setParLien(compte)
  }

  useEffect(() => {
    charger()
    if (!utilisateurId) return
    const canal = supabase
      .channel(`badges-notifications-${utilisateurId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `destinataire_id=eq.${utilisateurId}` },
        () => charger())
      .subscribe()
    return () => supabase.removeChannel(canal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateurId])

  return parLien
}
