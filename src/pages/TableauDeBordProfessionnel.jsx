import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, BellRing, ClipboardCheck, UserCog, CalendarRange, MessageSquare, RefreshCcw, Search, Users, FlaskConical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import CarteStat from '../components/CarteStat'
import CarteRendezVous from '../components/CarteRendezVous'
import Badge from '../components/Badge'
import ModaleCompteRendu from '../components/ModaleCompteRendu'
import PastilleLien from '../components/PastilleLien'
import useCompteNotifications from '../hooks/useCompteNotifications'

function joursRestants(dateFinIso) {
  const diff = new Date(dateFinIso) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000

export default function TableauDeBordProfessionnel() {
  const { utilisateur, detail, rafraichirProfil } = useAuth()
  const notifs = useCompteNotifications(utilisateur.id)
  const [messagesConfreresNonLus, setMessagesConfreresNonLus] = useState(0)

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from('messages_collaboration')
        .select('id', { count: 'exact', head: true }).eq('lu', false).neq('expediteur_id', utilisateur.id)
      setMessagesConfreresNonLus(count || 0)
    })()
  }, [utilisateur.id])
  const [rdvs, setRdvs] = useState([])
  const [abonnement, setAbonnement] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [aDesHoraires, setADesHoraires] = useState(true) // true par défaut pour ne pas flasher l'alerte inutilement
  const [rdvOuvert, setRdvOuvert] = useState(null)

  const charger = async () => {
    const [{ data: rdvData }, { data: abo }, { count: nbHoraires }] = await Promise.all([
      supabase.from('rendez_vous').select('*, patients(nom, prenom)').eq('professionnel_id', utilisateur.id).order('date_heure', { ascending: true }),
      supabase.from('abonnements').select('*').eq('professionnel_id', utilisateur.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('horaires_disponibilite').select('*', { count: 'exact', head: true }).eq('professionnel_id', utilisateur.id),
    ])
    setRdvs(rdvData || [])
    setAbonnement(abo)
    setADesHoraires((nbHoraires || 0) > 0)
    setChargement(false)
    rafraichirProfil() // évite un statut de validation périmé si l'admin vient de valider

    // Crée une notification "essai bientôt terminé" si on approche de la
    // fin (≤ 3 jours) et qu'on n'en a pas déjà envoyé une récemment — pour
    // que l'alerte apparaisse dans la cloche de notifications même sans
    // tâche planifiée côté serveur configurée.
    if (abo?.statut === 'essai' && joursRestants(abo.date_fin_essai) <= 3) {
      const { data: dejaEnvoyee } = await supabase
        .from('notifications')
        .select('id')
        .eq('destinataire_id', utilisateur.id)
        .eq('type', 'fin_essai')
        .gte('created_at', new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
      if (!dejaEnvoyee || dejaEnvoyee.length === 0) {
        await supabase.from('notifications').insert({
          destinataire_id: utilisateur.id,
          type: 'fin_essai',
          titre: 'Votre essai gratuit se termine bientôt',
          contenu: "Souscrivez un abonnement pour continuer à apparaître dans les recherches.",
          lien: '/professionnel/abonnement',
        })
      }
    }
  }

  useEffect(() => { charger() }, [utilisateur.id])

  if (chargement) return <Loader />

  const aujourdHui = rdvs.filter(r => new Date(r.date_heure).toDateString() === new Date().toDateString())
  const enAttente = rdvs.filter(r => r.statut === 'en_attente' && !r.necessite_reconfirmation)
  const aReconfirmer = rdvs.filter(r => r.statut === 'en_attente' && r.necessite_reconfirmation)
  // Bug corrigé : ce filtre incluait auparavant aussi les "en_attente"
  // (il n'excluait que annule/refuse/termine), ce qui faisait apparaître
  // un même rendez-vous à la fois ici et dans "en attente".
  const aVenir = rdvs.filter(r => new Date(r.date_heure) >= new Date() && r.statut === 'confirme').slice(0, 5)
  const annulationsRecentes = rdvs.filter(r => r.statut === 'annule' && (new Date() - new Date(r.updated_at)) < SEPT_JOURS_MS)

  const enEssai = abonnement?.statut === 'essai'
  const joursEssai = abonnement ? joursRestants(abonnement.date_fin_essai) : 0

  const abonnementActifBientotExpire = abonnement?.statut === 'actif' && abonnement.date_fin_abonnement
    ? joursRestants(abonnement.date_fin_abonnement)
    : null

  const repondre = async (id, statut) => {
    const { error } = await supabase.from('rendez_vous').update({ statut, necessite_reconfirmation: false }).eq('id', id)
    if (error) {
      if (error.code === '23505') {
        alert('Impossible de confirmer : vous avez déjà un autre rendez-vous confirmé sur ce même créneau. Refusez-le d\'abord si besoin.')
      } else {
        alert("Une erreur est survenue : " + error.message)
      }
      return
    }
    charger()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-charbon">Dr {detail?.prenom} {detail?.nom}</h1>
        <Badge statut={abonnement?.statut || 'essai'} />
      </div>

      {aReconfirmer.length > 0 && (
        <div className="carte p-4 mt-4 flex items-center justify-between gap-3 flex-wrap bg-alerte/10 border-alerte/30">
          <p className="text-sm text-charbon flex items-center gap-2">
            <RefreshCcw size={16} className="text-alerte shrink-0" />
            <span><span className="font-semibold">{aReconfirmer.length} rendez-vous modifié{aReconfirmer.length > 1 ? 's' : ''} par un patient</span> — à reconfirmer ci-dessous.</span>
          </p>
        </div>
      )}

      {!detail?.valide_par_admin && (
        <div className="carte p-4 mt-4 flex items-center justify-between gap-3 flex-wrap bg-alerte/5 border-alerte/20">
          <p className="text-sm text-charbon">
            <span className="font-semibold">Compte non validé.</span> Complétez votre profil et
            envoyez votre justificatif d'exercice pour apparaître dans les recherches.
            {detail?.motif_rejet && <><br /><span className="font-semibold">Refusé :</span> {detail.motif_rejet}</>}
          </p>
          <Link to="/professionnel/profil" className="btn-primaire !py-2 !px-4 text-sm shrink-0">Compléter mon profil</Link>
        </div>
      )}

      {!aDesHoraires && (
        <div className="carte p-4 mt-4 flex items-center justify-between gap-3 flex-wrap bg-ambre/5 border-ambre/20">
          <p className="text-sm text-charbon">
            <span className="font-semibold">Aucune disponibilité renseignée.</span> Sans horaires,
            les patients ne peuvent pas prendre rendez-vous avec vous.
          </p>
          <Link to="/professionnel/horaires" className="btn-primaire !py-2 !px-4 text-sm shrink-0">Renseigner mes horaires</Link>
        </div>
      )}

      {enEssai && (
        <div className="carte p-4 mt-4 flex items-center justify-between bg-ocre/5 border-ocre/20">
          <p className="text-sm text-charbon">
            Il vous reste <span className="font-semibold">{joursEssai} jour{joursEssai > 1 ? 's' : ''}</span> d'essai gratuit.
            Souscrivez un abonnement pour continuer à apparaître dans les recherches.
          </p>
          <Link to="/professionnel/abonnement" className="btn-secondaire !py-2 !px-4 text-sm shrink-0">Voir les offres<PastilleLien compte={notifs['/professionnel/abonnement']} /></Link>
        </div>
      )}

      {abonnementActifBientotExpire !== null && abonnementActifBientotExpire <= 7 && (
        <div className="carte p-4 mt-4 flex items-center justify-between gap-3 flex-wrap bg-ocre/5 border-ocre/20">
          <p className="text-sm text-charbon">
            Votre abonnement expire dans <span className="font-semibold">{abonnementActifBientotExpire} jour{abonnementActifBientotExpire > 1 ? 's' : ''}</span>.
            Renouvelez pour ne pas être coupé des recherches.
          </p>
          <Link to="/professionnel/abonnement" className="btn-secondaire !py-2 !px-4 text-sm shrink-0">Renouveler<PastilleLien compte={notifs['/professionnel/abonnement']} /></Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <CarteStat label="Rendez-vous aujourd'hui" valeur={aujourdHui.length} accent="foret" Icone={CalendarDays} />
        <CarteStat label="En attente de réponse" valeur={enAttente.length + aReconfirmer.length} accent="ocre" Icone={BellRing} />
        <CarteStat label="Consultations réalisées" valeur={rdvs.filter(r => r.statut === 'termine').length} accent="ambre" Icone={ClipboardCheck} />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link to="/professionnel/profil" className="btn-fantome"><UserCog size={16} /> Modifier mon profil<PastilleLien compte={notifs['/professionnel/profil']} /></Link>
        <Link to="/professionnel/horaires" className="btn-fantome"><CalendarRange size={16} /> Gérer mes horaires</Link>
        <Link to="/professionnel/messagerie" className="btn-fantome"><MessageSquare size={16} /> Messagerie</Link>
        <Link to="/professionnel/trouver-expertise" className="btn-fantome"><Search size={16} /> Trouver une expertise</Link>
        <Link to="/professionnel/collaborations" className="btn-fantome"><Users size={16} /> Mes collaborations<PastilleLien compte={notifs['/professionnel/collaborations']} /></Link>
        <Link to="/professionnel/messagerie-confreres" className="btn-fantome"><Users size={16} /> Messagerie confrères<PastilleLien compte={messagesConfreresNonLus} /></Link>
        <Link to="/recherche-laboratoires" className="btn-fantome"><FlaskConical size={16} /> Trouver un laboratoire</Link>
        <Link to="/mes-analyses" className="btn-fantome"><FlaskConical size={16} /> Mes analyses<PastilleLien compte={notifs['/mes-analyses']} /></Link>
      </div>

      {aReconfirmer.length > 0 && (
        <>
          <h2 className="font-display font-semibold text-lg mt-10 mb-3">À reconfirmer (modifiés par le patient)</h2>
          <div className="space-y-3">
            {aReconfirmer.map(rdv => (
              <CarteRendezVous
                key={rdv.id}
                rdv={rdv}
                nomAffiche={`${rdv.patients?.prenom} ${rdv.patients?.nom}`}
                lienProfil={`/professionnel/patient/${rdv.patient_id}`}
                actions={(
                  <>
                    <Link to="/professionnel/messagerie" className="btn-fantome !py-2 !px-3 text-sm">Écrire</Link>
                    <button onClick={() => repondre(rdv.id, 'confirme')} className="btn-secondaire !py-2 !px-3 text-sm">Reconfirmer</button>
                    <button onClick={() => repondre(rdv.id, 'refuse')} className="btn-fantome !py-2 !px-3 text-sm">Refuser</button>
                  </>
                )}
              />
            ))}
          </div>
        </>
      )}

      {enAttente.length > 0 && (
        <>
          <h2 className="font-display font-semibold text-lg mt-10 mb-3">Nouvelles demandes</h2>
          <div className="space-y-3">
            {enAttente.map(rdv => (
              <CarteRendezVous
                key={rdv.id}
                rdv={rdv}
                nomAffiche={`${rdv.patients?.prenom} ${rdv.patients?.nom}`}
                lienProfil={`/professionnel/patient/${rdv.patient_id}`}
                actions={(
                  <>
                    <Link to="/professionnel/messagerie" className="btn-fantome !py-2 !px-3 text-sm">Écrire</Link>
                    <button onClick={() => repondre(rdv.id, 'confirme')} className="btn-secondaire !py-2 !px-3 text-sm">Confirmer</button>
                    <button onClick={() => repondre(rdv.id, 'refuse')} className="btn-fantome !py-2 !px-3 text-sm">Refuser</button>
                  </>
                )}
              />
            ))}
          </div>
        </>
      )}

      <h2 className="font-display font-semibold text-lg mt-10 mb-3">Prochains rendez-vous confirmés</h2>
      {aVenir.length === 0 ? (
        <p className="text-ardoise text-sm">Aucun rendez-vous à venir.</p>
      ) : (
        <div className="space-y-3">
          {aVenir.map(rdv => (
            <CarteRendezVous key={rdv.id} rdv={rdv} nomAffiche={`${rdv.patients?.prenom} ${rdv.patients?.nom}`}
                lienProfil={`/professionnel/patient/${rdv.patient_id}`}
                actions={(
                  <>
                    <Link to="/professionnel/messagerie" className="btn-fantome !py-2 !px-3 text-sm">Écrire</Link>
                    <button onClick={() => setRdvOuvert(rdv)} className="btn-secondaire !py-2 !px-3 text-sm">Rédiger le compte-rendu</button>
                  </>
                )} />
          ))}
        </div>
      )}

      {rdvOuvert && (
        <ModaleCompteRendu
          rdv={rdvOuvert}
          utilisateurId={utilisateur.id}
          onFerme={() => setRdvOuvert(null)}
          onTermine={() => { setRdvOuvert(null); charger() }}
        />
      )}

      {annulationsRecentes.length > 0 && (
        <>
          <h2 className="font-display font-semibold text-lg mt-10 mb-3">Annulations récentes</h2>
          <div className="space-y-3">
            {annulationsRecentes.map(rdv => (
              <CarteRendezVous key={rdv.id} rdv={rdv} nomAffiche={`${rdv.patients?.prenom} ${rdv.patients?.nom}`}
                  lienProfil={`/professionnel/patient/${rdv.patient_id}`} />
            ))}
          </div>
        </>
      )}

      <div className="text-right mt-4">
        <Link to="/professionnel/rendez-vous" className="text-sm text-foret font-semibold">Voir tout l'historique →<PastilleLien compte={notifs['/professionnel/rendez-vous']} /></Link>
      </div>
    </div>
  )
}
