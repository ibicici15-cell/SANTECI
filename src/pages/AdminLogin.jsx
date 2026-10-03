import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import Logo from '../components/Logo'
import FormAlert from '../components/FormAlert'

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { isAdmin } = await login(email, password)
      if (!isAdmin) {
        await supabase.auth.signOut()
        setError("Ce compte n'a pas les droits administrateur.")
        return
      }
      navigate('/admin')
    } catch {
      setError('E-mail ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Link to="/" className="flex justify-center mb-8">
        <Logo className="h-9" />
      </Link>
      <h1 className="font-display font-bold text-2xl text-ink text-center">Administration</h1>
      <form id="identifiants" onSubmit={handleSubmit} className="space-y-3 mt-6">
        <input required type="email" placeholder="E-mail admin" value={email}
          onChange={(e) => setEmail(e.target.value)} className="input" />
        <input required type="password" placeholder="Mot de passe" value={password}
          onChange={(e) => setPassword(e.target.value)} className="input" />
        {error && <FormAlert>{error}</FormAlert>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
