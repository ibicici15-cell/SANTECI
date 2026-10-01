import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Stethoscope, Building2, Hourglass, ShieldCheck, TriangleAlert, FlaskConical } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { urlSignee } from '../lib/stockage'
import Loader from '../components/Loader'
import CarteStat from '../components/CarteStat'
import SectionRepliable from '../components/SectionRepliable'
import { libelleSpecialite, formaterFCFA, libelleOperateur } from '../lib/constantes'

const OPERATEURS_VALEURS = ['mtn_money', 'orange_money', 'wave']

// Barre recherche + tri, réutilisée pour chaque section de la page
function BarreTriEtRecherche({ recherche, onRecherche, tri, onTri, optionsTri }) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <input placeholder="Rechercher…" className="champ flex-1 min-w-[180px]" value={recherche} onChange={e => onRecherche(e.target.value)} />
      <select className="champ !w-52" value={tri} onChange={e => onTri(e.target.value)}>
        {optionsTri.map(o => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
      </select>
    </div>
  )
}

const OPTIONS_TRI_NOM = [
  { valeur: 'recent', libelle: 'Plus récent d\'abord' },
  { valeur: 'nom', libelle: 'Nom (A → Z)' },
]

export default function TableauDeBordAdmin() {
  const [stats, setStats] = useState(null)
  const [enAttenteValidation, setEnAttenteValidation] = useState([])
  const [professionnelsValides, setProfessionnelsValides] = useState([])
  const [labosEnAttente, setLabosEnAttente] = useState([])
  const [labosValides, setLabosValides] = useState([])
  const [paiementsManuels, setPaiementsManuels] = useState([])
  const [chargement, setChargement] = useState(true)
  const [enTraitement, setEnTraitement] = useState(null)
  const [erreur, setErreur] = useState('')
  const [messageSucces, setMessageSucces] = useState('')

  // Recherche + tri, un jeu d'état par section
  const [rechPaiements, setRechPaiements] = useState('')
  const [rechProAttente, setRechProAttente] = useState('')
  const [triProAttente, setTriProAttente] = useState('recent')
  const [rechLaboAttente, setRechLaboAttente] = useState('')
  const [triLaboAttente, setTriLaboAttente] = useState('recent')
  const [rechProValides, setRechProValides] = useState('')
  const [triProValides, setTriProValides] = useState('nom')
  const [rechLaboValides, setRechLaboValides] = useState('')
  const [triLaboValides, setTriLaboValides] = useState('nom')

  const charger = async () => {
    setErreur('')
    const [patients, pros, etabs, labosCount, essais, actifs, signalements, aValider, valides, laboAttente, laboValides, aVerifier] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }),
      supabase.from('professionnels').select('*', { count: 'exact', head: true }),
      supabase.from('etablissements').select('*', { count: 'exact', head: true }),
      supabase.from('laboratoires').select('*', { count: 'exact', head: true }),
      supabase.from('abonnements').select('*', { count: 'exact', head: true }).eq('statut', 'essai'),
      supabase.from('abonnements').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
      supabase.from('signalements').select('*', { count: 'exact', head: true }).eq('statut', 'ouvert'),
      supabase.from('professionnels').select('*').eq('valide_par_admin', false),
      supabase.from('professionnels').select('*').eq('valide_par_admin', true),
      supabase.from('laboratoires').select('*').eq('valide_par_admin', false),
      supabase.from('laboratoires').select('*').eq('valide_par_admin', true),
      supabase.from('paiements').select('*, professionnels(nom, prenom), laboratoires(nom)')
        .eq('statut', 'en_attente').in('moyen_paiement', OPERATEURS_VALEURS),
    ])
    setStats({
      patients: patients.count || 0,
      pros: pros.count || 0,
      etabs: etabs.count || 0,
      labos: labosCount.count || 0,
      essais: essais.count || 0,
      actifs: actifs.count || 0,
      signalements: signalements.count || 0,
    })
    setEnAttenteValidation(aValider.data || [])
    setProfessionnelsValides(valides.data || [])
    setLabosEnAttente(laboAttente.data || [])
    setLabosValides(laboValides.data || [])
    setPaiementsManuels(aVerifier.data || [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  const voirJustificatif = async (entite) => {
    if (!entite.document_justificatif_url) {
      alert("Aucun document justificatif téléversé pour le moment.")
      return
    }
    const url = await urlSignee('verification-professionnels', entite.document_justificatif_url)
    if (url) window.open(url, '_blank')
    else alert("Impossible d'ouvrir le document.")
  }

  const valider = async (table, id, nomAffiche) => {
    setEnTraitement(id)
    setErreur('')
    const { error, data } = await supabase.from(table).update({ valide_par_admin: true, motif_rejet: null }).eq('id', id).select()
    if (error || !data || data.length === 0) {
      setEnTraitement(null)
      setErreur(error?.message || "La validation a échoué (aucune ligne modifiée).")
      return
    }
    await charger()
    setEnTraitement(null)
    setMessageSucces(`${nomAffiche} a été validé avec succès.`)
    setTimeout(() => setMessageSucces(''), 4000)
  }

  const refuser = async (table, id) => {
    const motif = window.prompt("Raison du refus (optionnel — sera visible par le compte concerné) :", '')
    if (motif === null) return
    setEnTraitement(id)
    setErreur('')
    const { error, data } = await supabase.from(table)
      .update({ valide_par_admin: false, document_justificatif_url: null, motif_rejet: motif || null }).eq('id', id).select()
    if (error || !data || data.length === 0) {
      setEnTraitement(null)
      setErreur(error?.message || "Le refus n'a pas pu être enregistré.")
      return
    }
    await charger()
    setEnTraitement(null)
  }

  const retirerValidation = async (table, entite, nomAffiche) => {
    const motif = window.prompt(`Retirer la validation de ${nomAffiche} — il n'apparaîtra plus dans les recherches. Raison (optionnel) :`, '')
    if (motif === null) return
    setEnTraitement(entite.id)
    setErreur('')
    const { error, data } = await supabase.from(table)
      .update({ valide_par_admin: false, motif_rejet: motif || null }).eq('id', entite.id).select()
    if (error || !data || data.length === 0) {
      setEnTraitement(null)
      setErreur(error?.message || "La révocation a échoué.")
      return
    }
    await charger()
    setEnTraitement(null)
  }

  const confirmerPaiementManuel = async (paiement) => {
    setEnTraitement(paiement.id)
    setErreur('')
    try {
      const { data: { user }, error: erreurUser } = await supabase.auth.getUser()
      if (erreurUser || !user) throw new Error(erreurUser?.message || "Session expirée, reconnectez-vous et réessayez.")

      const debut = new Date()
      const fin = new Date()
      fin.setMonth(fin.getMonth() + (paiement.plan === 'annuel' ? 12 : 1))

      const { error: erreurPaiement, data: donneesPaiement } = await supabase.from('paiements').update({
        statut: 'reussi', confirme_par: user.id, confirme_le: new Date().toISOString(),
      }).eq('id', paiement.id).select()
      if (erreurPaiement) throw new Error(erreurPaiement.message)
      if (!donneesPaiement || donneesPaiement.length === 0) {
        throw new Error("La mise à jour du paiement n'a rien modifié (droits insuffisants ou paiement déjà traité).")
      }

      const { error: erreurAbo, data: donneesAbo } = await supabase.from('abonnements').update({
        statut: 'actif', plan: paiement.plan,
        date_debut_abonnement: debut.toISOString(), date_fin_abonnement: fin.toISOString(), montant: paiement.montant,
      }).eq('id', paiement.abonnement_id).select()
      if (erreurAbo) throw new Error(erreurAbo.message)
      if (!donneesAbo || donneesAbo.length === 0) {
        throw new Error("La mise à jour de l'abonnement n'a rien modifié.")
      }

      if (paiement.professionnel_id) {
        const { error: e } = await supabase.from('professionnels').update({ actif: true }).eq('id', paiement.professionnel_id)
        if (e) throw new Error(e.message)
      }
      if (paiement.labo_id) {
        const { error: e } = await supabase.from('laboratoires').update({ actif: true }).eq('id', paiement.labo_id)
        if (e) throw new Error(e.message)
      }

      setMessageSucces('Paiement confirmé et abonnement activé.')
      setTimeout(() => setMessageSucces(''), 4000)
      await charger()
    } catch (err) {
      setErreur('La confirmation a échoué : ' + err.message)
    } finally {
      setEnTraitement(null)
    }
  }

  if (chargement) return <Loader />

  // Filtre + trie une liste de pros/labos selon la recherche texte et le tri choisi
  const filtrerEtTrier = (liste, recherche, tri, nomFn) => {
    const texte = recherche.toLowerCase()
    const filtres = liste.filter(item => !texte || nomFn(item).toLowerCase().includes(texte))
    return [...filtres].sort((a, b) => {
      if (tri === 'nom') return nomFn(a).localeCompare(nomFn(b))
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }

  const nomPro = (p) => `${p.prenom} ${p.nom} ${p.ville} ${p.specialite}`
  const nomLabo = (l) => `${l.nom} ${l.ville}`

  const proAttenteFiltres = filtrerEtTrier(enAttenteValidation, rechProAttente, triProAttente, nomPro)
  const laboAttenteFiltres = filtrerEtTrier(labosEnAttente, rechLaboAttente, triLaboAttente, nomLabo)
  const proValidesFiltres = filtrerEtTrier(professionnelsValides, rechProValides, triProValides, nomPro)
  const laboValidesFiltres = filtrerEtTrier(labosValides, rechLaboValides, triLaboValides, nomLabo)
  const paiementsFiltres = paiementsManuels.filter(p => {
    const texte = rechPaiements.toLowerCase()
    const nom = p.professionnels ? `${p.professionnels.prenom} ${p.professionnels.nom}` : p.laboratoires?.nom || ''
    return !texte || nom.toLowerCase().includes(texte) || p.reference_transaction?.toLowerCase().includes(texte)
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Administration Santé-CI</h1>

      {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2 mt-4">{erreur}</p>}
      {messageSucces && <p className="text-sm text-foret bg-foret-light rounded-lg px-3 py-2 mt-4">✓ {messageSucces}</p>}

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <CarteStat label="Patients inscrits" valeur={stats.patients} accent="foret" Icone={Users} />
        <CarteStat label="Professionnels" valeur={stats.pros} accent="ambre" Icone={Stethoscope} />
        <CarteStat label="Laboratoires" valeur={stats.labos} accent="ocre" Icone={FlaskConical} />
        <CarteStat label="Établissements" valeur={stats.etabs} accent="ocre" Icone={Building2} />
        <CarteStat label="Essais gratuits en cours" valeur={stats.essais} accent="ocre" Icone={Hourglass} />
        <CarteStat label="Abonnements actifs" valeur={stats.actifs} accent="foret" Icone={ShieldCheck} />
      </div>
      {stats.signalements > 0 && (
        <div className="mt-4">
          <CarteStat label="Signalements ouverts" valeur={stats.signalements} accent="ambre" Icone={TriangleAlert} />
        </div>
      )}

      <SectionRepliable titre="Paiements par transfert à vérifier" compte={paiementsManuels.length} defautOuvert={paiementsManuels.length > 0}>
        <p className="text-ardoise text-sm mb-3">
          Vérifiez sur votre compte Mobile Money qu'un transfert de ce montant a bien été reçu, avec cette référence, avant de confirmer.
        </p>
        {paiementsManuels.length > 3 && (
          <div className="mb-3"><input placeholder="Rechercher par nom ou référence…" className="champ" value={rechPaiements} onChange={e => setRechPaiements(e.target.value)} /></div>
        )}
        <div className="space-y-2">
          {paiementsFiltres.length === 0 && <p className="text-ardoise text-sm">Aucun paiement en attente de vérification.</p>}
          {paiementsFiltres.map(p => (
            <div key={p.id} className="carte p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{p.professionnels ? `Dr ${p.professionnels.prenom} ${p.professionnels.nom}` : p.laboratoires?.nom} — Plan {p.plan}</p>
                <p className="text-sm text-ardoise">{formaterFCFA(p.montant)} · {libelleOperateur(p.moyen_paiement)} · depuis <span className="font-donnee">{p.telephone_emetteur}</span></p>
                <p className="text-sm text-ardoise">Référence : <span className="font-donnee">{p.reference_transaction}</span></p>
              </div>
              <button onClick={() => confirmerPaiementManuel(p)} disabled={enTraitement === p.id} className="btn-secondaire !py-2 !px-4 text-sm shrink-0">
                {enTraitement === p.id ? 'Confirmation…' : 'Confirmer la réception'}
              </button>
            </div>
          ))}
        </div>
      </SectionRepliable>

      <SectionRepliable titre="Professionnels en attente de validation" compte={enAttenteValidation.length} defautOuvert={enAttenteValidation.length > 0}>
        {enAttenteValidation.length > 3 && (
          <BarreTriEtRecherche recherche={rechProAttente} onRecherche={setRechProAttente} tri={triProAttente} onTri={setTriProAttente} optionsTri={OPTIONS_TRI_NOM} />
        )}
        <div className="space-y-2">
          {proAttenteFiltres.length === 0 && <p className="text-ardoise text-sm">Aucun compte en attente.</p>}
          {proAttenteFiltres.map(p => (
            <div key={p.id} className="carte p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to={`/professionnel/${p.id}`} target="_blank" className="font-medium hover:text-foret">Dr {p.prenom} {p.nom}</Link>
                <p className="text-sm text-ardoise">{libelleSpecialite(p.specialite)} · {p.ville} · N° {p.numero_autorisation}</p>
                {p.motif_rejet && <p className="text-xs text-alerte mt-1">Précédemment refusé : {p.motif_rejet}</p>}
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                {p.document_justificatif_url ? (
                  <>
                    <button onClick={() => voirJustificatif(p)} className="btn-fantome !py-2 !px-4 text-sm">Voir le justificatif</button>
                    <button onClick={() => refuser('professionnels', p.id)} disabled={enTraitement === p.id} className="btn-fantome !py-2 !px-4 text-sm text-alerte">Refuser</button>
                    <button onClick={() => valider('professionnels', p.id, `Dr ${p.prenom} ${p.nom}`)} disabled={enTraitement === p.id} className="btn-secondaire !py-2 !px-4 text-sm">
                      {enTraitement === p.id ? 'Validation…' : 'Valider'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-charbon/8 text-ardoise font-medium">En attente du document justificatif</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionRepliable>

      <SectionRepliable titre="Laboratoires en attente de validation" compte={labosEnAttente.length} defautOuvert={labosEnAttente.length > 0}>
        {labosEnAttente.length > 3 && (
          <BarreTriEtRecherche recherche={rechLaboAttente} onRecherche={setRechLaboAttente} tri={triLaboAttente} onTri={setTriLaboAttente} optionsTri={OPTIONS_TRI_NOM} />
        )}
        <div className="space-y-2">
          {laboAttenteFiltres.length === 0 && <p className="text-ardoise text-sm">Aucun compte en attente.</p>}
          {laboAttenteFiltres.map(l => (
            <div key={l.id} className="carte p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to={`/laboratoire/${l.id}`} target="_blank" className="font-medium hover:text-foret">{l.nom}</Link>
                <p className="text-sm text-ardoise">{l.ville}</p>
                {l.motif_rejet && <p className="text-xs text-alerte mt-1">Précédemment refusé : {l.motif_rejet}</p>}
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                {l.document_justificatif_url ? (
                  <>
                    <button onClick={() => voirJustificatif(l)} className="btn-fantome !py-2 !px-4 text-sm">Voir le justificatif</button>
                    <button onClick={() => refuser('laboratoires', l.id)} disabled={enTraitement === l.id} className="btn-fantome !py-2 !px-4 text-sm text-alerte">Refuser</button>
                    <button onClick={() => valider('laboratoires', l.id, l.nom)} disabled={enTraitement === l.id} className="btn-secondaire !py-2 !px-4 text-sm">
                      {enTraitement === l.id ? 'Validation…' : 'Valider'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-charbon/8 text-ardoise font-medium">En attente du document justificatif</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionRepliable>

      <SectionRepliable titre="Professionnels validés" compte={professionnelsValides.length}>
        <BarreTriEtRecherche recherche={rechProValides} onRecherche={setRechProValides} tri={triProValides} onTri={setTriProValides} optionsTri={OPTIONS_TRI_NOM} />
        <div className="space-y-2">
          {proValidesFiltres.length === 0 && <p className="text-ardoise text-sm">Aucun résultat.</p>}
          {proValidesFiltres.map(p => (
            <div key={p.id} className="carte p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to={`/professionnel/${p.id}`} target="_blank" className="font-medium hover:text-foret">Dr {p.prenom} {p.nom}</Link>
                <p className="text-sm text-ardoise">{libelleSpecialite(p.specialite)} · {p.ville}</p>
              </div>
              <button onClick={() => retirerValidation('professionnels', p, `Dr ${p.prenom} ${p.nom}`)} disabled={enTraitement === p.id} className="btn-fantome !py-2 !px-4 text-sm text-alerte shrink-0">
                {enTraitement === p.id ? 'Traitement…' : 'Retirer la validation'}
              </button>
            </div>
          ))}
        </div>
      </SectionRepliable>

      <SectionRepliable titre="Laboratoires validés" compte={labosValides.length}>
        <BarreTriEtRecherche recherche={rechLaboValides} onRecherche={setRechLaboValides} tri={triLaboValides} onTri={setTriLaboValides} optionsTri={OPTIONS_TRI_NOM} />
        <div className="space-y-2">
          {laboValidesFiltres.length === 0 && <p className="text-ardoise text-sm">Aucun résultat.</p>}
          {laboValidesFiltres.map(l => (
            <div key={l.id} className="carte p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to={`/laboratoire/${l.id}`} target="_blank" className="font-medium hover:text-foret">{l.nom}</Link>
                <p className="text-sm text-ardoise">{l.ville}</p>
              </div>
              <button onClick={() => retirerValidation('laboratoires', l, l.nom)} disabled={enTraitement === l.id} className="btn-fantome !py-2 !px-4 text-sm text-alerte shrink-0">
                {enTraitement === l.id ? 'Traitement…' : 'Retirer la validation'}
              </button>
            </div>
          ))}
        </div>
      </SectionRepliable>
    </div>
  )
}
