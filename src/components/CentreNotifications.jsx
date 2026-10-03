import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function ilYA(dateIso) {
  const diffMs = new Date() - new Date(dateIso)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  return `il y a ${jours} j`
}

/**
 * Cloche de notifications, disponible pour tous les rôles connectés
 * (patient, professionnel, établissement, admin). Affiche les
 * notifications de la table "notifications" (validation de compte,
 * refus, abonnement activé, rendez-vous, rappels...).
 */
export default function CentreNotifications() {
  const { utilisateur } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef(null)

  const charger = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('destinataire_id', utilisateur.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  useEffect(() => {
    if (!utilisateur) return
    charger()
    const canal = supabase
      .channel(`notifications-${utilisateur.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `destinataire_id=eq.${utilisateur.id}` },
        () => charger())
      .subscribe()
    // Recharge aussi quand un push arrive app ouverte (voir lib/push.js)
    window.addEventListener('sante:notification', charger)
    return () => {
      window.removeEventListener('sante:notification', charger)
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur?.id])

  useEffect(() => {
    const surClicExterieur = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false)
    }
    document.addEventListener('mousedown', surClicExterieur)
    return () => document.removeEventListener('mousedown', surClicExterieur)
  }, [])

  const nonLues = notifications.filter(n => !n.lu).length

  const ouvrir = async () => {
    const prochainEtat = !ouvert
    setOuvert(prochainEtat)
    if (prochainEtat && nonLues > 0) {
      const idsNonLus = notifications.filter(n => !n.lu).map(n => n.id)
      await supabase.from('notifications').update({ lu: true }).in('id', idsNonLus)
      setNotifications(n => n.map(x => ({ ...x, lu: true })))
    }
  }

  if (!utilisateur) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={ouvrir}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-ardoise hover:text-foret hover:bg-charbon/5"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-alerte text-white text-[10px] font-bold flex items-center justify-center">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="fixed left-2 right-2 top-[4.25rem] max-h-[70vh] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-96 overflow-y-auto overflow-x-hidden carte p-0 z-50">
          <p className="font-display font-semibold text-sm px-4 py-3 border-b border-ligne">Notifications</p>
          {notifications.length === 0 ? (
            <p className="text-sm text-ardoise p-4">Aucune notification pour le moment.</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="px-4 py-3 border-b border-ligne last:border-0">
                <p className="text-sm font-medium text-charbon break-words">{n.titre}</p>
                {n.contenu && <p className="text-xs text-ardoise mt-0.5 break-words">{n.contenu}</p>}
                <p className="text-[11px] text-ardoise/70 mt-1">{ilYA(n.created_at)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
