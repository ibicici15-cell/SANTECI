import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formaterFCFA, libelleDelai, libelleModeRetrait, MODES_RETRAIT_LABO } from '../lib/constantes'
import Loader from '../components/Loader'

export default function DemanderAnalyse() {
  const { laboId } = useParams()
  const [params] = useSearchParams()
  const prestationIdInitiale = params.get('prestation')
  const { utilisateur, role } = useAuth()
  const navigate = useNavigate()

  const [labo, setLabo] = useState(null)
  const [catalogue, setCatalogue] = useState([])
  const [prestation, setPrestation] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [description, setDescription] = useState('')
  const [modeRetraitChoisi, setModeRetraitChoisi] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)

  useEffect(() => {
    (async () => {
      const [{ data: laboData }, { data: catalogueData }] = await Promise.all([
        supabase.from('laboratoires').select('*').eq('id', laboId).maybeSingle(),
        supabase.from('prestations_labo').select('*').eq('labo_id', laboId).order('nom_analyse'),
      ])
      setLabo(laboData)
      setCatalogue(catalogueData || [])

      if (prestationIdInitiale) {
        const trouvee = (catalogueData || []).find(p => p.id === prestationIdInitiale)
        setPrestation(trouvee || null)
        if (trouvee?.mode_retrait && trouvee.mode_retrait !== 'les_deux') setModeRetraitChoisi(trouvee.mode_retrait)
      }
      setChargement(false)
    })()
  }, [laboId, prestationIdInitiale])

  const choisirPrestation = (id) => {
    if (!id) { setPrestation(null); setModeRetraitChoisi(''); return }
    const trouvee = catalogue.find(p => p.id === id)
    setPrestation(trouvee || null)
    setModeRetraitChoisi(trouvee?.mode_retrait && trouvee.mode_retrait !== 'les_deux' ? trouvee.mode_retrait : '')
  }

  if (chargement) return <Loader />
  if (!labo) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-ardoise">Laboratoire introuvable.</div>
  if (!labo.valide_par_admin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-ardoise">Ce laboratoire est en attente de validation.</p>
        <Link to="/recherche-laboratoires" className="text-foret font-semibold">Retour à la recherche</Link>
      </div>
    )
  }

  // Le mode de retrait doit être précisé par le demandeur si la prestation
  // propose "les deux, au choix" — ou, en devis libre, s'il a une préférence.
  const modeRetraitARenseigner = prestation ? prestation.mode_retrait === 'les_deux' : true

  const soumettre = async (e) => {
    e.preventDefault()
    setErreur('')
    if (!prestation && !description.trim()) {
      setErreur('Décrivez votre besoin (demande de devis).')
      return
    }
    if (prestation?.mode_retrait === 'les_deux' && !modeRetraitChoisi) {
      setErreur('Précisez votre mode de retrait souhaité.')
      return
    }
    setEnvoi(true)

    const { error } = await supabase.from('demandes_analyse').insert({
      labo_id: labo.id,
      demandeur_patient_id: role === 'patient' ? utilisateur.id : null,
      demandeur_professionnel_id: role === 'professionnel' ? utilisateur.id : null,
      prestation_id: prestation?.id || null,
      description: description || (prestation ? null : ''),
      montant: prestation?.prix || null,
      moyen_paiement: prestation?.moyens_paiement?.[0] || null,
      mode_retrait: modeRetraitChoisi || null,
      delai_heures: prestation?.delai_heures || null,
    })

    setEnvoi(false)
    if (error) { setErreur(error.message); return }

    // Crée automatiquement la conversation avec ce laboratoire
    const conflitColonne = role === 'patient' ? 'labo_id,demandeur_patient_id' : 'labo_id,demandeur_professionnel_id'
    await supabase.from('conversations_labo').upsert({
      labo_id: labo.id,
      demandeur_patient_id: role === 'patient' ? utilisateur.id : null,
      demandeur_professionnel_id: role === 'professionnel' ? utilisateur.id : null,
    }, { onConflict: conflitColonne, ignoreDuplicates: true })

    setSucces(true)
    setTimeout(() => navigate(role === 'patient' ? '/patient/tableau-de-bord' : '/professionnel/tableau-de-bord'), 1800)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-charbon">Demander une analyse</h1>
      <p className="text-ardoise text-sm mt-1">avec {labo.nom} — {labo.ville}</p>

      {succes ? (
        <div className="carte p-6 mt-6 text-center">
          <p className="font-display font-semibold text-lg text-foret">Demande envoyée !</p>
          <p className="text-ardoise text-sm mt-1">Le laboratoire confirmera prochainement, avec les dates de traitement.</p>
        </div>
      ) : (
        <form onSubmit={soumettre} className="carte p-6 mt-6 space-y-4">
          {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreur}</p>}

          {catalogue.length > 0 && (
            <div>
              <label className="etiquette">Choisir une analyse dans le catalogue (facultatif)</label>
              <select className="champ" value={prestation?.id || ''} onChange={e => choisirPrestation(e.target.value)}>
                <option value="">— Devis libre / autre besoin —</option>
                {catalogue.map(p => (
                  <option key={p.id} value={p.id}>{p.nom_analyse} — {formaterFCFA(p.prix)}</option>
                ))}
              </select>
            </div>
          )}

          {prestation ? (
            <div className="bg-foret-light rounded-lg p-4">
              <p className="font-medium">{prestation.nom_analyse}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white">{libelleDelai(prestation.delai_heures)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white">{libelleModeRetrait(prestation.mode_retrait)}</span>
                </div>
                <p className="font-donnee font-semibold">{formaterFCFA(prestation.prix)}</p>
              </div>
              <p className="text-xs text-ardoise mt-2">
                Ces informations sont déjà connues du laboratoire — il n'a plus qu'à confirmer les dates.
              </p>
            </div>
          ) : (
            <p className="text-sm text-ardoise bg-charbon/5 rounded-lg px-3 py-2">
              Aucune prestation précise sélectionnée : ceci sera traité comme une <strong>demande de devis</strong>,
              le laboratoire vous répondra avec son tarif et ses modalités.
            </p>
          )}

          {modeRetraitARenseigner && (
            <div>
              <label className="etiquette">
                {prestation ? 'Ce laboratoire propose les deux — quel est votre choix ?' : 'Mode de retrait souhaité (facultatif)'}
              </label>
              <div className="flex gap-2">
                {MODES_RETRAIT_LABO.filter(m => m.valeur !== 'les_deux').map(m => (
                  <button type="button" key={m.valeur} onClick={() => setModeRetraitChoisi(m.valeur)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${modeRetraitChoisi === m.valeur ? 'border-foret bg-foret-light text-foret-dark' : 'border-ligne text-ardoise'}`}>
                    {m.libelle}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="etiquette">
              {prestation ? 'Précision complémentaire (facultatif)' : 'Décrivez votre besoin'}
            </label>
            <textarea rows={4} className="champ" required={!prestation}
              placeholder={prestation ? '' : 'Ex : analyse de sang complète avec bilan lipidique, pour un adulte de 40 ans.'}
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <button disabled={envoi} className="btn-primaire w-full">
            {envoi ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </form>
      )}
    </div>
  )
}
