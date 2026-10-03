import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchAgencyListings, deleteListing, setListingStatus, fetchAgencyQuotaUsage, createBoostPayment, fetchAgencyNewRequestsCount, updateAgencyProfile, createVerificationRequest, fetchAgencyVerificationRequests } from '../utils/db'
import { planById, BOOST_OPTIONS } from '../data/plans'
import { PaymentModal, VerificationModal } from './AgencySubscription'
import { DEPARTURE_CITIES, AGENCY_PAYMENT_OPTIONS } from '../data/categories'
import PhoneInput from '../components/PhoneInput'
import StarRating from '../components/StarRating'
import AgencyReviews from '../components/AgencyReviews'
import PublishingRules from '../components/PublishingRules'

const STATUS_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'Actives' },
  { id: 'paused', label: 'En pause' },
]

export default function AgencyDashboard() {
  const { user, agency, refreshAgency } = useAuth()
  const [listings, setListings] = useState([])
  const [usage, setUsage] = useState(null)
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [boostingListing, setBoostingListing] = useState(null)
  const [boostOption, setBoostOption] = useState(BOOST_OPTIONS[0])
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', whatsapp: '', city: '', openingHours: '', acceptedPaymentMethods: [] })
  const [savingProfile, setSavingProfile] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [showVerifyForm, setShowVerifyForm] = useState(false)
  const [hasPendingVerification, setHasPendingVerification] = useState(false)
  const [dismissingWelcome, setDismissingWelcome] = useState(false)

  async function load() {
    setLoading(true)
    const [l, u, newCount, verifications] = await Promise.all([
      fetchAgencyListings(user.id),
      fetchAgencyQuotaUsage(user.id),
      fetchAgencyNewRequestsCount(user.id),
      fetchAgencyVerificationRequests(user.id),
    ])
    setListings(l)
    setUsage(u)
    setNewRequestsCount(newCount)
    setHasPendingVerification(verifications.some(v => v.status === 'pending'))
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  useEffect(() => {
    if (agency) setProfileForm({
      name: agency.name || '', phone: agency.phone || '', whatsapp: agency.whatsapp || '', city: agency.city || '',
      openingHours: agency.openingHours || '', acceptedPaymentMethods: agency.acceptedPaymentMethods || [],
    })
  }, [agency])

  function togglePaymentMethod(m) {
    setProfileForm(f => ({
      ...f,
      acceptedPaymentMethods: f.acceptedPaymentMethods.includes(m)
        ? f.acceptedPaymentMethods.filter(x => x !== m)
        : [...f.acceptedPaymentMethods, m],
    }))
  }

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateAgencyProfile(user.id, {
        name: profileForm.name, phone: profileForm.phone, whatsapp: profileForm.whatsapp, city: profileForm.city,
        opening_hours: profileForm.openingHours, accepted_payment_methods: profileForm.acceptedPaymentMethods,
      })
      await refreshAgency()
      setEditingProfile(false)
    } finally {
      setSavingProfile(false)
    }
  }

  const renewalDate = agency?.planStartedAt ? new Date(agency.planStartedAt) : null
  if (renewalDate) renewalDate.setMonth(renewalDate.getMonth() + 1)

  async function dismissWelcome() {
    setDismissingWelcome(true)
    try {
      await updateAgencyProfile(user.id, { welcome_message_seen: true })
      await refreshAgency()
    } finally {
      setDismissingWelcome(false)
    }
  }

  const currentPlan = planById(agency?.plan || 'free')
  const activeCount = listings.filter(l => l.status === 'active').length
  const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0)
  const totalClicks = listings.reduce((s, l) => s + (l.clicks || 0), 0)
  const filteredListings = statusFilter === 'all' ? listings : listings.filter(l => l.status === statusFilter)

  async function handleDelete(e, l) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Supprimer l'annonce « ${l.title} » ?`)) return
    await deleteListing(l.id, user.id)
    load()
  }

  async function handleToggleStatus(e, l) {
    e.preventDefault(); e.stopPropagation()
    await setListingStatus(l.id, l.status === 'active' ? 'paused' : 'active')
    load()
  }

  function openBoost(e, l) {
    e.preventDefault(); e.stopPropagation()
    setBoostingListing(l)
    setBoostOption(BOOST_OPTIONS[0])
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {agency && !agency.welcomeMessageSeen && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-ink mb-1">Bienvenue sur Agnini Sanfè</h2>
            <p className="text-sm text-ink/60 mb-4">
              Avant de publier, un dernier rappel de nos règles — elles s'appliquent à chaque annonce.
            </p>
            <PublishingRules compact />
            <button
              onClick={dismissWelcome} disabled={dismissingWelcome}
              className="btn-primary w-full mt-5"
            >
              {dismissingWelcome ? '…' : "J'ai compris"}
            </button>
          </div>
        </div>
      )}

      {!agency?.verified && (
        <div id="verification" className="flex items-center justify-between bg-orange/10 border border-orange/30 rounded-xl px-4 py-3 mb-6">
          <span className="text-sm text-ink">
            {hasPendingVerification
              ? '⏳ Ta demande de vérification est en attente de validation.'
              : '🔒 Ton agence n\'est pas encore vérifiée.'}
          </span>
          {!hasPendingVerification && (
            <button onClick={() => setShowVerifyForm(true)} className="btn-outline !py-1.5 text-sm whitespace-nowrap">
              Demander la vérification
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">{agency?.name || 'Mon agence'}</h1>
          {agency?.verified && <span className="text-green font-semibold text-sm">✓ Agence vérifiée</span>}
        </div>
        <Link to="/agence/annonces/nouvelle" className="btn-primary">+ Nouvelle annonce</Link>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mt-6">
        <Stat label="Annonces actives" value={activeCount} />
        <Stat label="Vues totales" value={totalViews} />
        <Stat label="Clics « Contacter »" value={totalClicks} />
        <Stat
          label="Demandes reçues"
          value={
            <Link to="/agence/demandes" className="text-green hover:underline inline-flex items-center gap-2">
              Voir →
              {newRequestsCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">
                  {newRequestsCount}
                </span>
              )}
            </Link>
          }
        />
      </div>

      <div className="bg-white border border-ink/10 rounded-2xl p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-ink">Informations de l'agence</h2>
          {!editingProfile && (
            <button onClick={() => setEditingProfile(true)} className="text-sm font-semibold text-green">Modifier</button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={handleProfileSubmit} className="space-y-3">
            <input required placeholder="Nom de l'agence" value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input" />
            <PhoneInput required value={profileForm.phone} onChange={(v) => setProfileForm({ ...profileForm, phone: v })} />
            <PhoneInput value={profileForm.whatsapp} onChange={(v) => setProfileForm({ ...profileForm, whatsapp: v })} placeholder="WhatsApp (optionnel)" />
            <select value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} className="input">
              {DEPARTURE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Horaires (ex. : Lun-Ven 8h-18h, Sam 9h-13h)" value={profileForm.openingHours}
              onChange={(e) => setProfileForm({ ...profileForm, openingHours: e.target.value })} className="input" />
            <div>
              <span className="text-xs font-semibold text-ink/60">Moyens de paiement acceptés (optionnel)</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {AGENCY_PAYMENT_OPTIONS.map(m => (
                  <button type="button" key={m} onClick={() => togglePaymentMethod(m)}
                    className={`chip ${profileForm.acceptedPaymentMethods.includes(m) ? 'chip-active' : 'chip-inactive'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingProfile(false)} className="btn-outline flex-1">Annuler</button>
              <button type="submit" disabled={savingProfile} className="btn-primary flex-1">
                {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold text-ink">{agency?.name}</span>
              <span className="text-ink/45">·</span>
              <span className="text-ink/85">{agency?.phone || 'Téléphone non renseigné'}</span>
              {agency?.whatsapp && <><span className="text-ink/45">·</span><span className="text-ink/85">WhatsApp {agency.whatsapp}</span></>}
              {agency?.city && <><span className="text-ink/45">·</span><span className="text-ink/85">{agency.city}</span></>}
            </div>
            {agency?.openingHours && <div className="text-xs text-ink/60 mt-1.5">🕒 {agency.openingHours}</div>}
            {agency?.acceptedPaymentMethods?.length > 0 && (
              <div className="text-xs text-ink/60 mt-1">💳 {agency.acceptedPaymentMethods.join(', ')}</div>
            )}
          </div>
        )}

        <div className="border-t border-ink/10 mt-4 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {agency?.reviewCount > 0 ? (
              <>
                <StarRating value={Math.round(agency.ratingAvg)} readOnly size="text-sm" />
                <span className="text-ink/60">{agency.ratingAvg} ({agency.reviewCount} avis)</span>
              </>
            ) : (
              <span className="text-ink/60">Pas encore d'avis</span>
            )}
          </div>
          {agency?.reviewCount > 0 && (
            <button onClick={() => setShowReviews(s => !s)} className="text-sm font-semibold text-green">
              {showReviews ? 'Masquer les avis' : 'Voir les avis'}
            </button>
          )}
        </div>
        {showReviews && (
          <div className="mt-4">
            <AgencyReviews agencyId={user.id} showWriteSection={false} />
          </div>
        )}
      </div>

      <div id="mes-annonces" className="flex flex-wrap items-center justify-between gap-3 mt-8 mb-3">
        <h2 className="font-display font-semibold text-lg text-ink">Mes annonces</h2>
        <div className="flex gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} className={`chip ${statusFilter === f.id ? 'chip-active' : 'chip-inactive'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}

      {!loading && listings.length === 0 && (
        <div className="border border-dashed border-ink/20 rounded-2xl p-10 text-center text-ink/60">
          Tu n'as pas encore publié d'annonce. Tu bénéficies de 5 annonces gratuites par mois pour commencer.
        </div>
      )}

      {!loading && listings.length > 0 && filteredListings.length === 0 && (
        <p className="text-ink/60">Aucune annonce dans ce filtre.</p>
      )}

      <div className="space-y-2">
        {filteredListings.map(l => (
          <Link
            key={l.id} to={`/annonce/${l.id}`}
            className="flex items-center justify-between bg-white border border-ink/10 rounded-xl px-4 py-3 hover:border-ink/25 transition-colors"
          >
            <div className="min-w-0">
              <div className="font-medium text-ink truncate flex items-center gap-2">
                {l.title}
                {l.boosted && (
                  <span className="text-[10px] font-display font-bold bg-orange text-ink px-1.5 py-0.5 rounded">BOOST</span>
                )}
              </div>
              <div className="text-xs text-ink/60">
                {l.status === 'active' ? 'Active' : l.status === 'paused' ? 'En pause' : l.status}
                {' · '}{l.views || 0} vues · {l.clicks || 0} clics
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!l.boosted && (
                <button onClick={(e) => openBoost(e, l)} className="text-sm text-orange font-semibold">
                  Booster
                </button>
              )}
              <Link to={`/agence/annonces/${l.id}/modifier`} onClick={(e) => e.stopPropagation()} className="text-sm text-green font-semibold">
                Modifier
              </Link>
              <button onClick={(e) => handleToggleStatus(e, l)} className="text-sm text-ink/60 hover:text-ink">
                {l.status === 'active' ? 'Mettre en pause' : 'Réactiver'}
              </button>
              <button onClick={(e) => handleDelete(e, l)} className="text-sm text-red-500 hover:text-red-700">Supprimer</button>
            </div>
          </Link>
        ))}
      </div>

      {boostingListing && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={() => setBoostingListing(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-lg mb-1">Booster « {boostingListing.title} »</h3>
            <p className="text-sm text-ink/60 mb-4">Choisis une durée</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {BOOST_OPTIONS.map(o => (
                <button key={o.id} onClick={() => setBoostOption(o)}
                  className={`chip ${boostOption.id === o.id ? 'chip-active' : 'chip-inactive'}`}>
                  {o.label} · {new Intl.NumberFormat('fr-FR').format(o.price)} FCFA
                </button>
              ))}
            </div>
            <button onClick={() => setBoostingListing({ ...boostingListing, _confirmed: true })} className="btn-primary w-full">
              Continuer
            </button>
            <button onClick={() => setBoostingListing(null)} className="text-sm text-ink/60 w-full text-center mt-2">Annuler</button>
          </div>
        </div>
      )}

      {boostingListing?._confirmed && (
        <PaymentModal
          title={`Boost ${boostOption.label} — « ${boostingListing.title} »`}
          amount={boostOption.price}
          onClose={() => setBoostingListing(null)}
          onSubmit={async (method, reference) => {
            await createBoostPayment(user.id, boostingListing.id, boostOption.days, boostOption.price, method, reference)
            load()
          }}
        />
      )}

      {showVerifyForm && (
        <VerificationModal
          onClose={() => setShowVerifyForm(false)}
          onSubmit={async (message, documents) => {
            await createVerificationRequest(user.id, message, documents)
            load()
          }}
        />
      )}

      <div id="abonnement-resume" className="bg-white border border-ink/10 rounded-2xl p-5 mt-10">
        <h2 className="font-display font-semibold text-ink mb-3">Abonnement</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ink/85">
            Formule actuelle : <b className="text-ink">{currentPlan.label}</b>
            {currentPlan.price > 0 && renewalDate && (
              <> · renouvellement le <b className="text-ink">{renewalDate.toLocaleDateString('fr-FR')}</b></>
            )}
            {usage && (
              <div className="mt-1">
                {usage.listingsThisMonth}/{currentPlan.listingsPerMonth} annonces ce mois-ci
                {currentPlan.freeBoosts > 0 && ` · ${usage.freeBoostsUsedThisMonth}/${currentPlan.freeBoosts} boosts gratuits utilisés`}
              </div>
            )}
          </div>
          <Link to="/agence/abonnement" className="btn-outline !py-1.5 text-sm">Gérer l'abonnement</Link>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-ink/10 rounded-xl p-4">
      <div className="text-xs text-ink/60 uppercase tracking-wide">{label}</div>
      <div className="font-display font-bold text-xl text-ink mt-1">{value}</div>
    </div>
  )
}
