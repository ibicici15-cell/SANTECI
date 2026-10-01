import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Clock3, FileHeart, Search, FolderHeart, ClipboardList, MessageSquare, FlaskConical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import ListeRendezVousPatient from '../components/ListeRendezVousPatient'
import CarteStat from '../components/CarteStat'
import PastilleLien from '../components/PastilleLien'
import useCompteNotifications from '../hooks/useCompteNotifications'

export default function TableauDeBordPatient() {
  const { utilisateur, detail } = useAuth()
  const notifs = useCompteNotifications(utilisateur.id)
  const [rdvs, setRdvs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [messagesLaboNonLus, setMessagesLaboNonLus] = useState(0)

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from('messages_labo')
        .select('id', { count: 'exact', head: true }).eq('lu', false).neq('expediteur_id', utilisateur.id)
      setMessagesLaboNonLus(count || 0)
    })()
  }, [utilisateur.id])

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('rendez_vous')
      .select('*, professionnels(nom, prenom, specialite)')
      .eq('patient_id', utilisateur.id)
      .order('date_heure', { ascending: true })
    setRdvs(data || [])
    setChargement(false)
  }, [utilisateur.id])

  useEffect(() => { charger() }, [charger])

  const prochains = rdvs.filter(r => new Date(r.date_heure) >= new Date() && !['annule', 'termine', 'refuse'].includes(r.statut))
  const enAttente = rdvs.filter(r => r.statut === 'en_attente').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Bonjour, {detail?.prenom} 👋</h1>
      <p className="text-ardoise mt-1">Votre espace santé Santé-CI.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <CarteStat label="Rendez-vous à venir" valeur={prochains.length} accent="foret" Icone={CalendarClock} />
        <CarteStat label="En attente de confirmation" valeur={enAttente} accent="ocre" Icone={Clock3} />
        <CarteStat label="Total consultations" valeur={rdvs.filter(r => r.statut === 'termine').length} accent="ambre" Icone={FileHeart} />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link to="/recherche" className="btn-primaire"><Search size={16} /> Trouver un professionnel</Link>
        <Link to="/recherche-laboratoires" className="btn-fantome"><FlaskConical size={16} /> Trouver un laboratoire</Link>
        <Link to="/mes-analyses" className="btn-fantome"><FlaskConical size={16} /> Mes analyses<PastilleLien compte={notifs['/mes-analyses']} /></Link>
        <Link to="/patient/dossier-medical" className="btn-fantome"><FolderHeart size={16} /> Mon dossier médical</Link>
        <Link to="/patient/comptes-rendus" className="btn-fantome"><ClipboardList size={16} /> Mes comptes-rendus<PastilleLien compte={notifs['/patient/comptes-rendus']} /></Link>
        <Link to="/patient/messagerie" className="btn-fantome"><MessageSquare size={16} /> Messagerie</Link>
        <Link to="/laboratoire/messagerie" className="btn-fantome"><MessageSquare size={16} /> Messagerie laboratoire<PastilleLien compte={messagesLaboNonLus} /></Link>
      </div>

      <h2 className="font-display font-semibold text-lg mt-10 mb-3">Mes prochains rendez-vous</h2>
      {chargement ? <Loader /> : prochains.length === 0 ? (
        <div className="carte p-8 text-center text-ardoise">
          Aucun rendez-vous à venir. <Link to="/recherche" className="text-foret font-semibold">Réservez-en un.</Link>
        </div>
      ) : (
        <ListeRendezVousPatient rdvs={prochains} surRafraichissement={charger} />
      )}

      <div className="text-right mt-4">
        <Link to="/patient/rendez-vous" className="text-sm text-foret font-semibold">Voir tout l'historique (y compris refusés/annulés) →<PastilleLien compte={notifs['/patient/rendez-vous']} /></Link>
      </div>
    </div>
  )
}
