import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAgencyQuotaUsage, fetchAgencyPayments, createSubscriptionPayment,
  fetchAgencyVerificationRequests, uploadVerificationDoc,
} from '../utils/db'
import { PLANS, planById, PAYMENT_METHODS } from '../data/plans'
import FormAlert from '../components/FormAlert'

const STATUS_LABEL = { pending: 'En attente', approved: 'Validé', rejected: 'Refusé' }
const STATUS_COLOR = { pending: 'text-orange', approved: 'text-green', rejected: 'text-red-500' }

export default function AgencySubscription() {
  const { agency, refreshAgency } = useAuth()
  const [usage, setUsage] = useState(null)
  const [payments, setPayments] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [choosingPlan, setChoosingPlan] = useState(null)

  async function load() {
    if (!agency) return
    setLoading(true)
    const [u, p, v] = await Promise.all([
      fetchAgencyQuotaUsage(agency.id),
      fetchAgencyPayments(agency.id),
      fetchAgencyVerificationRequests(agency.id),
    ])
    setUsage(u)
    setPayments(p)
    setVerifications(v)
    setLoading(false)
  }

  useEffect(() => { load() }, [agency?.id])

  if (!agency) return <div className="max-w-3xl mx-auto px-4 py-16 text-ink/60">Chargement…</div>

  const currentPlan = planById(agency.plan)
  const hasPendingSubscription = payments.some(p => p.type === 'subscription' && p.status === 'pending')
  const hasPendingVerification = verifications.some(v => v.status === 'pending')

  return (
    <div id="abonnement" className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-ink">Mon abonnement</h1>

      <div className="bg-white border border-ink/10 rounded-xl p-4 mt-6">
        <div className="text-sm text-ink/60">Formule actuelle</div>
        <div className="font-display font-bold text-xl text-ink">{currentPlan.label}</div>
        {!loading && usage && (
          <div className="text-sm text-ink/60 mt-2 space-y-0.5">
            <div>Annonces publiées ce mois-ci : <b className="text-ink">{usage.listingsThisMonth} / {currentPlan.listingsPerMonth}</b></div>
            {currentPlan.freeBoosts > 0 && (
              <div>Boosts gratuits utilisés ce mois-ci : <b className="text-ink">{usage.freeBoostsUsedThisMonth} / {currentPlan.freeBoosts}</b></div>
            )}
          </div>
        )}
      </div>

      {hasPendingSubscription && (
        <div className="mt-4 bg-orange/10 border border-orange/30 text-orange rounded-xl p-3 text-sm">
          Un changement de formule est en attente de validation par l'administrateur (sous 24h).
        </div>
      )}

      <div className="bg-white border border-ink/10 rounded-xl p-4 mt-6 flex items-center justify-between">
        <div>
          <div className="font-display font-semibold text-ink">
            Vérification {agency.verified && <span className="text-green">✓ Agence vérifiée</span>}
          </div>
          {hasPendingVerification && <p className="text-xs text-orange mt-0.5">Demande en attente</p>}
        </div>
        <Link to="/agence/tableau-de-bord#verification" className="text-sm font-semibold text-green">
          Gérer depuis le tableau de bord →
        </Link>
      </div>

      <h2 className="font-display font-semibold text-lg text-ink mt-8 mb-3">Changer de formule</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {PLANS.map(p => (
          <div key={p.id} className={`border rounded-xl p-4 ${p.id === agency.plan ? 'border-green bg-green/5' : 'border-ink/10 bg-white'}`}>
            <div className="font-display font-bold text-ink">{p.label}</div>
            <div className="text-lg font-display font-bold text-ink mt-1">
              {p.price === 0 ? 'Gratuit' : `${new Intl.NumberFormat('fr-FR').format(p.price)} FCFA/mois`}
            </div>
            <div className="text-xs text-ink/60 mt-1">{p.listingsPerMonth} annonces/mois</div>
            <p className="text-xs text-ink/60 mt-2">{p.description}</p>
            {p.id === agency.plan ? (
              <div className="text-xs font-semibold text-green mt-3">Formule actuelle</div>
            ) : p.id !== 'free' && (
              <button
                onClick={() => setChoosingPlan(p)}
                disabled={hasPendingSubscription}
                className="btn-outline w-full mt-3 !py-1.5 text-sm disabled:opacity-40"
              >
                Choisir
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 id="historique-paiement" className="font-display font-semibold text-lg text-ink mt-8 mb-3">Historique de paiement</h2>
      {payments.length === 0 && <p className="text-sm text-ink/60">Aucun paiement pour le moment.</p>}
      <div className="space-y-2">
        {payments.map(p => (
          <div key={p.id} className="flex items-center justify-between bg-white border border-ink/10 rounded-lg px-4 py-2.5 text-sm">
            <div>
              <span className="font-medium text-ink">
                {p.type === 'subscription' ? `Abonnement ${planById(p.plan).label}` : `Boost ${p.boostDurationDays}j`}
              </span>
              <span className="text-ink/60"> · {new Intl.NumberFormat('fr-FR').format(p.amount)} FCFA · {p.paymentMethod}</span>
            </div>
            <span className={`font-semibold ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
          </div>
        ))}
      </div>

      {choosingPlan && (
        <PaymentModal
          title={`Passer à la formule ${choosingPlan.label}`}
          amount={choosingPlan.price}
          onClose={() => setChoosingPlan(null)}
          onSubmit={async (method, reference) => {
            await createSubscriptionPayment(agency.id, choosingPlan.id, choosingPlan.price, method, reference)
            load()
          }}
        />
      )}
    </div>
  )
}

export function VerificationModal({ onClose, onSubmit }) {
  const { agency } = useAuth()
  const [message, setMessage] = useState('')
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (const file of files) {
        const path = await uploadVerificationDoc(agency.id, file)
        setDocuments(d => [...d, path])
      }
    } catch (err) {
      console.error('Erreur upload document vérification :', err)
      setError("Échec de l'envoi du document. Réessaie.")
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(message, documents)
      setSent(true)
    } catch (err) {
      console.error('Erreur envoi demande de vérification :', err)
      setError('Une erreur est survenue, réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h3 className="font-display font-semibold text-lg mb-2">Demande envoyée</h3>
            <p className="text-sm text-ink/60 mb-4">Un administrateur l'examine, validation sous 24h.</p>
            <button onClick={onClose} className="btn-primary w-full">Fermer</button>
          </>
        ) : (
          <>
            <h3 className="font-display font-semibold text-lg mb-4">Demander la vérification</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                required placeholder="Présente ton agence (registre de commerce, ancienneté, etc.)"
                rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="input"
              />
              <div>
                <span className="text-xs font-semibold text-ink/60">Documents (registre de commerce, pièce d'identité…)</span>
                <input
                  type="file" accept="image/*,.pdf" multiple onChange={handleFiles} disabled={uploading}
                  className="block w-full text-sm mt-1.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-stub file:text-ink file:text-sm"
                />
                {uploading && <p className="text-xs text-ink/60 mt-1">Envoi en cours…</p>}
                {documents.length > 0 && (
                  <p className="text-xs text-green mt-1">{documents.length} document(s) ajouté(s)</p>
                )}
              </div>
              {error && <FormAlert>{error}</FormAlert>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-outline flex-1">Annuler</button>
                <button type="submit" disabled={submitting || uploading} className="btn-primary flex-1">
                  {submitting ? 'Envoi…' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export function PaymentModal({ title, amount, onClose, onSubmit }) {
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id)
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const selected = PAYMENT_METHODS.find(m => m.id === method)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(method, reference)
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <div className="text-4xl mb-2">✓</div>
            <h3 className="font-display font-semibold text-lg mb-2">Référence bien envoyée</h3>
            <p className="text-sm text-ink/60 mb-4">
              Un administrateur valide ton paiement sous 24h — l'activation est automatique dès validation.
            </p>
            <button onClick={onClose} className="btn-primary w-full">Fermer</button>
          </>
        ) : (
          <>
            <h3 className="font-display font-semibold text-lg mb-1">{title}</h3>
            <p className="text-sm text-ink/60 mb-4">{new Intl.NumberFormat('fr-FR').format(amount)} FCFA</p>

            <div className="flex gap-2 mb-3">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                  className={`chip ${method === m.id ? 'chip-active' : 'chip-inactive'}`}>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="bg-stub rounded-lg p-3 text-sm mb-4">
              Envoie <b>{new Intl.NumberFormat('fr-FR').format(amount)} FCFA</b> via {selected.label} au numéro{' '}
              <b>{selected.number}</b>, puis colle la référence de la transaction ci-dessous.
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Référence de la transaction" value={reference}
                onChange={(e) => setReference(e.target.value)} className="input" />
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn-outline flex-1">Annuler</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Envoi…' : 'Soumettre'}
                </button>
              </div>
            </form>
            <p className="text-xs text-ink/55 mt-3">
              Un administrateur valide manuellement le paiement pour activer ta formule.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
