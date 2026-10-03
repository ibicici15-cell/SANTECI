import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'
import { backTarget } from '../utils/redirect'
import FormAlert from '../components/FormAlert'

export default function TravelerLogin() {
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
      const { agency, traveler, isAdmin } = await login(email, password)
      if (agency) {
        await supabase.auth.signOut()
        setError("Ce compte est un compte agence. Utilise l'espace agence pour te connecter.")
        return
      }
      // Un compte purement admin (sans profil voyageur) est redirigé vers
      // l'admin plutôt que vers un profil qui n'existera jamais.
      navigate(!traveler && isAdmin ? '/admin' : backTarget(location, '/profil'))
    } catch {
      setError('E-mail ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Link to="/" className="flex justify-center mb-8"><Logo className="h-9" /></Link>
      <h1 className="font-display font-bold text-2xl text-ink text-center">Connexion voyageur</h1>
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
        Pas encore de compte ? <Link to="/compte/inscription" state={location.state} className="text-green font-semibold">Créer un compte voyageur</Link>
      </p>
    </div>
  )
}
