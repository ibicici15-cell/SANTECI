import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { PLANS, planById, BOOST_OPTIONS } from '../data/plans'
import {
  fetchGlobalStats, fetchAllAgenciesAdmin, adminSetAgencyVerified,
  adminSetAgencySuspended, adminSetAgencyPlan, fetchAllListingsAdmin,
  adminSetListingStatus, adminDeleteListing,
  fetchAllPaymentsAdmin, adminApprovePayment, adminRejectPayment, fetchAgencyPayments,
  fetchAllTravelersAdmin, adminSetTravelerBlocked,
  adminFeatureListing, adminUnfeatureListing,
  fetchAllVerificationRequestsAdmin, adminApproveVerification, adminRejectVerification, getVerificationDocUrl,
  fetchAllReportsAdmin, adminSetReportStatus,
  fetchCategories, fetchDestinations, adminAddCategory, adminRemoveCategory,
  adminAddDestination, adminRemoveDestination,
  fetchContactMessagesAdmin, adminMarkContactMessageRead,
} from '../utils/db'

const TABS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'agencies', label: 'Agences' },
  { id: 'listings', label: 'Annonces' },
  { id: 'payments', label: 'Paiements' },
  { id: 'verifications', label: 'Vérifications' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'reports', label: 'Signalements' },
  { id: 'categories', label: 'Catégories' },
  { id: 'destinations', label: 'Destinations' },
  { id: 'messages', label: 'Messages' },
]

const PLAN_LABEL = { free: 'Gratuit', standard: 'Standard', premium: 'Premium' }

export default function AdminDashboard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [badgeCounts, setBadgeCounts] = useState({ payments: 0, verifications: 0, reports: 0, messages: 0 })

  useEffect(() => {
    Promise.all([
      fetchAllPaymentsAdmin('pending').then(l => l.length).catch(() => 0),
      fetchAllVerificationRequestsAdmin('pending').then(l => l.length).catch(() => 0),
      fetchAllReportsAdmin('pending').then(l => l.length).catch(() => 0),
      fetchContactMessagesAdmin('new').then(l => l.length).catch(() => 0),
    ]).then(([payments, verifications, reports, messages]) => {
      setBadgeCounts({ payments, verifications, reports, messages })
    })
  }, [tab])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display font-bold text-2xl text-ink">Administration</h1>
        <button
          onClick={async () => { await logout(); navigate('/') }}
          className="text-sm border border-ink/20 hover:border-ink px-3 py-1.5 rounded-lg transition-colors"
        >
          Déconnexion
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`chip ${tab === t.id ? 'chip-active' : 'chip-inactive'} inline-flex items-center gap-1.5`}>
            {t.label}
            {badgeCounts[t.id] > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                {badgeCounts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'agencies' && <AgenciesTab />}
      {tab === 'listings' && <ListingsTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'verifications' && <VerificationsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'destinations' && <DestinationsTab />}
      {tab === 'messages' && <MessagesTab />}
    </div>
  )
}

function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGlobalStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-ink/60">Chargement des statistiques…</p>
  if (!stats) return <p className="text-ink/60">Impossible de charger les statistiques.</p>

  return (
    <div>
      <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Stat label="Agences" value={stats.totalAgencies} />
        <Stat label="Agences vérifiées" value={stats.verifiedAgencies} />
        <Stat label="Agences suspendues" value={stats.suspendedAgencies} />
        <Stat label="Annonces actives" value={`${stats.activeListings} / ${stats.totalListings}`} />
        <Stat label="Vues cumulées" value={stats.totalViews} />
        <Stat label="Clics « Contacter »" value={stats.totalClicks} />
        <Stat label="Demandes reçues (total)" value={stats.totalRequests} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-white border border-ink/10 rounded-xl p-4">
          <h2 className="font-display font-semibold text-ink mb-3">Répartition par formule</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span>Gratuit</span><span className="font-semibold">{stats.agenciesByPlan.free}</span></div>
            <div className="flex justify-between"><span>Standard</span><span className="font-semibold">{stats.agenciesByPlan.standard}</span></div>
            <div className="flex justify-between"><span>Premium</span><span className="font-semibold">{stats.agenciesByPlan.premium}</span></div>
          </div>
        </div>

        <div className="bg-white border border-ink/10 rounded-xl p-4">
          <h2 className="font-display font-semibold text-ink mb-3">Destinations les plus proposées</h2>
          {stats.topDestinations.length === 0 && <p className="text-sm text-ink/60">Pas encore de données.</p>}
          <div className="space-y-1.5 text-sm">
            {stats.topDestinations.map(d => (
              <div key={d.destination} className="flex justify-between">
                <span>{d.destination}</span><span className="font-semibold">{d.count}</span>
              </div>
            ))}
          </div>
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

function AgenciesTab() {
  const [agencies, setAgencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [openHistoryId, setOpenHistoryId] = useState(null)
  const [history, setHistory] = useState([])

  async function load() {
    setLoading(true)
    setAgencies(await fetchAllAgenciesAdmin())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleVerified(a) {
    await adminSetAgencyVerified(a.id, !a.verified)
    load()
  }
  async function toggleSuspended(a) {
    await adminSetAgencySuspended(a.id, !a.suspended)
    load()
  }
  async function changePlan(a, plan) {
    await adminSetAgencyPlan(a.id, plan)
    load()
  }

  async function toggleHistory(a) {
    if (openHistoryId === a.id) { setOpenHistoryId(null); return }
    setOpenHistoryId(a.id)
    setHistory(await fetchAgencyPayments(a.id))
  }

  if (loading) return <p className="text-ink/60">Chargement…</p>
  if (agencies.length === 0) return <p className="text-ink/60">Aucune agence inscrite pour le moment.</p>

  return (
    <div className="space-y-2">
      {agencies.map(a => (
        <div key={a.id} className="bg-white border border-ink/10 rounded-xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-ink flex items-center gap-2">
                {a.name}
                {a.verified && <span className="text-green text-xs font-semibold">✓ Vérifiée</span>}
                {a.suspended && <span className="text-red-500 text-xs font-semibold">Suspendue</span>}
              </div>
              <div className="text-xs text-ink/60 mt-0.5">
                {a.city} · {a.email} · {a.phone} · {a.listingsCount} annonce{a.listingsCount > 1 ? 's' : ''}
                {a.reviewCount > 0 && ` · ${a.ratingAvg}★ (${a.reviewCount} avis)`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={a.plan} onChange={(e) => changePlan(a, e.target.value)}
                className="text-xs border border-ink/15 rounded-lg px-2 py-1.5"
              >
                {PLANS.map(p => <option key={p.id} value={p.id}>{p.label} ({p.listingsPerMonth}/mois)</option>)}
              </select>
              <button onClick={() => toggleVerified(a)} className="text-xs font-semibold text-green">
                {a.verified ? 'Retirer la vérification' : 'Vérifier'}
              </button>
              <button onClick={() => toggleSuspended(a)} className="text-xs font-semibold text-red-500">
                {a.suspended ? 'Réhabiliter' : 'Suspendre'}
              </button>
              <button onClick={() => toggleHistory(a)} className="text-xs font-semibold text-ink/60">
                {openHistoryId === a.id ? 'Masquer l\'historique' : 'Historique'}
              </button>
            </div>
          </div>

          {openHistoryId === a.id && (
            <div className="mt-3 pt-3 border-t border-ink/10">
              {history.length === 0 ? (
                <p className="text-xs text-ink/60">Aucun paiement pour cette agence.</p>
              ) : (
                <div className="space-y-1.5">
                  {history.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink/85">
                        {p.type === 'subscription' ? `Abonnement ${planById(p.plan).label}` : `Boost ${p.boostDurationDays}j`}
                        {' · '}{new Intl.NumberFormat('fr-FR').format(p.amount)} FCFA
                      </span>
                      <span className={p.status === 'approved' ? 'text-green' : p.status === 'rejected' ? 'text-red-500' : 'text-orange'}>
                        {PAYMENT_STATUS_LABEL[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ListingsTab() {
  const [listings, setListings] = useState([])
  const [categoryLabel, setCategoryLabel] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    const [l, cats] = await Promise.all([fetchAllListingsAdmin(), fetchCategories()])
    setListings(l)
    setCategoryLabel(Object.fromEntries(cats.map(c => [c.id, c.label])))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleStatus(l) {
    await adminSetListingStatus(l.id, l.status === 'active' ? 'paused' : 'active')
    load()
  }
  async function toggleFeatured(l) {
    if (l.boosted) await adminUnfeatureListing(l.id)
    else await adminFeatureListing(l.id)
    load()
  }
  async function remove(l) {
    if (!confirm(`Supprimer définitivement « ${l.title} » ?`)) return
    await adminDeleteListing(l.id)
    load()
  }

  const filtered = filter === 'all' ? listings : listings.filter(l => l.status === filter)

  if (loading) return <p className="text-ink/60">Chargement…</p>

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'active', label: 'Actives' },
          { id: 'paused', label: 'En pause' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'chip-active' : 'chip-inactive'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-ink/60">Aucune annonce.</p>}

      <div className="space-y-2">
        {filtered.map(l => (
          <div key={l.id} className="flex items-center justify-between bg-white border border-ink/10 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <div className="font-medium text-ink truncate">
                {l.title} {l.boosted && <span className="text-[10px] font-display font-bold bg-orange text-ink px-1.5 py-0.5 rounded ml-1">BOOST</span>}
              </div>
              <div className="text-xs text-ink/60">
                {l.agencyName} · {categoryLabel[l.type] || l.type} · {l.status === 'active' ? 'Active' : 'En pause'}
                {' · '}{l.views || 0} vues · {l.clicks || 0} clics
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => toggleFeatured(l)} className="text-sm text-orange font-semibold">
                {l.boosted ? 'Retirer la mise en avant' : 'Mettre en avant'}
              </button>
              <button onClick={() => toggleStatus(l)} className="text-sm text-green font-semibold">
                {l.status === 'active' ? 'Mettre en pause' : 'Réactiver'}
              </button>
              <button onClick={() => remove(l)} className="text-sm text-red-500 hover:text-red-700">Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const PAYMENT_STATUS_LABEL = { pending: 'En attente', approved: 'Validé', rejected: 'Refusé' }

function PaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoading(true)
    setPayments(await fetchAllPaymentsAdmin(filter === 'all' ? undefined : filter))
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function approve(p) {
    setBusyId(p.id)
    try { await adminApprovePayment(p); load() } finally { setBusyId(null) }
  }
  async function reject(p) {
    setBusyId(p.id)
    try { await adminRejectPayment(p.id); load() } finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[
          { id: 'pending', label: 'En attente' },
          { id: 'approved', label: 'Validés' },
          { id: 'rejected', label: 'Refusés' },
          { id: 'all', label: 'Tous' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'chip-active' : 'chip-inactive'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}
      {!loading && payments.length === 0 && <p className="text-ink/60">Aucun paiement.</p>}

      <div className="space-y-2">
        {payments.map(p => (
          <div key={p.id} className="bg-white border border-ink/10 rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">
                  {p.agencyName} — {p.type === 'subscription' ? `Abonnement ${planById(p.plan).label}` : `Boost ${p.boostDurationDays}j`}
                </div>
                <div className="text-xs text-ink/60 mt-0.5">
                  {new Intl.NumberFormat('fr-FR').format(p.amount)} FCFA · {p.paymentMethod} · réf. {p.reference}
                </div>
              </div>
              {p.status === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={() => approve(p)} disabled={busyId === p.id} className="text-xs font-semibold text-green">
                    Valider
                  </button>
                  <button onClick={() => reject(p)} disabled={busyId === p.id} className="text-xs font-semibold text-red-500">
                    Refuser
                  </button>
                </div>
              ) : (
                <span className={`text-xs font-semibold ${p.status === 'approved' ? 'text-green' : 'text-red-500'}`}>
                  {PAYMENT_STATUS_LABEL[p.status]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const VERIF_STATUS_LABEL = { pending: 'En attente', approved: 'Validée', rejected: 'Refusée' }

function VerificationsTab() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoading(true)
    setRequests(await fetchAllVerificationRequestsAdmin(filter === 'all' ? undefined : filter))
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function approve(r) {
    setBusyId(r.id)
    try { await adminApproveVerification(r); load() } finally { setBusyId(null) }
  }
  async function reject(r) {
    setBusyId(r.id)
    try { await adminRejectVerification(r.id); load() } finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[
          { id: 'pending', label: 'En attente' },
          { id: 'approved', label: 'Validées' },
          { id: 'rejected', label: 'Refusées' },
          { id: 'all', label: 'Toutes' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'chip-active' : 'chip-inactive'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}
      {!loading && requests.length === 0 && <p className="text-ink/60">Aucune demande.</p>}

      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="bg-white border border-ink/10 rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">{r.agencyName}</div>
                {r.message && <p className="text-sm text-ink/85 mt-1">{r.message}</p>}
                {r.documents.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {r.documents.map((d, i) => (
                      <button
                        key={i}
                        onClick={async () => window.open(await getVerificationDocUrl(d), '_blank')}
                        className="text-xs text-green underline text-left"
                      >
                        Document {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {r.status === 'pending' ? (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(r)} disabled={busyId === r.id} className="text-xs font-semibold text-green">Valider</button>
                  <button onClick={() => reject(r)} disabled={busyId === r.id} className="text-xs font-semibold text-red-500">Refuser</button>
                </div>
              ) : (
                <span className={`text-xs font-semibold shrink-0 ${r.status === 'approved' ? 'text-green' : 'text-red-500'}`}>
                  {VERIF_STATUS_LABEL[r.status]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersTab() {
  const [travelers, setTravelers] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setTravelers(await fetchAllTravelersAdmin())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleBlocked(t) {
    await adminSetTravelerBlocked(t.id, !t.blocked)
    load()
  }

  if (loading) return <p className="text-ink/60">Chargement…</p>
  if (travelers.length === 0) return <p className="text-ink/60">Aucun voyageur inscrit pour le moment.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/55 mb-2">
        La suppression définitive d'un compte nécessite l'API d'administration
        Supabase, volontairement non exposée côté client pour des raisons de
        sécurité — le blocage empêche la connexion et est réversible.
      </p>
      {travelers.map(t => (
        <div key={t.id} className="bg-white border border-ink/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-ink flex items-center gap-2">
              {t.name}
              {t.blocked && <span className="text-red-500 text-xs font-semibold">Bloqué</span>}
            </div>
            <div className="text-xs text-ink/60 mt-0.5">{t.city} · {t.phone}</div>
          </div>
          <button onClick={() => toggleBlocked(t)} className={`text-xs font-semibold ${t.blocked ? 'text-green' : 'text-red-500'}`}>
            {t.blocked ? 'Débloquer' : 'Bloquer'}
          </button>
        </div>
      ))}
    </div>
  )
}

const REPORT_REASON_LABEL = {
  fraud: 'Arnaque / fraude', wrong_info: 'Informations trompeuses',
  inappropriate: 'Contenu inapproprié', other: 'Autre',
}
const REPORT_STATUS_LABEL = { pending: 'En attente', resolved: 'Résolu', dismissed: 'Ignoré' }

function ReportsTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoading(true)
    setReports(await fetchAllReportsAdmin(filter === 'all' ? undefined : filter))
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function setStatus(r, status) {
    setBusyId(r.id)
    try { await adminSetReportStatus(r.id, status); load() } finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[
          { id: 'pending', label: 'En attente' },
          { id: 'resolved', label: 'Résolus' },
          { id: 'dismissed', label: 'Ignorés' },
          { id: 'all', label: 'Tous' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'chip-active' : 'chip-inactive'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}
      {!loading && reports.length === 0 && <p className="text-ink/60">Aucun signalement.</p>}

      <div className="space-y-2">
        {reports.map(r => (
          <div key={r.id} className="bg-white border border-ink/10 rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">
                  {r.targetType === 'listing' ? '📄 Annonce' : '🏢 Agence'} : {r.targetLabel}
                </div>
                <div className="text-xs text-ink/60 mt-0.5">{REPORT_REASON_LABEL[r.reason] || r.reason}</div>
                {r.message && <p className="text-sm text-ink/85 mt-1">{r.message}</p>}
              </div>
              {r.status === 'pending' ? (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setStatus(r, 'resolved')} disabled={busyId === r.id} className="text-xs font-semibold text-green">Résoudre</button>
                  <button onClick={() => setStatus(r, 'dismissed')} disabled={busyId === r.id} className="text-xs font-semibold text-ink/60">Ignorer</button>
                </div>
              ) : (
                <span className="text-xs font-semibold text-ink/60 shrink-0">{REPORT_STATUS_LABEL[r.status]}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoriesTab() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')

  async function load() {
    setLoading(true)
    setCategories(await fetchCategories())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!newLabel.trim()) return
    const id = newLabel.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    await adminAddCategory(id, newLabel.trim())
    setNewLabel('')
    load()
  }
  async function remove(id) {
    if (!confirm('Supprimer cette catégorie ?')) return
    await adminRemoveCategory(id)
    load()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 max-w-md">
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nouvelle catégorie (ex. : Croisière)" className="input" />
        <button onClick={add} className="btn-primary !px-4 whitespace-nowrap">Ajouter</button>
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}

      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <span key={c.id} className="chip chip-inactive cursor-default flex items-center gap-2">
            {c.label}
            <button onClick={() => remove(c.id)} className="text-red-500">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function MessagesTab() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new')

  async function load() {
    setLoading(true)
    setMessages(await fetchContactMessagesAdmin(filter === 'all' ? undefined : filter))
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function markRead(m) {
    await adminMarkContactMessageRead(m.id)
    load()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[
          { id: 'new', label: 'Nouveaux' },
          { id: 'read', label: 'Lus' },
          { id: 'all', label: 'Tous' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'chip-active' : 'chip-inactive'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}
      {!loading && messages.length === 0 && <p className="text-ink/60">Aucun message.</p>}

      <div className="space-y-2">
        {messages.map(m => (
          <div key={m.id} className="bg-white border border-ink/10 rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">{m.name} <span className="text-ink/55 font-normal">· {m.email}</span></div>
                <p className="text-sm text-ink/85 mt-1">{m.message}</p>
              </div>
              {m.status === 'new'
                ? <button onClick={() => markRead(m)} className="text-xs font-semibold text-green shrink-0">Marquer comme lu</button>
                : <span className="text-xs text-ink/55 shrink-0">Lu</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DestinationsTab() {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')

  async function load() {
    setLoading(true)
    setDestinations(await fetchDestinations())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!newName.trim()) return
    await adminAddDestination(newName.trim())
    setNewName('')
    load()
  }
  async function remove(name) {
    await adminRemoveDestination(name)
    load()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 max-w-md">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouvelle destination (ex. : Zanzibar)" className="input" />
        <button onClick={add} className="btn-primary !px-4 whitespace-nowrap">Ajouter</button>
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}

      <div className="flex flex-wrap gap-2">
        {destinations.map(d => (
          <span key={d} className="chip chip-inactive cursor-default flex items-center gap-2">
            {d}
            <button onClick={() => remove(d)} className="text-red-500">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}
