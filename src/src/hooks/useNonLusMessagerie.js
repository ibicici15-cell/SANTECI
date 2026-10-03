import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

/**
 * Compte total des messages non lus, toutes messageries confondues selon
 * le rôle (patients, confrères, laboratoire) — utilisé par la barre du
 * haut (desktop) et la barre d'onglets du bas (mobile) pour que le badge
 * "Messagerie" soit identique aux deux endroits.
 */
export default function useNonLusMessagerie(utilisateur, role) {
  const [nonLus, setNonLus] = useState(0)
  const location = useLocation()
  // Ce hook est utilisé en même temps par plusieurs composants (barre du
  // haut ET barre d'onglets mobile) : chaque instance a besoin de son
  // propre canal Realtime, sinon la deuxième tente de s'abonner à un nom
  // de canal déjà pris par la première, ce qui fait planter l'app
  // ("cannot add postgres_changes callbacks ... after subscribe()").
  const idInstance = useRef(Math.random().toString(36).slice(2)).current

  const charger = async () => {
    if (!utilisateur || !['patient', 'professionnel', 'laboratoire'].includes(role)) { setNonLus(0); return }

    const requetes = []
    if (role === 'patient' || role === 'professionnel') {
      requetes.push(supabase.from('messages').select('id', { count: 'exact', head: true }).eq('lu', false).neq('expediteur_id', utilisateur.id))
    }
    if (role === 'laboratoire') {
      requetes.push(supabase.from('messages_labo').select('id', { count: 'exact', head: true }).eq('lu', false).neq('expediteur_id', utilisateur.id))
    }
    if (role === 'professionnel') {
      requetes.push(supabase.from('messages_collaboration').select('id', { count: 'exact', head: true }).eq('lu', false).neq('expediteur_id', utilisateur.id))
    }

    const resultats = await Promise.all(requetes)
    setNonLus(resultats.reduce((total, r) => total + (r.count || 0), 0))
  }

  // Recharge à chaque changement de page (utile après être passé par une
  // messagerie, qui marque les messages comme lus) — filet de sécurité
  // en plus du temps réel, au cas où celui-ci ne serait pas actif.
  useEffect(() => { charger() }, [utilisateur?.id, role, location.pathname])

  useEffect(() => {
    if (!utilisateur) return
    const canal = supabase
      .channel(`nonlus-messagerie-${utilisateur.id}-${idInstance}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => charger())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_labo' }, () => charger())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_collaboration' }, () => charger())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => charger())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages_labo' }, () => charger())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages_collaboration' }, () => charger())
      .subscribe()
    return () => supabase.removeChannel(canal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur?.id])

  return [nonLus, charger]
}
