import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Protège les pages de l'espace agence. Exige un profil agence chargé (pas
// seulement une session), sinon un voyageur connecté pourrait accéder au
// tableau de bord agence.
export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const { user, agency, loading } = useAuth()
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-ink/60">Chargement…</div>
  if (!user || !agency) return <Navigate to="/agence/connexion" state={{ from: location }} replace />
  return children
}
