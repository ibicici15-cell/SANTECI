import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import { formaterFCFA, PLANS_ABONNEMENT, OPERATEURS_MOBILE_MONEY, NOM_BENEFICIAIRE_PLATEFORME } from '../lib/constantes'
import { marquerLuParLien } from '../lib/notifications'

function joursRestants(dateIso) {
  return Math.max(0, Math.ceil((new Date(dateIso) - new Date()) / (1000 * 60 * 60 * 24)))
}

export default function AbonnementLaboratoire() {
  const { utilisateur, profile } = useAuth()
  const [abonnement, setAbonnement] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [planChoisi, setPlanChoisi] = useState(null)
  const [operateur, setOperateur] = useState('')
  const [reference, setReference] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [declarationEnvoyee, setDeclarationEnvoyee] = useState(false)
  const [erreur, setErreur] = useState('')

  const charger = async () => {
    const { data } = await supabase.from('abonnements').select('*').eq('labo_id', utilisateur.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setAbonnement(data)
    setChargement(false)
  }

  useEffect(() => { charger() }, [utilisateur.id])
  useEffect(() => { marquerLuParLien(utilisateur.id, '/laboratoire/abonnement') }, [utilisateur.id])

  const choisirPlan = (plan) => {
    setPlanChoisi(plan)
    setDeclarationEnvoyee(false)
    setErreur('')
    setOperateur('')
    setReference('')
  }

  const declarerPaiement = async (e) => {
    e.preventDefault()
    setErreur('')
    if (!profile?.telephone) { setErreur("Renseignez d'abord votre numéro de téléphone."); return }
    if (!operateur) { setErreur('Choisissez l\'opérateur utilisé.'); return }
    if (!reference.trim()) { setErreur('Indiquez la référence de la transaction.'); return }

    setEnvoi(true)
    const { error } = await supabase.from('paiements').insert({
      type_paiement: 'abonnement',
      abonnement_id: abonnement.id,
      labo_id: utilisateur.id,
      montant: planChoisi.prix,
      moyen_paiement: operateur,
      telephone_emetteur: profile.telephone,
      reference_transaction: reference.trim(),
      plan: planChoisi.id,
      statut: 'en_attente',
    })
    setEnvoi(false)
    if (error) { setErreur(error.message); return }
    setDeclarationEnvoyee(true)
  }

  if (chargement) return <Loader />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Mon abonnement</h1>

      <div className="carte p-5 mt-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-ardoise">Statut actuel</p>
          <p className="font-display font-semibold text-lg mt-1">
            {abonnement?.statut === 'actif' && abonnement?.plan ? `Plan ${abonnement.plan}` : 'Période d\'essai'}
          </p>
          {abonnement?.statut === 'essai' && <p className="text-sm text-ardoise mt-1">Il reste {joursRestants(abonnement.date_fin_essai)} jour(s) d'essai.</p>}
        </div>
        <Badge statut={abonnement?.statut || 'essai'} />
      </div>

      {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2 mt-4">{erreur}</p>}

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {PLANS_ABONNEMENT.map(plan => (
          <div key={plan.id} className={`carte p-6 ${planChoisi?.id === plan.id ? 'border-foret ring-1 ring-foret' : ''}`}>
            <p className="font-display font-semibold text-lg">{plan.libelle}</p>
            <p className="font-donnee text-3xl font-semibold text-foret mt-2">
              {formaterFCFA(plan.prix)} <span className="text-sm text-ardoise font-normal">{plan.periode}</span>
            </p>
            {plan.avantage && <p className="text-xs text-ambre-dark font-semibold mt-1">{plan.avantage}</p>}
            <button onClick={() => choisirPlan(plan)} className="btn-primaire w-full mt-5">Choisir ce plan</button>
          </div>
        ))}
      </div>

      {planChoisi && !declarationEnvoyee && (
        <div className="carte p-6 mt-6">
          <p className="font-display font-semibold text-lg mb-4">Paiement du plan {planChoisi.libelle} — {formaterFCFA(planChoisi.prix)}</p>
          <ol className="text-sm text-charbon space-y-3 list-decimal list-inside">
            <li>
              Transférez le montant vers l'un des numéros de <span className="font-semibold">{NOM_BENEFICIAIRE_PLATEFORME}</span> :
              <ul className="mt-2 ml-5 space-y-1.5">
                {OPERATEURS_MOBILE_MONEY.map(op => (
                  <li key={op.valeur} className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-foret-light text-foret-dark font-semibold w-28 text-center shrink-0">{op.libelle}</span>
                    <span className="font-donnee">{op.numero}</span>
                  </li>
                ))}
              </ul>
            </li>
            <li>Depuis votre numéro enregistré ({profile?.telephone || 'non renseigné'}).</li>
            <li>Indiquez ci-dessous l'opérateur et la référence reçue.</li>
          </ol>
          <form onSubmit={declarerPaiement} className="space-y-3 mt-5 border-t border-ligne pt-4">
            <div>
              <label className="etiquette">Opérateur utilisé</label>
              <div className="flex gap-2">
                {OPERATEURS_MOBILE_MONEY.map(op => (
                  <button type="button" key={op.valeur} onClick={() => setOperateur(op.valeur)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${operateur === op.valeur ? 'border-foret bg-foret-light text-foret-dark' : 'border-ligne text-ardoise'}`}>
                    {op.libelle}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="etiquette">Référence de la transaction</label>
              <input className="champ" value={reference} onChange={e => setReference(e.target.value)} /></div>
            <button disabled={envoi} className="btn-secondaire w-full">{envoi ? 'Envoi…' : "J'ai effectué le transfert"}</button>
          </form>
        </div>
      )}

      {declarationEnvoyee && (
        <div className="carte p-5 mt-6 bg-foret-light border-foret/20 text-center">
          <p className="font-display font-semibold text-foret-dark">Déclaration envoyée !</p>
          <p className="text-sm text-charbon mt-1">Activation après vérification par un administrateur.</p>
        </div>
      )}
    </div>
  )
}
