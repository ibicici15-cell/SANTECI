import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, BellRing, ClipboardCheck, UserCog, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { televerserFichier } from '../lib/stockage'
import Loader from '../components/Loader'
import CarteStat from '../components/CarteStat'
import Badge from '../components/Badge'
import { formaterFCFA, libelleModeRetrait, libelleDelai, MODES_RETRAIT_LABO } from '../lib/constantes'
import PastilleLien from '../components/PastilleLien'
import useCompteNotifications from '../hooks/useCompteNotifications'
import { marquerLuParLien } from '../lib/notifications'

function joursRestants(dateIso) {
  const diff = new Date(dateIso) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function TableauDeBordLaboratoire() {
  const { utilisateur, detail, rafraichirProfil } = useAuth()
  const notifs = useCompteNotifications(utilisateur.id)
  useEffect(() => { marquerLuParLien(utilisateur.id, '/laboratoire/tableau-de-bord') }, [utilisateur.id])
  const [demandes, setDemandes] = useState([])
  const [abonnement, setAbonnement] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [demandeOuverte, setDemandeOuverte] = useState(null)
  const [reponse, setReponse] = useState({})
  const [demandeResultat, setDemandeResultat] = useState(null)
  const [fichierResultat, setFichierResultat] = useState(null)
  const [commentaireResultat, setCommentaireResultat] = useState('')
  const [envoiResultat, setEnvoiResultat] = useState(false)

  const charger = async () => {
    const [{ data: dem }, { data: abo }] = await Promise.all([
      supabase.from('demandes_analyse')
        .select('*, patients(nom, prenom), professionnels:demandeur_professionnel_id(nom, prenom), prestations_labo(nom_analyse)')
        .eq('labo_id', utilisateur.id).order('created_at', { ascending: false }),
      supabase.from('abonnements').select('*').eq('labo_id', utilisateur.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setDemandes(dem || [])
    setAbonnement(abo)
    setChargement(false)
    rafraichirProfil()
  }

  useEffect(() => { charger() }, [utilisateur.id])

  if (chargement) return <Loader />

  const enAttente = demandes.filter(d => d.statut === 'en_attente')
  const confirmees = demandes.filter(d => d.statut === 'confirme')
  const enEssai = abonnement?.statut === 'essai'
  const joursEssai = abonnement ? joursRestants(abonnement.date_fin_essai) : 0

  const nomDemandeur = (d) => d.patients ? `${d.patients.prenom} ${d.patients.nom} (patient)` : `${d.professionnels?.prenom} ${d.professionnels?.nom} (professionnel)`

  const ouvrirReponse = (d) => {
    setDemandeOuverte(d)
    const maintenant = new Date()
    const traitement = new Date(maintenant.getTime() + (d.delai_heures || 24) * 60 * 60 * 1000)
    setReponse({
      montant: d.montant || '',
      moyen_paiement: d.moyen_paiement || '',
      mode_retrait: d.mode_retrait || 'sur_place',
      date_traitement_prevue: traitement.toISOString().slice(0, 16),
      commentaire_labo: '',
    })
  }

  const livrerResultat = async () => {
    if (!fichierResultat) return
    setEnvoiResultat(true)
    try {
      const { chemin } = await televerserFichier('resultats-analyses', fichierResultat, demandeResultat.id)
      await supabase.from('demandes_analyse').update({
        fichier_resultat: chemin,
        statut: 'termine',
        commentaire_labo: commentaireResultat.trim() || null,
      }).eq('id', demandeResultat.id)
      setDemandeResultat(null)
      setFichierResultat(null)
      setCommentaireResultat('')
      charger()
    } finally {
      setEnvoiResultat(false)
    }
  }

  const confirmer = async () => {
    await supabase.from('demandes_analyse').update({
      statut: 'confirme',
      montant: reponse.montant ? Number(reponse.montant) : null,
      moyen_paiement: reponse.moyen_paiement || null,
      mode_retrait: reponse.mode_retrait,
      date_traitement_prevue: reponse.date_traitement_prevue ? new Date(reponse.date_traitement_prevue).toISOString() : null,
      commentaire_labo: reponse.commentaire_labo || null,
    }).eq('id', demandeOuverte.id)
    setDemandeOuverte(null)
    charger()
  }

  const refuser = async (id) => {
    await supabase.from('demandes_analyse').update({ statut: 'refuse' }).eq('id', id)
    charger()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-charbon">{detail?.nom}</h1>
        <Badge statut={abonnement?.statut || 'essai'} />
      </div>

      {!detail?.valide_par_admin && (
        <div className="carte p-4 mt-4 bg-alerte/5 border-alerte/20">
          <p className="text-sm text-charbon">
            <span className="font-semibold">Compte non validé.</span> Complétez votre profil et
            envoyez votre justificatif pour apparaître dans les recherches.
            {detail?.motif_rejet && <><br /><span className="font-semibold">Refusé :</span> {detail.motif_rejet}</>}
          </p>
        </div>
      )}

      {enEssai && (
        <div className="carte p-4 mt-4 flex items-center justify-between bg-ocre/5 border-ocre/20">
          <p className="text-sm text-charbon">
            Il vous reste <span className="font-semibold">{joursEssai} jour{joursEssai > 1 ? 's' : ''}</span> d'essai gratuit.
            Souscrivez un abonnement pour continuer à apparaître dans les recherches.
          </p>
          <Link to="/laboratoire/abonnement" className="btn-secondaire !py-2 !px-4 text-sm shrink-0">Voir les offres<PastilleLien compte={notifs['/laboratoire/abonnement']} /></Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <CarteStat label="Demandes en attente" valeur={enAttente.length} accent="ocre" Icone={BellRing} />
        <CarteStat label="En cours de traitement" valeur={confirmees.length} accent="foret" Icone={FlaskConical} />
        <CarteStat label="Analyses terminées" valeur={demandes.filter(d => d.statut === 'termine').length} accent="ambre" Icone={ClipboardCheck} />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link to="/laboratoire/profil" className="btn-fantome"><UserCog size={16} /> Modifier mon profil</Link>
        <Link to="/laboratoire/messagerie" className="btn-fantome"><MessageSquare size={16} /> Messagerie</Link>
      </div>

      <h2 className="font-display font-semibold text-lg mt-10 mb-3">Demandes en attente</h2>
      <div className="space-y-3">
        {enAttente.length === 0 && <p className="text-ardoise text-sm">Aucune demande en attente.</p>}
        {enAttente.map(d => (
          <div key={d.id} className="carte p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium">{nomDemandeur(d)}</p>
                <p className="text-sm text-ardoise">{d.prestations_labo?.nom_analyse || 'Demande de devis libre'}</p>
              </div>
              <Badge statut="en_attente" />
            </div>
            {d.description && <p className="text-sm text-charbon mt-2">{d.description}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => ouvrirReponse(d)} className="btn-secondaire !py-2 !px-4 text-sm">Confirmer</button>
              <button onClick={() => refuser(d.id)} className="btn-fantome !py-2 !px-4 text-sm">Refuser</button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display font-semibold text-lg mt-10 mb-3">En cours de traitement</h2>
      <div className="space-y-3">
        {confirmees.length === 0 && <p className="text-ardoise text-sm">Aucune analyse en cours.</p>}
        {confirmees.map(d => (
          <div key={d.id} className="carte p-4">
            <p className="font-medium">{nomDemandeur(d)}</p>
            <p className="text-sm text-ardoise">
              {d.prestations_labo?.nom_analyse || 'Devis'} · {formaterFCFA(d.montant)} · livraison prévue {d.date_livraison_prevue ? new Date(d.date_livraison_prevue).toLocaleDateString('fr-FR') : '—'}
            </p>
            <button onClick={() => { setDemandeResultat(d); setCommentaireResultat('') }} className="btn-secondaire !py-2 !px-4 text-sm mt-3">Livrer le résultat</button>
          </div>
        ))}
      </div>

      {demandeResultat && (
        <div className="fixed inset-0 bg-charbon/40 flex items-center justify-center p-4 z-50">
          <div className="carte p-6 max-w-md w-full">
            <h2 className="font-display font-semibold text-lg mb-4">Livrer le résultat</h2>
            <label className="etiquette">Fichier (PDF ou image)</label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setFichierResultat(e.target.files?.[0] || null)} className="text-sm" />
            <label className="etiquette mt-3">Commentaire (facultatif)</label>
            <textarea rows={2} className="champ" placeholder="Ex : à corréler avec la clinique, valeur limite à recontrôler…"
              value={commentaireResultat} onChange={e => setCommentaireResultat(e.target.value)} />
            <div className="flex gap-3 mt-5">
              <button onClick={livrerResultat} disabled={!fichierResultat || envoiResultat} className="btn-primaire flex-1">
                {envoiResultat ? 'Envoi…' : 'Livrer et clôturer'}
              </button>
              <button onClick={() => { setDemandeResultat(null); setCommentaireResultat('') }} className="btn-fantome">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {demandeOuverte && (
        <div className="fixed inset-0 bg-charbon/40 flex items-center justify-center p-4 z-50">
          <div className="carte p-6 max-w-md w-full">
            <h2 className="font-display font-semibold text-lg mb-1">Confirmer la demande</h2>
            <p className="text-sm text-ardoise mb-4">
              Les valeurs ci-dessous sont pré-remplies depuis votre catalogue si applicable —
              ajustez si besoin (charge de travail, etc.).
            </p>
            <div className="space-y-3">
              <div><label className="etiquette">Montant (FCFA)</label>
                <input type="number" className="champ" value={reponse.montant} onChange={e => setReponse(r => ({ ...r, montant: e.target.value }))} /></div>
              <div><label className="etiquette">Mode de retrait</label>
                <select className="champ" value={reponse.mode_retrait} onChange={e => setReponse(r => ({ ...r, mode_retrait: e.target.value }))}>
                  {MODES_RETRAIT_LABO.map(m => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
                </select></div>
              <div><label className="etiquette">Date de traitement prévue</label>
                <input type="datetime-local" className="champ" value={reponse.date_traitement_prevue} onChange={e => setReponse(r => ({ ...r, date_traitement_prevue: e.target.value }))} /></div>
              <div><label className="etiquette">Commentaire (facultatif)</label>
                <textarea rows={2} className="champ" value={reponse.commentaire_labo} onChange={e => setReponse(r => ({ ...r, commentaire_labo: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={confirmer} className="btn-primaire flex-1">Confirmer la demande</button>
              <button onClick={() => setDemandeOuverte(null)} className="btn-fantome">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
