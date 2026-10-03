import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { updateTravelerProfile, fetchFavorites, fetchTravelerRequests, fetchTravelerReviews } from '../utils/db'
import { DEPARTURE_CITIES } from '../data/categories'
import PhoneInput from '../components/PhoneInput'

export default function TravelerProfile() {
  const { traveler, refreshTraveler, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', city: '' })
  const [stats, setStats] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (traveler) setForm({ name: traveler.name || '', phone: traveler.phone || '', whatsapp: traveler.whatsapp || '', city: traveler.city || '' })
  }, [traveler])

  useEffect(() => {
    if (!traveler) return
    Promise.all([
      fetchFavorites(traveler.id, 'listing'),
      fetchTravelerRequests(traveler.id),
      fetchTravelerReviews(traveler.id),
    ]).then(([favs, requests, reviews]) => {
      setStats({ favorites: favs.length, requests: requests.length, reviews: reviews.length })
    })
  }, [traveler?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateTravelerProfile(traveler.id, form)
      await refreshTraveler()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!traveler) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-ink/60">
        Ton profil se met en place... Si ce message persiste, vérifie que tu as
        confirmé ton adresse e-mail puis reconnecte-toi.
      </div>
    )
  }

  return (
    <div id="mon-profil" className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display font-bold text-2xl text-ink mb-6">Mon profil</h1>

      <div className="bg-white border border-ink/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-ink">Informations</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm font-semibold text-green">Modifier</button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Nom complet" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            <PhoneInput required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <PhoneInput value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="WhatsApp (optionnel)" />
            <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input">
              <option value="">Ta ville</option>
              {DEPARTURE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-outline flex-1">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-ink">{traveler.name}</span>
            <span className="text-ink/45">·</span>
            <span className="text-ink/85">{traveler.phone || 'Téléphone non renseigné'}</span>
            {traveler.whatsapp && <><span className="text-ink/45">·</span><span className="text-ink/85">WhatsApp {traveler.whatsapp}</span></>}
            {traveler.city && <><span className="text-ink/45">·</span><span className="text-ink/85">{traveler.city}</span></>}
          </div>
        )}
      </div>

      <h2 className="font-display font-semibold text-ink mt-6 mb-3">Mon activité</h2>
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={stats?.favorites} label="Favoris" to="/favoris" />
        <StatCard value={stats?.requests} label="Demandes envoyées" to="/mes-demandes" />
        <StatCard value={stats?.reviews} label="Avis laissés" />
      </div>
      <Link to="/mon-casier" className="block mt-3 bg-white border border-ink/10 rounded-xl p-4 text-center hover:border-green/40 transition-colors text-sm font-semibold text-green">
        📄 Mon casier — documents reçus des agences
      </Link>

      <button
        onClick={async () => { await logout(); navigate('/') }}
        className="text-sm border border-ink/20 hover:border-ink px-3 py-1.5 rounded-lg transition-colors mt-8"
      >
        Déconnexion
      </button>
    </div>
  )
}

function StatCard({ value, label, to }) {
  const content = (
    <div className="bg-white border border-ink/10 rounded-xl p-4 text-center hover:border-green/40 transition-colors">
      <div className="font-display font-bold text-2xl text-ink">{value ?? '—'}</div>
      <div className="text-xs text-ink/60 mt-1">{label}</div>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}
