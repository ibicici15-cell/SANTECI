import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'
import { backTarget } from '../utils/redirect'
import FormAlert from '../components/FormAlert'

export default function AgencyLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = location.state?.notice
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { traveler, agency, isAdmin } = await login(email, password)
      if (traveler) {
        await supabase.auth.signOut()
        setError("Ce compte est un compte voyageur. Utilise l'espace voyageur pour te connecter.")
        return
      }
      // Un compte purement admin (sans profil agence) est redirigé vers
      // l'admin plutôt que vers un tableau de bord qui n'existera jamais.
      navigate(!agency && isAdmin ? '/admin' : backTarget(location, '/agence/tableau-de-bord'))
    } catch {
      setError('E-mail ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Link to="/" className="flex justify-center mb-8"><Logo className="h-9" /></Link>
      <h1 className="font-display font-bold text-2xl text-ink text-center">Connexion agence</h1>
      {notice && (
        <p className="mt-4 bg-orange/10 border border-orange/30 rounded-xl px-3 py-2.5 text-sm text-ink">{notice}</p>
      )}
      <form id="identifiants" onSubmit={handleSubmit} className="space-y-3 mt-6">
        <input required type="email" placeholder="E-mail" value={email}
          onChange={(e) => setEmail(e.target.value)} className="input" />
        <input required type="password" placeholder="Mot de passe" value={password}
          onChange={(e) => setPassword(e.target.value)} className="input" />
        {error && <FormAlert>{error}</FormAlert>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="text-sm text-ink/60 mt-4">
        Pas encore de compte ? <Link to="/agence/inscription" state={location.state} className="text-green font-semibold">Créer un compte agence</Link>
      </p>
    </div>
  )
}
