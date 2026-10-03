import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createAgencyProfile, isPhoneTaken } from '../utils/db'
import { DEPARTURE_CITIES } from '../data/categories'
import Logo from '../components/Logo'
import PhoneInput from '../components/PhoneInput'
import PublishingRules from '../components/PublishingRules'
import { backTarget } from '../utils/redirect'
import FormAlert from '../components/FormAlert'

export default function AgencyRegister() {
  const { register, refreshAgency } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', whatsapp: '', city: '' })
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (form.phone.length <= 4) { setError('Renseigne le téléphone de ton agence.'); return }
    if (!acceptedRules) { setError('Tu dois accepter les règles de publication pour créer un compte agence.'); return }
    setLoading(true)
    try {
      if (await isPhoneTaken(form.phone)) {
        setError('Ce numéro de téléphone est déjà utilisé.')
        return
      }

      const { user, session } = await register(form.email, form.password)
      const profileData = {
        name: form.name, email: form.email, phone: form.phone,
        whatsapp: form.whatsapp, city: form.city,
        accepted_publishing_rules: true,
        publishing_rules_accepted_at: new Date().toISOString(),
      }

      if (session) {
        // Session immédiate (confirmation e-mail désactivée côté Supabase) :
        // on peut créer le profil tout de suite.
        await createAgencyProfile(user.id, profileData)
        await refreshAgency()
        navigate(backTarget(location, '/agence/tableau-de-bord'))
      } else {
        // Pas de session tant que l'e-mail n'est pas confirmé : on garde les
        // infos de côté, elles seront utilisées automatiquement à la
        // prochaine connexion (voir AuthContext.loadAgency).
        localStorage.setItem('pendingAgencyProfile', JSON.stringify(profileData))
        setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi : ton profil agence sera complété automatiquement.")
      }
    } catch (err) {
      setError(traduireErreur(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Link to="/" className="flex justify-center mb-8">
        <Logo className="h-9" />
      </Link>
      <h1 className="font-display font-bold text-2xl text-ink">Créer mon compte agence</h1>
      <p className="text-ink/60 text-sm mt-1">5 annonces gratuites par mois pour commencer.</p>

      {info ? (
        <FormAlert kind="success" className="mt-6 !p-4">
          {info}
          <div className="mt-3">
            <Link to="/agence/connexion" className="font-semibold underline">Aller à la connexion</Link>
          </div>
        </FormAlert>
      ) : (
        <form id="identifiants" onSubmit={handleSubmit} className="space-y-3 mt-6">
          <input required placeholder="Nom de l'agence" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input required type="email" placeholder="E-mail" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          <input required type="password" placeholder="Mot de passe (6 caractères min.)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
          <PhoneInput required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <PhoneInput value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="WhatsApp (optionnel)" />
          <select required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input">
            <option value="">Ville de l'agence</option>
            {DEPARTURE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="bg-stub rounded-lg p-3">
            <PublishingRules compact />
          </div>
          <label className="flex items-start gap-2 text-sm text-ink/80">
            <input type="checkbox" checked={acceptedRules} onChange={(e) => setAcceptedRules(e.target.checked)} className="mt-0.5" />
            J'accepte les règles de publication et m'engage à ne proposer que des offres conformes à celles-ci.
          </label>

          {error && <FormAlert>{error}</FormAlert>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      )}

      {!info && (
        <p className="text-sm text-ink/60 mt-4">
          Déjà inscrite ? <Link to="/agence/connexion" className="text-green font-semibold">Se connecter</Link>
        </p>
      )}
    </div>
  )
}

function traduireErreur(err) {
  const msg = err?.message || ''
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Cet e-mail est déjà utilisé.'
  }
  if (msg.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.'
  }
  if (msg.includes('Unable to validate email') || msg.includes('invalid')) {
    return 'Adresse e-mail invalide.'
  }
  if (msg.includes('row-level security') || msg.includes('policy')) {
    return "La création du profil a été refusée par la base de données. Vérifie que le script supabase/schema.sql a bien été exécuté."
  }
  return msg || "Une erreur est survenue, réessaie."
}
