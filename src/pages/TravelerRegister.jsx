import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createTravelerProfile, isPhoneTaken } from '../utils/db'
import { DEPARTURE_CITIES } from '../data/categories'
import Logo from '../components/Logo'
import PhoneInput from '../components/PhoneInput'
import { backTarget } from '../utils/redirect'
import FormAlert from '../components/FormAlert'

export default function TravelerRegister() {
  const { register, refreshTraveler } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', whatsapp: '', city: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (form.phone.length <= 4) { setError('Renseigne ton numéro de téléphone.'); return }
    setLoading(true)
    try {
      if (await isPhoneTaken(form.phone)) {
        setError('Ce numéro de téléphone est déjà utilisé.')
        return
      }

      const { user, session } = await register(form.email, form.password)
      const profileData = { name: form.name, phone: form.phone, whatsapp: form.whatsapp, city: form.city }

      if (session) {
        await createTravelerProfile(user.id, profileData)
        await refreshTraveler()
        navigate(backTarget(location, '/profil'))
      } else {
        localStorage.setItem('pendingTravelerProfile', JSON.stringify({ ...profileData, email: form.email }))
        setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.")
      }
    } catch (err) {
      setError(traduireErreur(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Link to="/" className="flex justify-center mb-8"><Logo className="h-9" /></Link>
      <h1 className="font-display font-bold text-2xl text-ink">Créer mon compte voyageur</h1>
      <p className="text-ink/60 text-sm mt-1">Favoris, avis et suivi de tes demandes.</p>

      {info ? (
        <FormAlert kind="success" className="mt-6 !p-4">
          {info}
          <div className="mt-3"><Link to="/compte/connexion" state={location.state} className="font-semibold underline">Aller à la connexion</Link></div>
        </FormAlert>
      ) : (
        <form id="identifiants" onSubmit={handleSubmit} className="space-y-3 mt-6">
          <input required placeholder="Nom complet" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input required type="email" placeholder="E-mail" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          <input required type="password" placeholder="Mot de passe (6 caractères min.)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
          <PhoneInput required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <PhoneInput value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="WhatsApp (optionnel)" />
          <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input">
            <option value="">Ta ville (optionnel)</option>
            {DEPARTURE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {error && <FormAlert>{error}</FormAlert>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      )}

      {!info && (
        <p className="text-sm text-ink/60 mt-4">
          Déjà inscrit ? <Link to="/compte/connexion" state={location.state} className="text-green font-semibold">Se connecter</Link>
        </p>
      )}
      <p className="text-xs text-ink/55 mt-6 text-center">
        Une agence de voyage ? <Link to="/agence/inscription" className="underline">Créer un compte agence</Link>
      </p>
    </div>
  )
}

function traduireErreur(err) {
  const msg = err?.message || ''
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Cet e-mail est déjà utilisé.'
  if (msg.includes('Password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (msg.includes('Unable to validate email') || msg.includes('invalid')) return 'Adresse e-mail invalide.'
  return msg || 'Une erreur est survenue, réessaie.'
}
